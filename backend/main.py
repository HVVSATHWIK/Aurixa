from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import suppress
from copy import deepcopy
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.orchestrator import (
    ArticleIntelligenceEngine,
    bootstrap_state,
    build_pipeline_completion,
    now_hms,
    now_iso,
)
from backend.schema import AnalyzeRequest, AudioJob, AurixaState, GenerateAudioRequest

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
MAX_AUDIT_LOGS = int(os.getenv("AURIXA_MAX_AUDIT_LOGS", "12"))
PIPELINE_STEP_DELAY = float(os.getenv("AURIXA_PIPELINE_STEP_DELAY", "0.35"))
AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS = int(os.getenv("AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS", "1200"))
AURIXA_NOTEBOOKLM_POLL_SECONDS = int(os.getenv("AURIXA_NOTEBOOKLM_POLL_SECONDS", "15"))
AURIXA_NOTEBOOKLM_INSTRUCTIONS = os.getenv(
    "AURIXA_NOTEBOOKLM_INSTRUCTIONS",
    "Deliver a professional, objective newsroom audio briefing with concise transitions.",
).strip()
AURIXA_AUDIO_OUTPUT_DIR = Path(os.getenv("AURIXA_AUDIO_OUTPUT_DIR", "backend/generated_audio"))
AURIXA_AUDIO_BASE_URL = os.getenv("AURIXA_AUDIO_BASE_URL", "").strip()
AURIXA_AUDIO_FALLBACK_URL = os.getenv("AURIXA_AUDIO_FALLBACK_URL", "").strip()
AURIXA_AUDIO_SIMULATION = os.getenv("AURIXA_AUDIO_SIMULATION", "false").strip().lower() == "true"

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,https://aurixa-46cc7.web.app",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="AURIXA Backend Adapter", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_state_lock = asyncio.Lock()
_state: dict[str, Any] = bootstrap_state()
_clients: set[WebSocket] = set()
_engine = ArticleIntelligenceEngine()
_analysis_task: asyncio.Task[None] | None = None
_audio_jobs: dict[str, dict[str, Any]] = {}
_audio_tasks: dict[str, asyncio.Task[None]] = {}


def _push_audit(state: dict[str, Any], *, agent: str, message: str) -> None:
    state["audit_trail"] = [
        {
            "timestamp": now_hms(),
            "agent": agent,
            "message": message,
        },
        *state.get("audit_trail", []),
    ][:MAX_AUDIT_LOGS]


def _set_pipeline(state: dict[str, Any], active_node: str, status: str) -> None:
    state["pipeline"]["active_node"] = active_node
    state["pipeline"]["completed_nodes"] = build_pipeline_completion(active_node)
    state["telemetry"]["status"] = status


def _source_excerpt(raw_text: str, max_chars: int = 220) -> str:
    if len(raw_text) <= max_chars:
        return raw_text
    return f"{raw_text[:max_chars].rstrip()}..."


def _violations_from_risk(risk_score: float) -> list[dict[str, str]]:
    if risk_score >= 55.0:
        return [
            {
                "id": "v_live_risk",
                "type": "EDITORIAL RISK SPIKE",
                "severity": "CRITICAL",
                "description": "High ambiguity or compliance risk detected in extracted intelligence.",
                "resolution_status": "REQUIRES HUMAN REVIEW",
            }
        ]

    if risk_score >= 30.0:
        return [
            {
                "id": "v_live_monitor",
                "type": "FACT-CHECK ADVISORY",
                "severity": "MEDIUM",
                "description": "Moderate risk. Recommend additional source validation before publish.",
                "resolution_status": "MONITORING",
            }
        ]

    return []


async def mutate_state(mutator) -> dict[str, Any]:
    global _state

    async with _state_lock:
        mutator(_state)
        validated = AurixaState.model_validate(_state).model_dump()
        _state = validated
        snapshot = deepcopy(validated)

    await broadcast_state(snapshot)
    return snapshot


