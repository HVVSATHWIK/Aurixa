from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import httpx
from bs4 import BeautifulSoup

from backend.schema import AurixaState

PIPELINE_ORDER = ["INGESTION", "DRAFTING", "COMPLIANCE", "EDITOR", "APPROVAL"]
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")


def now_hms() -> str:
    return datetime.now().strftime("%H:%M:%S")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_pipeline_completion(active_node: str) -> list[str]:
    if active_node not in PIPELINE_ORDER:
        return []

    active_index = PIPELINE_ORDER.index(active_node)
    return PIPELINE_ORDER[:active_index]


def bootstrap_state() -> Dict[str, Any]:
    state = AurixaState(
        task_id="REQ-8829-ET",
        system_status="READY FOR LIVE ARTICLE ANALYSIS",
        iteration=0,
        retry_count=0,
        telemetry={
            "raw_input": "Awaiting Economic Times article URL or article text.",
            "draft_version": "v0.0",
            "status": "Idle",
            "confidence_score": 0.0,
            "risk_score": 0.0,
        },
        pipeline={
            "active_node": "INGESTION",
            "completed_nodes": [],
        },
        intelligence={
            "violations": [],
            "ruleset": "ET newsroom extraction protocol v1",
            "briefing": [
                "Submit a source URL or raw article text to begin analysis.",
                "Gemini extracts briefing bullets and key entities.",
                "Hindi and Telugu summaries appear after drafting completes.",
            ],
            "entities": [],
            "sentiment": "NEUTRAL",
            "hindi_summary": "",
            "telugu_summary": "",
            "source_url": None,
            "generated_at": "",
        },
        audit_trail=[
            {
                "timestamp": now_hms(),
                "agent": "SYSTEM",
                "message": "Backend online. Waiting for first analysis request.",
            }
        ],
        studio={
            "audio_status": "idle",
            "audio_job_id": None,
            "audio_message": "NotebookLM job has not started.",
            "audio_url": None,
        },
    )

    return state.model_dump()


def _clean_text(raw_text: str) -> str:
    return re.sub(r"\s+", " ", raw_text or "").strip()


def _decode_json_payload(raw: str) -> Dict[str, Any]:
    candidate = (raw or "").strip()

    if candidate.startswith("```"):
        candidate = re.sub(r"^```(?:json)?", "", candidate).strip()
        candidate = re.sub(r"```$", "", candidate).strip()

    for attempt in (candidate, candidate[candidate.find("{") : candidate.rfind("}") + 1]):
        if not attempt:
            continue

        try:
            parsed = json.loads(attempt)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue

    raise ValueError("Model did not return a valid JSON object.")


