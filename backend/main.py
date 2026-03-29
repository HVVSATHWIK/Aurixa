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
from fastapi.staticfiles import StaticFiles

from backend.orchestrator import (
    ArticleIntelligenceEngine,
    bootstrap_state,
    build_pipeline_completion,
    now_hms,
    now_iso,
)
from backend.schema import (
    AnalyzeRequest,
    AudioJob,
    AurixaState,
    GenerateAudioRequest,
    GenerateVideoBriefRequest,
    NavigatorQuestionRequest,
    VideoJob,
)

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
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
AURIXA_AUDIO_BASE_URL = os.getenv(
    "AURIXA_AUDIO_BASE_URL",
    f"http://127.0.0.1:{PORT}/generated-audio",
).strip()
AURIXA_AUDIO_FALLBACK_URL = os.getenv("AURIXA_AUDIO_FALLBACK_URL", "").strip()
AURIXA_AUDIO_SIMULATION = os.getenv("AURIXA_AUDIO_SIMULATION", "false").strip().lower() == "true"
AURIXA_AUDIO_LOCAL_TTS_ENABLED = (
    os.getenv("AURIXA_AUDIO_LOCAL_TTS_ENABLED", "true").strip().lower() == "true"
)
AURIXA_EDGE_TTS_VOICE = os.getenv("AURIXA_EDGE_TTS_VOICE", "en-US-AriaNeural").strip() or "en-US-AriaNeural"
AURIXA_GTTS_LANG = os.getenv("AURIXA_GTTS_LANG", "en").strip() or "en"
AURIXA_VIDEO_OUTPUT_DIR = Path(os.getenv("AURIXA_VIDEO_OUTPUT_DIR", "backend/generated_video"))
AURIXA_VIDEO_BASE_URL = os.getenv(
    "AURIXA_VIDEO_BASE_URL",
    f"http://127.0.0.1:{PORT}/generated-video",
).strip()
AURIXA_VIDEO_RENDER_FPS = int(os.getenv("AURIXA_VIDEO_RENDER_FPS", "8"))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://aurixa-46cc7.web.app",
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
AURIXA_AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
AURIXA_VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/generated-audio", StaticFiles(directory=str(AURIXA_AUDIO_OUTPUT_DIR)), name="generated-audio")
app.mount("/generated-video", StaticFiles(directory=str(AURIXA_VIDEO_OUTPUT_DIR)), name="generated-video")