async def broadcast_state(snapshot: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for client in list(_clients):
        try:
            await client.send_json({"state": snapshot})
        except Exception:
            dead.append(client)

    for client in dead:
        with suppress(Exception):
            await client.close()
        _clients.discard(client)


async def set_stage(
    *,
    active_node: str,
    status: str,
    agent: str,
    message: str,
    system_status: str | None = None,
) -> None:
    def mutator(state: dict[str, Any]) -> None:
        _set_pipeline(state, active_node, status)
        if system_status:
            state["system_status"] = system_status
        _push_audit(state, agent=agent, message=message)

    await mutate_state(mutator)


async def run_analysis_pipeline(payload: AnalyzeRequest) -> None:
    global _analysis_task

    try:
        await set_stage(
            active_node="INGESTION",
            status="Ingestion",
            agent="AGENT:INGESTION",
            message="Accepted article analysis request.",
            system_status="LIVE ANALYSIS RUNNING",
        )
        await asyncio.sleep(PIPELINE_STEP_DELAY)

        source_text, source_url = await _engine.resolve_article_source(
            payload.article_url,
            payload.article_text,
        )

        def ingestion_mutation(state: dict[str, Any]) -> None:
            state["iteration"] = int(state.get("iteration", 0)) + 1
            state["telemetry"]["raw_input"] = _source_excerpt(source_text)
            state["telemetry"]["draft_version"] = f"v{state['iteration']}.0"
            state["intelligence"]["source_url"] = source_url
            _push_audit(
                state,
                agent="AGENT:INGESTION",
                message="Source ingestion complete. Dispatching to extraction agent.",
            )

        await mutate_state(ingestion_mutation)
        await asyncio.sleep(PIPELINE_STEP_DELAY)

        await set_stage(
            active_node="DRAFTING",
            status="Drafting",
            agent="AGENT:DRAFTING",
            message="Gemini extraction started for briefing, entities, and Hindi summary.",
        )
        await asyncio.sleep(PIPELINE_STEP_DELAY)

        analysis = await _engine.extract(source_text, source_url)

        await set_stage(
            active_node="COMPLIANCE",
            status="Validation",
            agent="AGENT:COMPLIANCE",
            message="Scoring confidence and editorial risk for extracted intelligence.",
        )
        await asyncio.sleep(PIPELINE_STEP_DELAY)

        def compliance_mutation(state: dict[str, Any]) -> None:
            confidence = float(analysis["confidence_score"])
            risk = float(analysis["risk_score"])

            state["telemetry"]["confidence_score"] = confidence
            state["telemetry"]["risk_score"] = risk
            state["intelligence"]["briefing"] = analysis["briefing"]
            state["intelligence"]["entities"] = analysis["entities"]
            state["intelligence"]["sentiment"] = analysis["sentiment"]
            state["intelligence"]["hindi_summary"] = analysis["hindi_summary"]
            state["intelligence"]["telugu_summary"] = analysis["telugu_summary"]
            state["intelligence"]["generated_at"] = analysis["generated_at"]
            state["intelligence"]["ruleset"] = "Gemini newsroom extraction protocol v2"
            state["intelligence"]["violations"] = _violations_from_risk(risk)
            _push_audit(
                state,
                agent="AGENT:COMPLIANCE",
                message="Structured intelligence package validated and ready for approval.",
            )

        await mutate_state(compliance_mutation)
        await asyncio.sleep(PIPELINE_STEP_DELAY)

        await set_stage(
            active_node="APPROVAL",
            status="Approved",
            agent="AGENT:APPROVAL",
            message="Analysis pipeline approved. Frontend can consume live intelligence output.",
            system_status="LIVE INTELLIGENCE READY",
        )
    except Exception as exc:
        message = str(exc).strip() or "Unknown analysis error"

        def failure_mutation(state: dict[str, Any]) -> None:
            state["retry_count"] = int(state.get("retry_count", 0)) + 1
            state["system_status"] = "ANALYSIS FAILED"
            state["telemetry"]["status"] = "Error"
            _push_audit(
                state,
                agent="SYSTEM",
                message=f"Analysis failed: {message}",
            )

        await mutate_state(failure_mutation)
    finally:
        _analysis_task = None


async def update_audio_job(
    job_id: str,
    *,
    status: str | None = None,
    message: str | None = None,
    audio_url: str | None = None,
    started_at: str | None = None,
    completed_at: str | None = None,
    audit_message: str | None = None,
) -> dict[str, Any]:
    current = _audio_jobs.get(job_id)
    if not current:
        raise KeyError(f"Unknown audio job: {job_id}")

    if status is not None:
        current["status"] = status
    if message is not None:
        current["message"] = message
    if audio_url is not None:
        current["audio_url"] = audio_url
    if started_at is not None:
        current["started_at"] = started_at
    if completed_at is not None:
        current["completed_at"] = completed_at

    validated_job = AudioJob.model_validate(current).model_dump()
    _audio_jobs[job_id] = validated_job

    def mutator(state: dict[str, Any]) -> None:
        state["studio"]["audio_status"] = validated_job["status"]
        state["studio"]["audio_job_id"] = validated_job["job_id"]
        state["studio"]["audio_message"] = validated_job["message"]
        state["studio"]["audio_url"] = validated_job["audio_url"]
        if audit_message:
            _push_audit(state, agent="AGENT:VIDEO_STUDIO", message=audit_message)

    await mutate_state(mutator)
    return validated_job


def _resolve_audio_url(path_or_url: str) -> str:
    candidate = (path_or_url or "").strip()
    if not candidate:
        return ""

    if candidate.startswith(("http://", "https://", "simulated://")):
        return candidate

    resolved_path = Path(candidate)
    if AURIXA_AUDIO_BASE_URL:
        return f"{AURIXA_AUDIO_BASE_URL.rstrip('/')}/{resolved_path.name}"

    return str(resolved_path)


def _is_rpc_error(exc: Exception) -> bool:
    # notebooklm-py exposes RPCError; checking by class name avoids hard import dependency at module load.
    return exc.__class__.__name__ == "RPCError"


def _should_use_audio_fallback(exc: Exception) -> bool:
    if not AURIXA_AUDIO_FALLBACK_URL:
        return False

    if _is_rpc_error(exc) or isinstance(exc, TimeoutError):
        return True

    message = str(exc).strip().lower()
    fallback_markers = (
        "notebooklm",
        "storage file not found",
        "rate-limit",
        "rate limit",
        "unavailable",
        "timed out",
        "timeout",
        "rpc",
    )
    return any(marker in message for marker in fallback_markers)


async def generate_audio_with_notebooklm(job_id: str, script_text: str) -> str:
    try:
        from notebooklm import NotebookLMClient  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "notebooklm-py is not available. Install it and run notebooklm login first."
        ) from exc

    title = f"Aurixa Studio {job_id}"

    async with await NotebookLMClient.from_storage() as client:
        notebook = await client.notebooks.create(title=title)
        await client.sources.add_text(
            notebook_id=notebook.id,
            title=f"{title} Source",
            content=script_text,
        )

        status = await client.artifacts.generate_audio(
            notebook_id=notebook.id,
            instructions=AURIXA_NOTEBOOKLM_INSTRUCTIONS,
        )

        completion = await client.artifacts.wait_for_completion(
            notebook_id=notebook.id,
            task_id=status.task_id,
            timeout=AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS,
            poll_interval=AURIXA_NOTEBOOKLM_POLL_SECONDS,
        )

        if not getattr(completion, "is_complete", False):
            raise TimeoutError("NotebookLM audio generation timed out before completion.")

        AURIXA_AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_file = AURIXA_AUDIO_OUTPUT_DIR / f"{job_id}.mp3"
        downloaded = await client.artifacts.download_audio(
            notebook_id=notebook.id,
            filename=str(output_file),
        )

    return str(downloaded)