class ArticleIntelligenceEngine:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_TOKEN") or os.getenv("GOOGLE_API_KEY", "")
        self.model = model or DEFAULT_MODEL

    async def resolve_article_source(
        self,
        article_url: Optional[str],
        article_text: Optional[str],
        *,
        max_chars: int = 12000,
    ) -> Tuple[str, Optional[str]]:
        raw = _clean_text(article_text or "")

        if raw:
            if len(raw) < 120:
                raise ValueError("Article text is too short for reliable extraction.")
            return raw[:max_chars], article_url

        if not article_url:
            raise ValueError("Provide either article_url or article_text.")

        if not article_url.lower().startswith(("http://", "https://")):
            raise ValueError("article_url must start with http:// or https://")

        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            response = await client.get(
                article_url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
                    )
                },
            )
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        for node in soup(["script", "style", "noscript", "svg", "form", "header", "footer", "nav"]):
            node.decompose()

        paragraphs = [_clean_text(p.get_text(" ", strip=True)) for p in soup.find_all("p")]
        text = " ".join(p for p in paragraphs if len(p) >= 40)

        if not text:
            text = _clean_text(soup.get_text(" ", strip=True))

        if len(text) < 120:
            raise ValueError("Could not extract enough article content from the URL.")

        return text[:max_chars], article_url

    async def extract(self, article_text: str, source_url: Optional[str]) -> Dict[str, Any]:
        normalized_text = _clean_text(article_text)
        if not normalized_text:
            raise ValueError("Article text is empty after cleanup.")

        if not self.api_key:
            return self._normalize(self._heuristic_payload(normalized_text), normalized_text, source_url)

        prompt = self._build_prompt(normalized_text, source_url)

        try:
            raw = await self._call_gemini(prompt)
            parsed = _decode_json_payload(raw)
            return self._normalize(parsed, normalized_text, source_url)
        except Exception:
            return self._normalize(self._heuristic_payload(normalized_text), normalized_text, source_url)

    def _build_prompt(self, article_text: str, source_url: Optional[str]) -> str:
        url_line = source_url or "direct_text_input"
        return (
            "You are an enterprise news intelligence extractor for an Economic Times workflow. "
            "Read the article and return STRICT JSON with this exact structure: "
            "{\"briefing\":[\"...\",\"...\",\"...\"],"
            "\"entities\":[{\"name\":\"...\",\"type\":\"PERSON|ORG|LOCATION|TOPIC|OTHER\"}],"
            "\"sentiment\":\"POSITIVE|NEUTRAL|NEGATIVE\"," 
            "\"hindi_summary\":\"...\","
            "\"telugu_summary\":\"...\","
            "\"confidence_score\":0-100,"
            "\"risk_score\":0-100}. "
            "Rules: briefing must contain exactly 3 concise bullets; entities should capture major actors, organizations, and locations; "
            "hindi_summary and telugu_summary must each be natural language summaries in 3-5 sentences. "
            "No markdown, no commentary, output JSON only.\n\n"
            f"Source: {url_line}\n"
            f"Article:\n{article_text}"
        )

    async def _call_gemini(self, prompt: str) -> str:
        sdk_error: Optional[Exception] = None

        try:
            from google import genai  # type: ignore

            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(model=self.model, contents=prompt)
            text = _clean_text(getattr(response, "text", ""))

            if not text:
                text = self._extract_sdk_text(response)

            if text:
                return text
        except Exception as exc:
            sdk_error = exc

        model_name = self.model if self.model.startswith("models/") else f"models/{self.model}"
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"{model_name}:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()

        text = _clean_text(
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        if text:
            return text

        if sdk_error is not None:
            raise RuntimeError("Gemini SDK and REST fallback both failed.") from sdk_error

        raise RuntimeError("Gemini returned an empty response.")

    def _extract_sdk_text(self, response: Any) -> str:
        candidates = getattr(response, "candidates", []) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", []) if content is not None else []
            assembled: list[str] = []
            for part in parts:
                value = _clean_text(getattr(part, "text", ""))
                if value:
                    assembled.append(value)
            if assembled:
                return "\n".join(assembled)
        return ""

    def _normalize(self, payload: Dict[str, Any], article_text: str, source_url: Optional[str]) -> Dict[str, Any]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", article_text) if len(s.strip()) >= 30]

        briefing = payload.get("briefing", [])
        if not isinstance(briefing, list):
            briefing = []

        normalized_briefing = [str(item).strip("- ") for item in briefing if str(item).strip()][:3]
        while len(normalized_briefing) < 3:
            fallback_line = sentences[len(normalized_briefing)] if len(sentences) > len(normalized_briefing) else "Additional context pending."
            normalized_briefing.append(fallback_line)

        entities = payload.get("entities", [])
        if not isinstance(entities, list):
            entities = []

        normalized_entities: list[Dict[str, str]] = []
        for candidate in entities[:12]:
            if isinstance(candidate, dict):
                name = _clean_text(str(candidate.get("name", "")))
                entity_type = _clean_text(str(candidate.get("type", "OTHER"))).upper() or "OTHER"
            else:
                name = _clean_text(str(candidate))
                entity_type = "OTHER"

            if name:
                normalized_entities.append({"name": name, "type": entity_type})

        if not normalized_entities:
            normalized_entities = self._heuristic_entities(article_text)

        hindi_summary = _clean_text(str(payload.get("hindi_summary", "")))
        if not hindi_summary:
            hindi_summary = (
                "Hindi summary unavailable. Set GEMINI_API_TOKEN in backend/.env "
                "for live vernacular generation."
            )

        telugu_summary = _clean_text(str(payload.get("telugu_summary", "")))
        if not telugu_summary:
            telugu_summary = (
                "Telugu summary unavailable. Set GEMINI_API_TOKEN in backend/.env "
                "for live vernacular generation."
            )

        sentiment = _clean_text(str(payload.get("sentiment", "NEUTRAL"))).upper()
        if sentiment not in {"POSITIVE", "NEUTRAL", "NEGATIVE"}:
            sentiment = self._heuristic_sentiment(article_text)

        confidence_score = self._bounded_number(payload.get("confidence_score"), default_value=82.0)
        risk_score = self._bounded_number(payload.get("risk_score"), default_value=24.0)

        return {
            "briefing": normalized_briefing,
            "entities": normalized_entities,
            "sentiment": sentiment,
            "hindi_summary": hindi_summary,
            "telugu_summary": telugu_summary,
            "confidence_score": confidence_score,
            "risk_score": risk_score,
            "source_url": source_url,
            "generated_at": now_iso(),
        }

    def _heuristic_payload(self, article_text: str) -> Dict[str, Any]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", article_text) if s.strip()]
        briefing = [line for line in sentences if len(line) > 30][:3]

        while len(briefing) < 3:
            briefing.append("Live briefing unavailable. Add GEMINI_API_TOKEN for richer extraction.")

        return {
            "briefing": briefing[:3],
            "entities": self._heuristic_entities(article_text),
            "sentiment": self._heuristic_sentiment(article_text),
            "hindi_summary": (
                "Hindi summary unavailable. Set GEMINI_API_TOKEN in backend/.env "
                "for live vernacular generation."
            ),
            "telugu_summary": (
                "Telugu summary unavailable. Set GEMINI_API_TOKEN in backend/.env "
                "for live vernacular generation."
            ),
            "confidence_score": 72.0,
            "risk_score": 36.0,
        }

    def _heuristic_entities(self, article_text: str) -> list[Dict[str, str]]:
        pattern = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b")
        blocked = {
            "The",
            "This",
            "That",
            "These",
            "Those",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        }

        entities: list[Dict[str, str]] = []
        seen: set[str] = set()
        for match in pattern.finditer(article_text):
            token = match.group(0).strip()
            if token in blocked:
                continue
            if len(token) < 3:
                continue
            lowered = token.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            entities.append({"name": token, "type": "OTHER"})
            if len(entities) >= 10:
                break

        return entities

    def _bounded_number(self, value: Any, *, default_value: float) -> float:
        try:
            numeric = float(value)
        except Exception:
            numeric = default_value
        return round(max(0.0, min(99.9, numeric)), 1)

    def _heuristic_sentiment(self, article_text: str) -> str:
        lowered = article_text.lower()
        positive_terms = {
            "growth",
            "surge",
            "record",
            "profit",
            "strong",
            "gain",
            "optimistic",
            "expansion",
        }
        negative_terms = {
            "decline",
            "drop",
            "loss",
            "risk",
            "crisis",
            "concern",
            "slowdown",
            "volatility",
        }

        positive_score = sum(1 for term in positive_terms if term in lowered)
        negative_score = sum(1 for term in negative_terms if term in lowered)

        if positive_score > negative_score:
            return "POSITIVE"
        if negative_score > positive_score:
            return "NEGATIVE"
        return "NEUTRAL"