_state_lock = asyncio.Lock()
_state: dict[str, Any] = bootstrap_state()
_clients: set[WebSocket] = set()
_engine = ArticleIntelligenceEngine()
_analysis_task: asyncio.Task[None] | None = None
_audio_jobs: dict[str, dict[str, Any]] = {}
_audio_tasks: dict[str, asyncio.Task[None]] = {}
_video_jobs: dict[str, dict[str, Any]] = {}
_video_tasks: dict[str, asyncio.Task[None]] = {}


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
            message=(
                "Gemini extraction started for briefing, entities, and Hindi summary."
                if _engine.runtime_status().get("gemini_configured")
                else "Gemini token not detected. Running heuristic extraction fallback."
            ),
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
            state["intelligence"]["ruleset"] = str(
                analysis.get("ruleset", "Heuristic newsroom fallback protocol v1")
            )
            state["intelligence"]["provider"] = str(analysis.get("provider", "HEURISTIC"))
            state["intelligence"]["provider_message"] = str(
                analysis.get("provider_message", "Heuristic extraction fallback is active.")
            )
            state["intelligence"]["violations"] = _violations_from_risk(risk)
            _push_audit(
                state,
                agent="AGENT:COMPLIANCE",
                message="Structured intelligence package validated and ready for approval.",
            )
            if state["intelligence"]["provider"] != "GEMINI":
                _push_audit(
                    state,
                    agent="AGENT:DRAFTING",
                    message=state["intelligence"]["provider_message"],
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


async def update_video_job(
    job_id: str,
    *,
    status: str | None = None,
    message: str | None = None,
    video_url: str | None = None,
    started_at: str | None = None,
    completed_at: str | None = None,
    audit_message: str | None = None,
) -> dict[str, Any]:
    current = _video_jobs.get(job_id)
    if not current:
        raise KeyError(f"Unknown video job: {job_id}")

    if status is not None:
        current["status"] = status
    if message is not None:
        current["message"] = message
    if video_url is not None:
        current["video_url"] = video_url
    if started_at is not None:
        current["started_at"] = started_at
    if completed_at is not None:
        current["completed_at"] = completed_at

    validated_job = VideoJob.model_validate(current).model_dump()
    _video_jobs[job_id] = validated_job

    def mutator(state: dict[str, Any]) -> None:
        state["studio"]["video_status"] = validated_job["status"]
        state["studio"]["video_job_id"] = validated_job["job_id"]
        state["studio"]["video_message"] = validated_job["message"]
        state["studio"]["video_url"] = validated_job["video_url"]
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


def _build_relevant_audio_script_from_state(state_snapshot: dict[str, Any]) -> str:
    intelligence = state_snapshot.get("intelligence", {}) if isinstance(state_snapshot, dict) else {}
    telemetry = state_snapshot.get("telemetry", {}) if isinstance(state_snapshot, dict) else {}

    briefing = intelligence.get("briefing", []) if isinstance(intelligence.get("briefing", []), list) else []
    briefing_lines = [str(item).strip() for item in briefing if str(item).strip()][:3]

    sentiment = str(intelligence.get("sentiment", "NEUTRAL")).strip().upper() or "NEUTRAL"
    confidence = telemetry.get("confidence_score")
    risk = telemetry.get("risk_score")
    source_url = str(intelligence.get("source_url", "")).strip()

    confidence_line = f"Current confidence score is {confidence} percent." if confidence is not None else ""
    risk_line = f"Current risk score is {risk} percent." if risk is not None else ""
    source_line = f"Source reference: {source_url}." if source_url else ""

    script_parts = [
        "AURIXA newsroom briefing.",
        *briefing_lines,
        f"Overall sentiment is {sentiment}.",
        confidence_line,
        risk_line,
        source_line,
    ]

    return " ".join(part for part in script_parts if part).strip()


def _sanitize_tts_script(script_text: str, *, max_chars: int = 2800) -> str:
    text = " ".join(line.strip() for line in str(script_text or "").splitlines() if line.strip())
    text = " ".join(text.split())
    if len(text) > max_chars:
        text = text[:max_chars].rstrip()
    return text


def _generate_local_tts_sync(script_text: str, output_file: Path) -> str:
    try:
        import pyttsx3  # type: ignore
    except Exception as exc:
        raise RuntimeError("pyttsx3 is not installed for local fallback TTS.") from exc

    output_file.parent.mkdir(parents=True, exist_ok=True)
    engine = pyttsx3.init()

    try:
        try:
            current_rate = int(engine.getProperty("rate"))
            engine.setProperty("rate", max(140, min(220, int(current_rate * 0.92))))
        except Exception:
            pass

        engine.save_to_file(script_text, str(output_file))
        engine.runAndWait()
    finally:
        with suppress(Exception):
            engine.stop()

    if not output_file.exists() or output_file.stat().st_size == 0:
        raise RuntimeError("Local TTS did not produce an audio file.")

    return str(output_file)


async def _generate_edge_tts_audio(script_text: str, output_file: Path) -> str:
    try:
        import edge_tts  # type: ignore
    except Exception as exc:
        raise RuntimeError("edge-tts is not installed for local fallback TTS.") from exc

    output_file.parent.mkdir(parents=True, exist_ok=True)
    communicator = edge_tts.Communicate(script_text, voice=AURIXA_EDGE_TTS_VOICE)
    await communicator.save(str(output_file))

    if not output_file.exists() or output_file.stat().st_size == 0:
        raise RuntimeError("edge-tts did not produce an audio file.")

    return str(output_file)


async def _generate_gtts_audio(script_text: str, output_file: Path) -> str:
    try:
        from gtts import gTTS  # type: ignore
    except Exception as exc:
        raise RuntimeError("gTTS is not installed for local fallback TTS.") from exc

    output_file.parent.mkdir(parents=True, exist_ok=True)

    def _render() -> str:
        tts = gTTS(text=script_text, lang=AURIXA_GTTS_LANG, slow=False)
        tts.save(str(output_file))
        return str(output_file)

    rendered = await asyncio.to_thread(_render)

    if not output_file.exists() or output_file.stat().st_size == 0:
        raise RuntimeError("gTTS did not produce an audio file.")

    return rendered


async def generate_audio_with_local_tts(job_id: str, script_text: str) -> str:
    sanitized_script = _sanitize_tts_script(script_text)
    if len(sanitized_script) < 24:
        raise RuntimeError("Local TTS script is too short.")

    edge_output = AURIXA_AUDIO_OUTPUT_DIR / f"{job_id}.mp3"
    try:
        return await _generate_edge_tts_audio(sanitized_script, edge_output)
    except Exception as edge_exc:
        gtts_output = AURIXA_AUDIO_OUTPUT_DIR / f"{job_id}.mp3"
        try:
            return await _generate_gtts_audio(sanitized_script, gtts_output)
        except Exception as gtts_exc:
            pyttsx_output = AURIXA_AUDIO_OUTPUT_DIR / f"{job_id}.wav"
            try:
                return await asyncio.to_thread(_generate_local_tts_sync, sanitized_script, pyttsx_output)
            except Exception as pyttsx_exc:
                raise RuntimeError(
                    f"edge-tts failed ({edge_exc}); gTTS failed ({gtts_exc}); pyttsx3 failed ({pyttsx_exc})"
                ) from pyttsx_exc


def _resolve_video_url(path_or_url: str) -> str:
    candidate = (path_or_url or "").strip()
    if not candidate:
        return ""

    if candidate.startswith(("http://", "https://")):
        return candidate

    resolved_path = Path(candidate)
    if AURIXA_VIDEO_BASE_URL:
        return f"{AURIXA_VIDEO_BASE_URL.rstrip('/')}/{resolved_path.name}"

    return f"/generated-video/{resolved_path.name}"


def _is_rpc_error(exc: Exception) -> bool:
    # notebooklm-py exposes RPCError; checking by class name avoids hard import dependency at module load.
    return exc.__class__.__name__ == "RPCError"


def _should_use_audio_fallback(exc: Exception) -> bool:
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
            if AURIXA_AUDIO_LOCAL_TTS_ENABLED:
                try:
                    local_audio_path = await generate_audio_with_local_tts(job_id, script_text)
                    local_audio_url = _resolve_audio_url(local_audio_path)
                    await update_audio_job(
                        job_id,
                        status="completed",
                        message=(
                            "NotebookLM is unavailable. Generated local TTS audio from the latest article briefing."
                        ),
                        audio_url=local_audio_url,
                        completed_at=now_iso(),
                        audit_message="NotebookLM unavailable. Local TTS fallback audio generated.",
                    )
                    return
                except Exception as local_tts_exc:
                    if AURIXA_AUDIO_FALLBACK_URL:
                        await update_audio_job(
                            job_id,
                            status="completed",
                            message=(
                                "NotebookLM is unavailable and local TTS failed "
                                f"({local_tts_exc}). Serving fallback demo audio."
                            ),
                            audio_url=AURIXA_AUDIO_FALLBACK_URL,
                            completed_at=now_iso(),
                            audit_message="NotebookLM unavailable and local TTS failed. Fallback audio served.",
                        )
                        return

                    await update_audio_job(
                        job_id,
                        status="failed",
                        message=(
                            "NotebookLM is unavailable and local TTS fallback failed. "
                            "Retry once services are back online."
                        ),
                        completed_at=now_iso(),
                        audit_message="Audio generation failed in fallback path.",
                    )
                    return

            if not AURIXA_AUDIO_FALLBACK_URL:
                await update_audio_job(
                    job_id,
                    status="failed",
                    message="NotebookLM is unavailable and no fallback audio URL is configured.",
                    completed_at=now_iso(),
                    audit_message="NotebookLM unavailable with no configured fallback.",
                )
                return

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


async def run_video_job(job_id: str, video_payload: dict[str, Any]) -> None:
    try:
        await update_video_job(
            job_id,
            status="running",
            message="Rendering newsroom MP4 from generated storyboard...",
            audit_message="Video rendering started.",
        )

        output_file = AURIXA_VIDEO_OUTPUT_DIR / f"{job_id}.mp4"
        rendered_path = _engine.render_video_from_brief(
            video_payload=video_payload,
            output_path=str(output_file),
            fps=AURIXA_VIDEO_RENDER_FPS,
            width=1280,
            height=720,
        )

        resolved_url = _resolve_video_url(rendered_path)
        if not resolved_url:
            await update_video_job(
                job_id,
                status="failed",
                message="Video renderer completed but no output URL was resolved.",
                completed_at=now_iso(),
                audit_message="Video render failed: output path resolution error.",
            )
            return

        await update_video_job(
            job_id,
            status="completed",
            message="Video render complete. MP4 is ready for playback.",
            video_url=resolved_url,
            completed_at=now_iso(),
            audit_message="Video render completed successfully.",
        )
    except Exception as exc:
        await update_video_job(
            job_id,
            status="failed",
            message=f"Video rendering failed: {exc}",
            completed_at=now_iso(),
            audit_message="Video rendering failed unexpectedly.",
        )
    finally:
        _video_tasks.pop(job_id, None)


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

    for task in list(_video_tasks.values()):
        task.cancel()

    for task in list(_audio_tasks.values()):
        with suppress(asyncio.CancelledError):
            await task

    for task in list(_video_tasks.values()):
        with suppress(asyncio.CancelledError):
            await task


@app.get("/health")
async def health() -> dict[str, Any]:
    engine_status = _engine.runtime_status()
    return {
        "status": "ok",
        "port": PORT,
        "analysis_running": bool(_analysis_task and not _analysis_task.done()),
        "pending_audio_jobs": len([j for j in _audio_jobs.values() if j["status"] in {"queued", "running"}]),
        "pending_video_jobs": len([j for j in _video_jobs.values() if j["status"] in {"queued", "running"}]),
        "gemini_configured": engine_status.get("gemini_configured", False),
        "gemini_model": engine_status.get("gemini_model", ""),
        "gemini_model_candidates": engine_status.get("gemini_model_candidates", []),
        "extraction_provider": engine_status.get("provider", "PENDING"),
        "extraction_message": engine_status.get("provider_message", ""),
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
            snapshot = deepcopy(_state)
        script_text = _build_relevant_audio_script_from_state(snapshot)

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


@app.post("/api/generate-video-brief")
async def generate_video_brief(payload: GenerateVideoBriefRequest) -> dict[str, Any]:
    async with _state_lock:
        intelligence_snapshot = deepcopy(_state.get("intelligence", {}))
        telemetry_snapshot = deepcopy(_state.get("telemetry", {}))

    briefing = intelligence_snapshot.get("briefing", [])
    raw_input = str(telemetry_snapshot.get("raw_input", "")).strip()
    if (not isinstance(briefing, list) or not briefing) and len(raw_input) < 40:
        raise HTTPException(
            status_code=400,
            detail="Run live analysis first before generating a video brief.",
        )

    intelligence_snapshot["risk_score"] = telemetry_snapshot.get("risk_score")
    intelligence_snapshot["confidence_score"] = telemetry_snapshot.get("confidence_score")

    video_payload = await _engine.generate_video_brief(
        intelligence=intelligence_snapshot,
        raw_input=raw_input,
        source_url=intelligence_snapshot.get("source_url"),
        duration_seconds=payload.duration_seconds,
        focus_topic=payload.focus_topic or "",
        include_web_search=payload.include_web_search,
        max_sources=payload.max_sources,
    )

    provider = str(video_payload.get("provider", "HEURISTIC"))
    source_count = len(video_payload.get("sources", []) or [])
    provider_message = str(video_payload.get("provider_message", "")).strip()
    video_job_id: str | None = None

    if payload.render_video:
        video_job_id = uuid.uuid4().hex[:12]
        _video_jobs[video_job_id] = VideoJob(
            job_id=video_job_id,
            status="queued",
            message="Video render request queued.",
            started_at=now_iso(),
        ).model_dump()

        await update_video_job(
            video_job_id,
            status="queued",
            message="Video render request queued.",
            started_at=now_iso(),
            audit_message="Video render request queued.",
        )

        task = asyncio.create_task(run_video_job(video_job_id, deepcopy(video_payload)))
        _video_tasks[video_job_id] = task

        video_payload["video_status"] = "queued"
        video_payload["video_job_id"] = video_job_id
        video_payload["video_url"] = None
    else:
        video_payload["video_status"] = "idle"
        video_payload["video_job_id"] = None
        video_payload["video_url"] = None

    def mutator(state: dict[str, Any]) -> None:
        _push_audit(
            state,
            agent="AGENT:VIDEO_STUDIO",
            message=(
                f"Video brief generated via {provider} with {source_count} web sources."
                if source_count
                else f"Video brief generated via {provider}."
            ),
        )
        if provider_message:
            _push_audit(
                state,
                agent="AGENT:VIDEO_STUDIO",
                message=provider_message,
            )
        if video_job_id:
            _push_audit(
                state,
                agent="AGENT:VIDEO_STUDIO",
                message=f"MP4 render queued with job id {video_job_id}.",
            )

    await mutate_state(mutator)
    return video_payload


@app.get("/api/video-jobs/{job_id}")
async def get_video_job(job_id: str) -> dict[str, Any]:
    job = _video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found.")
    return {"job": job}


@app.post("/api/navigator-question")
async def navigator_question(payload: NavigatorQuestionRequest) -> dict[str, Any]:
    question = (payload.question or "").strip()
    if len(question) < 3:
        raise HTTPException(status_code=400, detail="Question must be at least 3 characters.")

    async with _state_lock:
        intelligence_snapshot = deepcopy(_state.get("intelligence", {}))
        telemetry_snapshot = deepcopy(_state.get("telemetry", {}))

    intelligence_snapshot["risk_score"] = telemetry_snapshot.get("risk_score")
    intelligence_snapshot["confidence_score"] = telemetry_snapshot.get("confidence_score")

    answer_payload = await _engine.answer_question(
        question=question,
        intelligence=intelligence_snapshot,
        raw_input=str(telemetry_snapshot.get("raw_input", "")),
        extra_context=(payload.context or ""),
    )

    short_question = question if len(question) <= 110 else f"{question[:107]}..."

    def mutator(state: dict[str, Any]) -> None:
        _push_audit(
            state,
            agent="AGENT:NAVIGATOR",
            message=f"Answered follow-up question: {short_question}",
        )

    await mutate_state(mutator)

    return {
        "question": question,
        **answer_payload,
    }


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