async def run_audio_job(job_id: str, script_text: str) -> None:
    try:
        await update_audio_job(
            job_id,
            status="running",
            message="Generating broadcast audio via NotebookLM...",
            audit_message="NotebookLM audio generation started.",
        )

        if AURIXA_AUDIO_SIMULATION:
            await asyncio.sleep(10)
            simulated_url = (
                f"{AURIXA_AUDIO_BASE_URL.rstrip('/')}/{job_id}.mp3"
                if AURIXA_AUDIO_BASE_URL
                else f"simulated://{job_id}.mp3"
            )
            await update_audio_job(
                job_id,
                status="completed",
                message="Simulated broadcast audio ready.",
                audio_url=simulated_url,
                completed_at=now_iso(),
                audit_message="Simulated audio package generated.",
            )
            return

        generated_path = await generate_audio_with_notebooklm(job_id, script_text)
        resolved_url = _resolve_audio_url(generated_path)

        if not resolved_url:
            await update_audio_job(
                job_id,
                status="failed",
                message="NotebookLM completed but no output audio artifact was resolved.",
                completed_at=now_iso(),
                audit_message="Audio generation failed: output not detected.",
            )
            return

        await update_audio_job(
            job_id,
            status="completed",
            message="Broadcast audio generated successfully.",
            audio_url=resolved_url,
            completed_at=now_iso(),
            audit_message="Audio package generated and ready for newsroom playback.",
        )
    except Exception as exc:
        if _should_use_audio_fallback(exc):
            await update_audio_job(
                job_id,
                status="completed",
                message=(
                    "NotebookLM is currently unavailable or rate-limited. "
                    "Serving fallback broadcast audio for demo continuity."
                ),
                audio_url=AURIXA_AUDIO_FALLBACK_URL,
                completed_at=now_iso(),
                audit_message="NotebookLM RPC error detected. Fallback audio served.",
            )
            return

        await update_audio_job(
            job_id,
            status="failed",
            message=f"Audio generation failed: {exc}",
            completed_at=now_iso(),
            audit_message="Audio generation crashed unexpectedly.",
        )
    finally:
        _audio_tasks.pop(job_id, None)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _analysis_task

    if _analysis_task and not _analysis_task.done():
        _analysis_task.cancel()
        with suppress(asyncio.CancelledError):
            await _analysis_task
        _analysis_task = None

    for task in list(_audio_tasks.values()):
        task.cancel()

    for task in list(_audio_tasks.values()):
        with suppress(asyncio.CancelledError):
            await task


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "port": PORT,
        "analysis_running": bool(_analysis_task and not _analysis_task.done()),
        "pending_audio_jobs": len([j for j in _audio_jobs.values() if j["status"] in {"queued", "running"}]),
    }


@app.get("/api/state")
async def get_state() -> dict[str, Any]:
    async with _state_lock:
        return {"state": _state}


@app.post("/api/analyze")
async def analyze_article(payload: AnalyzeRequest) -> dict[str, str]:
    global _analysis_task

    if not (payload.article_url or payload.article_text):
        raise HTTPException(status_code=400, detail="Provide article_url or article_text.")

    if _analysis_task and not _analysis_task.done():
        raise HTTPException(status_code=409, detail="Analysis is already running. Wait for completion.")

    _analysis_task = asyncio.create_task(run_analysis_pipeline(payload))
    return {
        "status": "accepted",
        "message": "Live analysis pipeline started.",
    }


@app.post("/api/generate-audio", status_code=202)
async def generate_audio(payload: GenerateAudioRequest) -> dict[str, Any]:
    script_text = (payload.script_text or "").strip()

    if not script_text:
        async with _state_lock:
            briefing = _state.get("intelligence", {}).get("briefing", [])
            hindi_summary = _state.get("intelligence", {}).get("hindi_summary", "")
            telugu_summary = _state.get("intelligence", {}).get("telugu_summary", "")
        script_text = "\n".join([*briefing, "", hindi_summary, "", telugu_summary]).strip()

    if not script_text:
        raise HTTPException(status_code=400, detail="No script text available for audio generation.")

    job_id = uuid.uuid4().hex[:12]
    _audio_jobs[job_id] = AudioJob(
        job_id=job_id,
        status="queued",
        message="NotebookLM job queued.",
        started_at=now_iso(),
    ).model_dump()

    await update_audio_job(
        job_id,
        status="queued",
        message="NotebookLM job queued.",
        started_at=now_iso(),
        audit_message="Audio generation request queued.",
    )

    task = asyncio.create_task(run_audio_job(job_id, script_text))
    _audio_tasks[job_id] = task

    return {
        "status": "accepted",
        "job_id": job_id,
        "job": _audio_jobs[job_id],
    }


@app.get("/api/audio-jobs/{job_id}")
async def get_audio_job(job_id: str) -> dict[str, Any]:
    job = _audio_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audio job not found.")
    return {"job": job}


@app.websocket("/ws/state")
async def websocket_state(socket: WebSocket) -> None:
    await socket.accept()
    _clients.add(socket)

    async with _state_lock:
        await socket.send_json({"state": _state})

    try:
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        _clients.discard(socket)
    except Exception:
        _clients.discard(socket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
