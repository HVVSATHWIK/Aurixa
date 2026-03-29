from __future__ import annotations

import json
import os
import re
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import parse_qs, unquote, urlparse
from xml.etree import ElementTree as ET

import httpx
from bs4 import BeautifulSoup

from backend.schema import (
    AuditEvent,
    AurixaState,
    Intelligence,
    Pipeline,
    Studio,
    Telemetry,
    VideoBrief,
)

PIPELINE_ORDER = ["INGESTION", "DRAFTING", "COMPLIANCE", "EDITOR", "APPROVAL"]
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

ARTICLE_NOISE_PATTERNS = (
    r"^in case you missed it$",
    r"^top searched companies$",
    r"^read more$",
    r"enter stock quotes, news, mutual funds",
    r"loading\.\.\.\s*home\s+etprime",
    r"catch all the .* news",
    r"latest news updates on the economic times",
    r"read more news on",
    r"add as a reliable and trusted news source",
    r"font size",
    r"save print comment",
)


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
        task_id="REQ-8829-AX",
        system_status="READY FOR LIVE ARTICLE ANALYSIS",
        iteration=0,
        retry_count=0,
        telemetry=Telemetry(
            raw_input="Awaiting article URL or article text.",
            draft_version="v0.0",
            status="Idle",
            confidence_score=0.0,
            risk_score=0.0,
        ),
        pipeline=Pipeline(
            active_node="INGESTION",
            completed_nodes=[],
        ),
        intelligence=Intelligence(
            violations=[],
            ruleset="AURIXA newsroom extraction protocol v1",
            briefing=[
                "Submit a source URL or raw article text to begin analysis.",
                "Gemini extracts briefing bullets and key entities.",
                "Hindi and Telugu summaries appear after drafting completes.",
            ],
            entities=[],
            sentiment="NEUTRAL",
            hindi_summary="",
            telugu_summary="",
            source_url=None,
            generated_at="",
        ),
        audit_trail=[
            AuditEvent(
                timestamp=now_hms(),
                agent="SYSTEM",
                message="Backend online. Waiting for first analysis request.",
            )
        ],
        studio=Studio(
            audio_status="idle",
            audio_job_id=None,
            audio_message="NotebookLM job has not started.",
            audio_url=None,
            video_status="idle",
            video_job_id=None,
            video_message="Video render job has not started.",
            video_url=None,
        ),
    )

    return state.model_dump()


def _clean_text(raw_text: str) -> str:
    return re.sub(r"\s+", " ", raw_text or "").strip()


def _strip_known_footer_noise(raw_text: str) -> str:
    text = _clean_text(raw_text)
    text = re.sub(
        r"\(\s*catch all the .*? latest news updates on the economic times\s*\.??\s*\)",
        "",
        text,
        flags=re.IGNORECASE,
    )
    return _clean_text(text)


def _is_probable_noise(text: str) -> bool:
    candidate = _clean_text(text).lower()
    if not candidate:
        return True

    if candidate.count("|") >= 3:
        return True

    nav_markers = (
        "home etprime",
        "market data",
        "newsletters",
        "top searched companies",
        "in case you missed it",
    )
    if sum(marker in candidate for marker in nav_markers) >= 2:
        return True

    return any(re.search(pattern, candidate) for pattern in ARTICLE_NOISE_PATTERNS)


def _split_relevant_sentences(article_text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])\s+", article_text)
    sentences: list[str] = []

    for chunk in chunks:
        cleaned = _strip_known_footer_noise(chunk)
        if len(cleaned) < 30:
            continue
        if _is_probable_noise(cleaned):
            continue
        sentences.append(cleaned)

    return sentences


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
        self.model_candidates = self._resolve_model_candidates(self.model)
        self.last_provider = "HEURISTIC"
        self.last_provider_message = "Awaiting first extraction run."

    def _resolve_model_candidates(self, preferred_model: str) -> list[str]:
        configured = [
            item.strip()
            for item in os.getenv("GEMINI_MODEL_CANDIDATES", "").split(",")
            if item.strip()
        ]

        if not configured:
            configured = [
                preferred_model,
                "gemini-2.5-flash",
                "gemini-2.0-flash",
            ]
        elif preferred_model not in configured:
            configured.insert(0, preferred_model)

        deduped: list[str] = []
        seen: set[str] = set()
        for model_name in configured:
            normalized = str(model_name).strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(normalized)

        return deduped

    def runtime_status(self) -> Dict[str, Any]:
        return {
            "gemini_configured": bool(self.api_key),
            "gemini_model": self.model,
            "gemini_model_candidates": self.model_candidates,
            "provider": self.last_provider,
            "provider_message": self.last_provider_message,
        }

    def _classify_gemini_failure(self, exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            status_code = int(exc.response.status_code)
            if status_code in {401, 403}:
                return "Gemini API key rejected. Using heuristic extraction fallback."
            if status_code == 404:
                candidates = ", ".join(self.model_candidates)
                return (
                    "Configured Gemini models are unavailable "
                    f"({candidates}). Using heuristic extraction fallback."
                )
            if status_code == 429:
                return "Gemini rate limit reached. Using heuristic extraction fallback."
            if status_code >= 500:
                return "Gemini service error. Using heuristic extraction fallback."
            return f"Gemini request failed with status {status_code}. Using heuristic extraction fallback."

        if isinstance(exc, (httpx.ReadTimeout, httpx.ConnectTimeout, TimeoutError)):
            return "Gemini request timed out. Using heuristic extraction fallback."

        return "Gemini request failed. Using heuristic extraction fallback."

    async def resolve_article_source(
        self,
        article_url: Optional[str],
        article_text: Optional[str],
        *,
        max_chars: int = 12000,
    ) -> Tuple[str, Optional[str]]:
        raw = _clean_text(article_text or "")

        if raw:
            if len(raw) < 40:
                raise ValueError("Article text is too short. Paste at least 40 characters.")
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

        json_ld_text = self._extract_from_json_ld(response.text)
        if len(json_ld_text) >= 120:
            return json_ld_text[:max_chars], article_url

        container_text = self._extract_from_article_containers(soup)
        if len(container_text) >= 120:
            return container_text[:max_chars], article_url

        paragraphs = []
        for paragraph_node in soup.find_all("p"):
            paragraph = _strip_known_footer_noise(paragraph_node.get_text(" ", strip=True))
            if len(paragraph) < 40:
                continue
            if _is_probable_noise(paragraph):
                continue
            paragraphs.append(paragraph)

        text = " ".join(paragraphs)

        if not text:
            lines = []
            for raw_line in soup.get_text("\n", strip=True).splitlines():
                line = _strip_known_footer_noise(raw_line)
                if len(line) < 40:
                    continue
                if _is_probable_noise(line):
                    continue
                lines.append(line)
            text = _clean_text(" ".join(lines))

        if len(text) < 40:
            raise ValueError("Could not extract enough article content from the URL.")

        return text[:max_chars], article_url

    def _extract_from_json_ld(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        scripts = soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.IGNORECASE)})

        for script in scripts:
            raw_json = ""
            get_text = getattr(script, "get_text", None)
            if callable(get_text):
                raw_json = _clean_text(str(get_text(" ", strip=True)))
            if not raw_json:
                continue

            try:
                parsed = json.loads(raw_json)
            except Exception:
                continue

            for node in self._iter_json_nodes(parsed):
                type_value = node.get("@type")
                if isinstance(type_value, list):
                    type_tokens = [str(item).lower() for item in type_value]
                else:
                    type_tokens = [str(type_value).lower()]

                if not any("article" in token for token in type_tokens):
                    continue

                article_body = _strip_known_footer_noise(str(node.get("articleBody", "")))
                if len(article_body) >= 120 and not _is_probable_noise(article_body):
                    return article_body

                description = _strip_known_footer_noise(str(node.get("description", "")))
                headline = _strip_known_footer_noise(str(node.get("headline", "")))
                combined = _clean_text(" ".join(part for part in [headline, description] if part))
                if len(combined) >= 120 and not _is_probable_noise(combined):
                    return combined

        return ""

    def _extract_from_article_containers(self, soup: BeautifulSoup) -> str:
        selectors = [
            "article",
            "[itemprop='articleBody']",
            ".artData",
            ".articleBody",
            ".article-body",
            ".article-content",
            ".story-content",
            ".entry-content",
            ".Normal",
            "main",
        ]
        candidates: list[tuple[int, str]] = []

        for selector in selectors:
            for container in soup.select(selector):
                paragraphs: list[str] = []
                for paragraph_node in container.find_all("p"):
                    paragraph = _strip_known_footer_noise(paragraph_node.get_text(" ", strip=True))
                    if len(paragraph) < 40:
                        continue
                    if _is_probable_noise(paragraph):
                        continue
                    paragraphs.append(paragraph)

                if not paragraphs:
                    continue

                text = _clean_text(" ".join(paragraphs))
                if len(text) < 120:
                    continue

                candidates.append((len(text), text))

        if not candidates:
            return ""

        candidates.sort(key=lambda item: item[0], reverse=True)
        return candidates[0][1]

    def _iter_json_nodes(self, payload: Any):
        stack = [payload]
        while stack:
            current = stack.pop()
            if isinstance(current, dict):
                yield current
                for value in current.values():
                    if isinstance(value, (dict, list)):
                        stack.append(value)
            elif isinstance(current, list):
                for value in current:
                    if isinstance(value, (dict, list)):
                        stack.append(value)

    async def extract(self, article_text: str, source_url: Optional[str]) -> Dict[str, Any]:
        normalized_text = _clean_text(article_text)
        if not normalized_text:
            raise ValueError("Article text is empty after cleanup.")

        if not self.api_key:
            self.last_provider = "HEURISTIC"
            self.last_provider_message = "Gemini token missing. Using heuristic extraction fallback."
            return self._normalize(self._heuristic_payload(normalized_text), normalized_text, source_url)

        prompt = self._build_prompt(normalized_text, source_url)

        try:
            raw = await self._call_gemini(prompt)
            parsed = _decode_json_payload(raw)
            self.last_provider = "GEMINI"
            self.last_provider_message = f"Gemini live extraction active with model '{self.model}'."
            return self._normalize(parsed, normalized_text, source_url)
        except Exception as exc:
            self.last_provider = "HEURISTIC"
            self.last_provider_message = self._classify_gemini_failure(exc)
            return self._normalize(self._heuristic_payload(normalized_text), normalized_text, source_url)

    async def answer_question(
        self,
        question: str,
        intelligence: Dict[str, Any],
        raw_input: str = "",
        extra_context: str = "",
    ) -> Dict[str, Any]:
        cleaned_question = _clean_text(question)
        if len(cleaned_question) < 3:
            raise ValueError("Question is too short.")

        briefing = intelligence.get("briefing", []) if isinstance(intelligence, dict) else []
        entities = intelligence.get("entities", []) if isinstance(intelligence, dict) else []
        sentiment = _clean_text(str(intelligence.get("sentiment", "NEUTRAL"))).upper()
        risk_score = intelligence.get("risk_score", None)
        confidence_score = intelligence.get("confidence_score", None)

        context_payload = {
            "briefing": briefing if isinstance(briefing, list) else [],
            "entities": entities if isinstance(entities, list) else [],
            "sentiment": sentiment if sentiment in {"POSITIVE", "NEUTRAL", "NEGATIVE"} else "NEUTRAL",
            "hindi_summary": _clean_text(str(intelligence.get("hindi_summary", ""))),
            "telugu_summary": _clean_text(str(intelligence.get("telugu_summary", ""))),
            "risk_score": risk_score,
            "confidence_score": confidence_score,
            "raw_input": _clean_text(raw_input),
            "extra_context": _clean_text(extra_context),
        }

        if self.api_key:
            prompt = (
                "You are the AURIXA News Navigator. "
                "Use the provided intelligence context and answer the user's question clearly. "
                "Return STRICT JSON only with this structure: "
                "{\"answer\":\"...\",\"follow_ups\":[\"...\",\"...\",\"...\"]}. "
                "The answer should be concise, factual, and practical for a business reader. "
                "follow_ups must contain exactly 3 useful next questions.\n\n"
                f"Context JSON: {json.dumps(context_payload, ensure_ascii=False)}\n"
                f"Question: {cleaned_question}"
            )

            try:
                raw = await self._call_gemini(prompt)
                parsed = _decode_json_payload(raw)
                return self._normalize_question_response(parsed, cleaned_question, context_payload)
            except Exception:
                pass

        return self._heuristic_question_response(cleaned_question, context_payload)

    async def search_web(self, query: str, *, max_results: int = 5) -> list[Dict[str, str]]:
        cleaned_query = _clean_text(query)
        limit = max(0, min(8, int(max_results)))
        if not cleaned_query or limit == 0:
            return []

        google_news_results = await self._search_google_news_rss(cleaned_query, limit)
        if google_news_results:
            return google_news_results

        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                response = await client.get(
                    "https://duckduckgo.com/html/",
                    params={"q": cleaned_query},
                    headers={
                        "User-Agent": "Mozilla/5.0"
                    },
                )
                response.raise_for_status()
        except Exception:
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        results: list[Dict[str, str]] = []
        seen_urls: set[str] = set()

        for block in soup.select("div.result"):
            if len(results) >= limit:
                break

            title_node = block.select_one("a.result__a")
            if title_node is None:
                continue

            raw_href = _clean_text(str(title_node.get("href", "")))
            resolved_url = self._resolve_search_result_url(raw_href)
            if not resolved_url or resolved_url in seen_urls:
                continue

            title = _clean_text(title_node.get_text(" ", strip=True))
            snippet_node = block.select_one(".result__snippet")
            snippet = _clean_text(snippet_node.get_text(" ", strip=True) if snippet_node else "")

            if not title:
                continue

            seen_urls.add(resolved_url)
            results.append(
                {
                    "title": title,
                    "url": resolved_url,
                    "snippet": snippet,
                }
            )

        return results

    async def _search_google_news_rss(self, query: str, limit: int) -> list[Dict[str, str]]:
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                response = await client.get(
                    "https://news.google.com/rss/search",
                    params={
                        "q": query,
                        "hl": "en-IN",
                        "gl": "IN",
                        "ceid": "IN:en",
                    },
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                response.raise_for_status()
        except Exception:
            return []

        try:
            root = ET.fromstring(response.text)
        except Exception:
            return []

        results: list[Dict[str, str]] = []
        seen_urls: set[str] = set()

        for item in root.findall(".//item"):
            if len(results) >= limit:
                break

            title = _clean_text(item.findtext("title", default=""))
            link = _clean_text(item.findtext("link", default=""))
            description = _clean_text(item.findtext("description", default=""))
            snippet = _clean_text(BeautifulSoup(description, "html.parser").get_text(" ", strip=True))
            resolved_url = self._resolve_search_result_url(link)

            if not title or not resolved_url or resolved_url in seen_urls:
                continue

            seen_urls.add(resolved_url)
            results.append(
                {
                    "title": title,
                    "url": resolved_url,
                    "snippet": snippet,
                }
            )

        return results

    async def generate_video_brief(
        self,
        *,
        intelligence: Dict[str, Any],
        raw_input: str = "",
        source_url: Optional[str] = None,
        duration_seconds: int = 90,
        focus_topic: str = "",
        include_web_search: bool = True,
        max_sources: int = 5,
    ) -> Dict[str, Any]:
        context_intelligence = intelligence if isinstance(intelligence, dict) else {}
        bounded_duration = max(45, min(180, int(duration_seconds or 90)))
        bounded_max_sources = max(0, min(8, int(max_sources or 5)))
        resolved_source_url = source_url or _clean_text(str(context_intelligence.get("source_url", ""))) or None

        search_query = self._build_video_search_query(
            intelligence=context_intelligence,
            raw_input=raw_input,
            source_url=resolved_source_url,
            focus_topic=focus_topic,
        )

        web_sources: list[Dict[str, str]] = []
        if include_web_search and bounded_max_sources > 0:
            web_sources = await self.search_web(search_query, max_results=bounded_max_sources)

        if not self.api_key:
            return self._heuristic_video_brief(
                intelligence=context_intelligence,
                raw_input=raw_input,
                source_url=resolved_source_url,
                duration_seconds=bounded_duration,
                search_query=search_query,
                web_sources=web_sources,
                provider_message="Gemini token missing. Using heuristic video brief builder.",
            )

        model_context = {
            "duration_seconds": bounded_duration,
            "focus_topic": _clean_text(focus_topic),
            "source_url": resolved_source_url,
            "raw_input_excerpt": _clean_text(raw_input)[:1800],
            "intelligence": {
                "briefing": context_intelligence.get("briefing", []),
                "entities": context_intelligence.get("entities", []),
                "sentiment": context_intelligence.get("sentiment", "NEUTRAL"),
                "hindi_summary": context_intelligence.get("hindi_summary", ""),
                "telugu_summary": context_intelligence.get("telugu_summary", ""),
                "confidence_score": context_intelligence.get("confidence_score"),
                "risk_score": context_intelligence.get("risk_score"),
            },
            "web_sources": web_sources,
        }

        prompt = (
            "You are the AURIXA AI video producer for business-news explainers. "
            "Use intelligence + optional web sources to produce a short video package. "
            "Return STRICT JSON only with this schema: "
            "{\"title\":\"...\",\"subtitle\":\"...\",\"narration_script\":\"...\","
            "\"scenes\":[{\"title\":\"...\",\"body\":\"...\",\"visual\":\"...\",\"duration_sec\":12}],"
            "\"sources\":[{\"title\":\"...\",\"url\":\"https://...\",\"snippet\":\"...\"}],"
            "\"search_query\":\"...\"}. "
            "Rules: 5-8 scenes, each scene body <= 32 words, factual tone, no hype, and total duration should be near the requested duration. "
            "Do not output markdown. Output JSON only.\n\n"
            f"Context JSON: {json.dumps(model_context, ensure_ascii=False)}"
        )

        try:
            raw = await self._call_gemini(prompt)
            parsed = _decode_json_payload(raw)
            return self._normalize_video_brief(
                payload=parsed,
                intelligence=context_intelligence,
                raw_input=raw_input,
                source_url=resolved_source_url,
                duration_seconds=bounded_duration,
                search_query=search_query,
                web_sources=web_sources,
                provider="GEMINI",
                provider_message=f"Gemini video brief generated with model '{self.model}'.",
            )
        except Exception as exc:
            fallback_message = self._classify_gemini_failure(exc).replace(
                "extraction", "video brief generation"
            )
            return self._heuristic_video_brief(
                intelligence=context_intelligence,
                raw_input=raw_input,
                source_url=resolved_source_url,
                duration_seconds=bounded_duration,
                search_query=search_query,
                web_sources=web_sources,
                provider_message=fallback_message,
            )

    def render_video_from_brief(
        self,
        *,
        video_payload: Dict[str, Any],
        output_path: str,
        fps: int = 8,
        width: int = 1280,
        height: int = 720,
    ) -> str:
        try:
            import imageio.v2 as imageio
            import numpy as np
        except Exception as exc:
            raise RuntimeError(
                "Video rendering dependencies are missing. Install pillow, imageio, imageio-ffmpeg, and numpy."
            ) from exc

        scenes = video_payload.get("scenes", [])
        if not isinstance(scenes, list) or not scenes:
            raise ValueError("Video payload does not include scenes for rendering.")

        safe_fps = max(6, min(12, int(fps)))
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        writer = imageio.get_writer(
            str(output_file),
            fps=safe_fps,
            codec="libx264",
            quality=7,
            pixelformat="yuv420p",
        )

        try:
            total_scenes = len(scenes)
            for scene_index, scene in enumerate(scenes):
                frame = self._render_scene_frame(
                    scene=scene,
                    scene_index=scene_index,
                    total_scenes=total_scenes,
                    width=width,
                    height=height,
                )
                frame_array = np.asarray(frame, dtype=np.uint8)
                duration = max(3, min(24, int(scene.get("duration_sec", 8))))
                frame_count = max(safe_fps * 2, duration * safe_fps)

                for _ in range(frame_count):
                    writer.append_data(frame_array)
        finally:
            writer.close()

        return str(output_file)

    def _load_font(self, candidates: list[str], size: int):
        from PIL import ImageFont

        for font_path in candidates:
            try:
                if Path(font_path).exists():
                    return ImageFont.truetype(font_path, size=size)
            except Exception:
                continue

        return ImageFont.load_default()

    def _render_scene_frame(
        self,
        *,
        scene: Dict[str, Any],
        scene_index: int,
        total_scenes: int,
        width: int,
        height: int,
    ):
        from PIL import Image, ImageDraw

        palettes = [
            ((245, 237, 224), (228, 205, 179), (126, 21, 30)),
            ((238, 231, 216), (217, 200, 186), (142, 64, 43)),
            ((246, 240, 231), (227, 212, 194), (117, 34, 27)),
            ((236, 229, 221), (212, 198, 184), (96, 43, 33)),
        ]
        bg_start, bg_end, accent = palettes[scene_index % len(palettes)]

        image = Image.new("RGB", (width, height), color=bg_start)
        draw = ImageDraw.Draw(image)

        # Vertical gradient foundation so each scene has tonal depth instead of a flat slide.
        for y in range(height):
            ratio = y / float(max(1, height - 1))
            r = int(bg_start[0] * (1 - ratio) + bg_end[0] * ratio)
            g = int(bg_start[1] * (1 - ratio) + bg_end[1] * ratio)
            b = int(bg_start[2] * (1 - ratio) + bg_end[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        for x in range(0, width, 58):
            draw.line([(x, 0), (x, height)], fill=(186, 165, 145), width=1)
        for y in range(0, height, 58):
            draw.line([(0, y), (width, y)], fill=(186, 165, 145), width=1)

        pad = 62
        draw.rounded_rectangle(
            [(pad, pad), (width - pad, height - pad)],
            radius=34,
            fill=(255, 252, 246),
            outline=(205, 188, 166),
            width=3,
        )

        title_font = self._load_font(
            [
                "C:/Windows/Fonts/georgiab.ttf",
                "C:/Windows/Fonts/seguisb.ttf",
                "C:/Windows/Fonts/segoeuib.ttf",
            ],
            size=56,
        )
        body_font = self._load_font(
            [
                "C:/Windows/Fonts/segoeui.ttf",
                "C:/Windows/Fonts/arial.ttf",
            ],
            size=34,
        )
        meta_font = self._load_font(
            [
                "C:/Windows/Fonts/consola.ttf",
                "C:/Windows/Fonts/arial.ttf",
            ],
            size=22,
        )

        title = str(scene.get("title", "Story Segment")).strip() or "Story Segment"
        body = str(scene.get("body", "")).strip() or "Brief body unavailable for this segment."
        visual = str(scene.get("visual", "Editorial visual")).strip() or "Editorial visual"
        duration = max(3, min(24, int(scene.get("duration_sec", 8))))

        title_lines = textwrap.wrap(title, width=34)[:2]
        body_lines = textwrap.wrap(body, width=64)[:5]
        visual_lines = textwrap.wrap(visual, width=54)[:2]

        text_x = pad + 34
        cursor_y = pad + 30

        draw.text((text_x, cursor_y), "AURIXA VIDEO BRIEF", font=meta_font, fill=accent)
        cursor_y += 44

        for line in title_lines:
            draw.text((text_x, cursor_y), line, font=title_font, fill=(28, 25, 22))
            cursor_y += 66

        cursor_y += 10
        draw.text((text_x, cursor_y), "Narration", font=meta_font, fill=(110, 96, 82))
        cursor_y += 36

        for line in body_lines:
            draw.text((text_x, cursor_y), line, font=body_font, fill=(49, 42, 36))
            cursor_y += 46

        visual_box_top = height - pad - 170
        draw.rounded_rectangle(
            [(text_x, visual_box_top), (width - pad - 34, height - pad - 32)],
            radius=18,
            fill=(245, 236, 225),
            outline=(203, 182, 158),
            width=2,
        )
        draw.text((text_x + 22, visual_box_top + 18), "Visual Direction", font=meta_font, fill=accent)
        visual_y = visual_box_top + 56
        for line in visual_lines:
            draw.text((text_x + 22, visual_y), line, font=body_font, fill=(54, 44, 36))
            visual_y += 44

        progress_width = width - (pad * 2)
        progress_top = height - pad + 10
        draw.rounded_rectangle(
            [(pad, progress_top), (pad + progress_width, progress_top + 14)],
            radius=7,
            fill=(219, 204, 186),
        )
        completion = (scene_index + 1) / float(max(1, total_scenes))
        fill_width = int(progress_width * completion)
        draw.rounded_rectangle(
            [(pad, progress_top), (pad + fill_width, progress_top + 14)],
            radius=7,
            fill=accent,
        )

        footer = f"Scene {scene_index + 1}/{total_scenes}  |  {duration}s"
        draw.text((width - pad - 250, progress_top - 32), footer, font=meta_font, fill=(84, 70, 58))

        return image

    def _resolve_search_result_url(self, href: str) -> str:
        candidate = _clean_text(href)
        if not candidate:
            return ""

        if candidate.startswith("//"):
            candidate = f"https:{candidate}"

        parsed = urlparse(candidate)
        if parsed.path.startswith("/l/"):
            redirected = parse_qs(parsed.query).get("uddg", [""])[0]
            redirected = unquote(redirected)
            if redirected:
                candidate = redirected

        if candidate.startswith(("http://", "https://")):
            return candidate

        return ""

    def _build_video_search_query(
        self,
        *,
        intelligence: Dict[str, Any],
        raw_input: str,
        source_url: Optional[str],
        focus_topic: str,
    ) -> str:
        cleaned_focus = _clean_text(focus_topic)
        if cleaned_focus:
            return cleaned_focus

        briefing = intelligence.get("briefing", []) if isinstance(intelligence, dict) else []
        if isinstance(briefing, list) and briefing:
            first_line = _clean_text(str(briefing[0]))
            if first_line:
                return f"{first_line} latest update"

        if source_url:
            parsed = urlparse(source_url)
            domain = _clean_text(parsed.netloc.replace("www.", ""))
            if domain:
                return f"{domain} latest business update"

        words = _clean_text(raw_input).split()
        if words:
            return f"{' '.join(words[:12])} latest update"

        return "business markets latest developments"

    def _normalize_video_sources(
        self,
        sources: Any,
        fallback_sources: list[Dict[str, str]],
    ) -> list[Dict[str, str]]:
        normalized: list[Dict[str, str]] = []

        if isinstance(sources, list):
            for item in sources[:8]:
                if not isinstance(item, dict):
                    continue
                title = _clean_text(str(item.get("title", "")))
                url = self._resolve_search_result_url(str(item.get("url", "")))
                snippet = _clean_text(str(item.get("snippet", "")))
                if title and url:
                    normalized.append(
                        {
                            "title": title,
                            "url": url,
                            "snippet": snippet,
                        }
                    )

        if normalized:
            return normalized

        return fallback_sources[:8]

    def _build_default_video_blueprint(
        self,
        *,
        intelligence: Dict[str, Any],
        raw_input: str,
        source_url: Optional[str],
        duration_seconds: int,
        web_sources: list[Dict[str, str]],
    ) -> Dict[str, Any]:
        briefing = intelligence.get("briefing", []) if isinstance(intelligence, dict) else []
        if not isinstance(briefing, list):
            briefing = []

        entities = intelligence.get("entities", []) if isinstance(intelligence, dict) else []
        if not isinstance(entities, list):
            entities = []

        confidence = self._bounded_number(intelligence.get("confidence_score"), default_value=78.0)
        risk = self._bounded_number(intelligence.get("risk_score"), default_value=32.0)

        entity_names: list[str] = []
        for item in entities:
            if isinstance(item, dict):
                name = _clean_text(str(item.get("name", "")))
            else:
                name = _clean_text(str(item))
            if name:
                entity_names.append(name)
        entity_names = entity_names[:5]

        top_source = web_sources[0] if web_sources else {}
        top_source_title = _clean_text(str(top_source.get("title", "")))
        top_source_snippet = _clean_text(str(top_source.get("snippet", "")))
        top_source_url = _clean_text(str(top_source.get("url", "")))

        headline_line = _clean_text(str(briefing[0])) if briefing else "Live intelligence update is ready for newsroom packaging."
        impact_line = _clean_text(str(briefing[1])) if len(briefing) > 1 else headline_line
        outlook_line = _clean_text(str(briefing[2])) if len(briefing) > 2 else "Monitor operating margins, guidance shifts, and policy signals in the next cycle."

        player_line = (
            f"Key entities shaping this story: {', '.join(entity_names)}."
            if entity_names
            else "Entity mapping is still limited for this cycle."
        )
        confidence_line = (
            f"Current confidence is {confidence}% with risk at {risk}%. "
            f"{'Escalate human review before publish.' if risk >= 50 else 'Continue normal editorial checks before publishing.'}"
        )
        source_line = (
            top_source_snippet
            or top_source_title
            or "No external source snippet was retrieved."
        )

        scenes = [
            {
                "title": "Topline Snapshot",
                "body": headline_line,
                "visual": "Opening macro shot with kinetic headline overlays",
                "duration_sec": 12,
            },
            {
                "title": "Impact Breakdown",
                "body": impact_line,
                "visual": "Segmented bar chart with revenue and margin bands",
                "duration_sec": 14,
            },
            {
                "title": "Who Is Driving This",
                "body": player_line,
                "visual": "Entity constellation map with influence arcs",
                "duration_sec": 12,
            },
            {
                "title": "Risk and Confidence",
                "body": confidence_line,
                "visual": "Dual radial gauges for confidence and editorial risk",
                "duration_sec": 14,
            },
            {
                "title": "Web Signal Check",
                "body": source_line,
                "visual": "Ticker strip of external source headlines",
                "duration_sec": 13,
            },
            {
                "title": "What to Watch Next",
                "body": outlook_line,
                "visual": "Forward timeline with watchlist markers",
                "duration_sec": 12,
            },
        ]

        if _clean_text(raw_input) and len(scenes) < 8:
            scenes.append(
                {
                    "title": "Source Excerpt",
                    "body": _clean_text(raw_input)[:190],
                    "visual": "Quote card over newsroom backdrop",
                    "duration_sec": 10,
                }
            )

        self._rebalance_scene_durations(scenes, duration_seconds)
        narration_script = " ".join(
            f"{scene['title']}. {scene['body']}" for scene in scenes
        ).strip()

        subtitle = source_url or top_source_url or "Generated from live intelligence and web context"

        return {
            "title": "AI Video Brief",
            "subtitle": subtitle,
            "narration_script": narration_script,
            "scenes": scenes,
        }

    def _normalize_video_brief(
        self,
        *,
        payload: Dict[str, Any],
        intelligence: Dict[str, Any],
        raw_input: str,
        source_url: Optional[str],
        duration_seconds: int,
        search_query: str,
        web_sources: list[Dict[str, str]],
        provider: str,
        provider_message: str,
    ) -> Dict[str, Any]:
        fallback = self._build_default_video_blueprint(
            intelligence=intelligence,
            raw_input=raw_input,
            source_url=source_url,
            duration_seconds=duration_seconds,
            web_sources=web_sources,
        )

        title = _clean_text(str(payload.get("title", ""))) or fallback["title"]
        subtitle = _clean_text(str(payload.get("subtitle", ""))) or fallback["subtitle"]

        raw_scenes = payload.get("scenes", [])
        normalized_scenes: list[Dict[str, Any]] = []
        if isinstance(raw_scenes, list):
            for item in raw_scenes[:8]:
                if not isinstance(item, dict):
                    continue
                scene_title = _clean_text(str(item.get("title", "")))
                scene_body = _clean_text(str(item.get("body", "")))
                scene_visual = _clean_text(str(item.get("visual", ""))) or "Editorial visual"
                raw_duration = item.get("duration_sec", item.get("durationSec", 12))
                try:
                    duration = int(raw_duration)
                except Exception:
                    duration = 12
                duration = max(8, min(24, duration))

                if scene_title and scene_body:
                    normalized_scenes.append(
                        {
                            "title": scene_title,
                            "body": scene_body,
                            "visual": scene_visual,
                            "duration_sec": duration,
                        }
                    )

        if not normalized_scenes:
            normalized_scenes = fallback["scenes"]

        self._rebalance_scene_durations(normalized_scenes, duration_seconds)

        narration_script = _clean_text(
            str(payload.get("narration_script") or payload.get("narrationScript") or "")
        )
        if not narration_script:
            narration_script = " ".join(
                f"{scene['title']}. {scene['body']}" for scene in normalized_scenes
            ).strip()

        normalized_sources = self._normalize_video_sources(payload.get("sources"), web_sources)
        normalized_query = _clean_text(str(payload.get("search_query", ""))) or search_query

        return VideoBrief.model_validate(
            {
                "title": title,
                "subtitle": subtitle,
                "narration_script": narration_script,
                "scenes": normalized_scenes,
                "sources": normalized_sources,
                "provider": provider,
                "provider_message": _clean_text(provider_message),
                "search_query": normalized_query,
                "generated_at": now_iso(),
            }
        ).model_dump()

    def _heuristic_video_brief(
        self,
        *,
        intelligence: Dict[str, Any],
        raw_input: str,
        source_url: Optional[str],
        duration_seconds: int,
        search_query: str,
        web_sources: list[Dict[str, str]],
        provider_message: str,
    ) -> Dict[str, Any]:
        fallback = self._build_default_video_blueprint(
            intelligence=intelligence,
            raw_input=raw_input,
            source_url=source_url,
            duration_seconds=duration_seconds,
            web_sources=web_sources,
        )

        return VideoBrief.model_validate(
            {
                **fallback,
                "sources": web_sources[:8],
                "provider": "HEURISTIC",
                "provider_message": _clean_text(provider_message)
                or "Heuristic video brief builder is active.",
                "search_query": search_query,
                "generated_at": now_iso(),
            }
        ).model_dump()

    def _rebalance_scene_durations(self, scenes: list[Dict[str, Any]], target_total: int) -> None:
        if not scenes:
            return

        bounded_target = max(45, min(180, int(target_total or 90)))
        total_duration = sum(max(8, min(24, int(scene.get("duration_sec", 12)))) for scene in scenes)
        delta = bounded_target - total_duration
        if delta == 0:
            return

        direction = 1 if delta > 0 else -1
        remaining = abs(delta)
        index = 0
        guard = 0

        while remaining > 0 and guard < 1200:
            scene = scenes[index % len(scenes)]
            current = max(8, min(24, int(scene.get("duration_sec", 12))))
            next_value = current + direction
            if 8 <= next_value <= 24:
                scene["duration_sec"] = next_value
                remaining -= 1
            index += 1
            guard += 1

    def _build_prompt(self, article_text: str, source_url: Optional[str]) -> str:
        url_line = source_url or "direct_text_input"
        return (
            "You are an enterprise news intelligence extractor for a business newsroom workflow. "
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
        sdk_client: Any = None
        try:
            from google import genai  # type: ignore

            sdk_client = genai.Client(api_key=self.api_key)
        except Exception:
            sdk_client = None

        last_error: Optional[Exception] = None

        for candidate_model in self.model_candidates:
            self.model = candidate_model
            sdk_error: Optional[Exception] = None

            if sdk_client is not None:
                try:
                    sdk_response = sdk_client.models.generate_content(
                        model=candidate_model,
                        contents=prompt,
                    )
                    sdk_text = _clean_text(getattr(sdk_response, "text", ""))
                    if not sdk_text:
                        sdk_text = self._extract_sdk_text(sdk_response)
                    if sdk_text:
                        self.model = candidate_model
                        return sdk_text
                except Exception as exc:
                    sdk_error = exc

            model_name = (
                candidate_model
                if candidate_model.startswith("models/")
                else f"models/{candidate_model}"
            )
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

            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(endpoint, json=payload)
                    response.raise_for_status()
                    data = response.json()
            except Exception as rest_error:
                # Continue only when model lookup fails so deprecated models auto-fallback.
                if (
                    isinstance(rest_error, httpx.HTTPStatusError)
                    and int(rest_error.response.status_code) == 404
                ):
                    last_error = rest_error
                    continue

                if sdk_error is not None:
                    raise sdk_error
                raise rest_error

            text = _clean_text(
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            if text:
                self.model = candidate_model
                return text

            last_error = sdk_error or RuntimeError(
                f"Gemini returned an empty response for model '{candidate_model}'."
            )

        if last_error is not None:
            raise last_error

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
        sentences = _split_relevant_sentences(article_text)

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
            if self.last_provider == "GEMINI":
                hindi_summary = "Hindi summary missing in Gemini response. Please retry analysis."
            else:
                hindi_summary = "Hindi summary unavailable because heuristic fallback is active."

        telugu_summary = _clean_text(str(payload.get("telugu_summary", "")))
        if not telugu_summary:
            if self.last_provider == "GEMINI":
                telugu_summary = "Telugu summary missing in Gemini response. Please retry analysis."
            else:
                telugu_summary = "Telugu summary unavailable because heuristic fallback is active."

        sentiment = _clean_text(str(payload.get("sentiment", "NEUTRAL"))).upper()
        if sentiment not in {"POSITIVE", "NEUTRAL", "NEGATIVE"}:
            sentiment = self._heuristic_sentiment(article_text)

        confidence_score = self._bounded_number(payload.get("confidence_score"), default_value=82.0)
        risk_score = self._bounded_number(payload.get("risk_score"), default_value=24.0)
        provider = self.last_provider if self.last_provider in {"GEMINI", "HEURISTIC"} else "HEURISTIC"
        ruleset = (
            "Gemini newsroom extraction protocol v2"
            if provider == "GEMINI"
            else "Heuristic newsroom fallback protocol v1"
        )

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
            "provider": provider,
            "provider_message": self.last_provider_message,
            "ruleset": ruleset,
        }

    def _heuristic_payload(self, article_text: str) -> Dict[str, Any]:
        sentences = _split_relevant_sentences(article_text)
        entities = self._heuristic_entities(article_text)
        sentiment = self._heuristic_sentiment(article_text)

        briefing: list[str] = []
        for sentence in sentences:
            cleaned = _clean_text(sentence)
            if len(cleaned) < 30:
                continue
            briefing.append(cleaned[:220])
            if len(briefing) >= 2:
                break

        lead_entities = [entry.get("name", "") for entry in entities[:3] if isinstance(entry, dict)]
        lead_entities = [name for name in lead_entities if _clean_text(str(name))]

        if sentiment == "NEGATIVE":
            context_line = "Current context is cautious; prioritize downside signal validation and risk controls before publish."
        elif sentiment == "POSITIVE":
            context_line = "Current context is constructive; monitor follow-through signals and guidance consistency in the next cycle."
        else:
            context_line = "Current context is mixed; track confirmation signals and policy or guidance updates over the next 24 hours."

        if lead_entities:
            context_line = f"{context_line} Key entities to watch: {', '.join(lead_entities)}."

        briefing.append(context_line)

        while len(briefing) < 3:
            fallback_line = (
                sentences[len(briefing)]
                if len(sentences) > len(briefing)
                else "Heuristic continuity mode is active. Core signals remain available while the primary model is unavailable."
            )
            briefing.append(_clean_text(fallback_line)[:220])

        return {
            "briefing": briefing[:3],
            "entities": entities,
            "sentiment": sentiment,
            "hindi_summary": "Hindi summary unavailable because heuristic fallback is active.",
            "telugu_summary": "Telugu summary unavailable because heuristic fallback is active.",
            "confidence_score": 72.0,
            "risk_score": 36.0,
        }

    def _normalize_question_response(
        self,
        payload: Dict[str, Any],
        question: str,
        context_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        answer = _clean_text(str(payload.get("answer", "")))
        if not answer:
            return self._heuristic_question_response(question, context_payload)

        follow_ups = payload.get("follow_ups", [])
        if not isinstance(follow_ups, list):
            follow_ups = []

        normalized_follow_ups = [
            _clean_text(str(item))
            for item in follow_ups
            if _clean_text(str(item))
        ][:3]

        while len(normalized_follow_ups) < 3:
            defaults = [
                "What changed since the previous update?",
                "Which stakeholder should react first and why?",
                "What should we monitor over the next 24 hours?",
            ]
            normalized_follow_ups.append(defaults[len(normalized_follow_ups)])

        return {
            "answer": answer,
            "follow_ups": normalized_follow_ups,
            "generated_at": now_iso(),
        }

    def _heuristic_question_response(
        self,
        question: str,
        context_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        briefing = context_payload.get("briefing", []) or []
        entities = context_payload.get("entities", []) or []
        sentiment = context_payload.get("sentiment", "NEUTRAL")
        risk_score = context_payload.get("risk_score")
        confidence_score = context_payload.get("confidence_score")

        key_points = briefing[:2] if isinstance(briefing, list) else []
        lead_entities = []
        if isinstance(entities, list):
            for item in entities[:3]:
                if isinstance(item, dict):
                    entity_name = _clean_text(str(item.get("name", "")))
                else:
                    entity_name = _clean_text(str(item))
                if entity_name:
                    lead_entities.append(entity_name)

        answer_parts: list[str] = []
        lowered_question = question.lower()

        if "risk" in lowered_question and risk_score is not None:
            answer_parts.append(
                f"Current editorial risk is {risk_score}, which should guide compliance review depth before publishing."
            )

        if "confidence" in lowered_question and confidence_score is not None:
            answer_parts.append(
                f"Confidence is {confidence_score}, indicating the extraction quality for this briefing."
            )

        if key_points:
            answer_parts.append(
                f"Based on the latest intelligence: {' '.join(key_points)}"
            )

        if lead_entities:
            answer_parts.append(
                f"The key players currently shaping this story are {', '.join(lead_entities)}."
            )

        if not answer_parts:
            answer_parts.append(
                "The current state does not yet contain enough generated intelligence. Run live analysis first and ask again."
            )

        follow_ups = [
            "What is the single biggest business implication right now?",
            "Which entity has the highest influence in this story arc?",
            f"How does this update affect sentiment, currently marked as {sentiment}?",
        ]

        return {
            "answer": " ".join(answer_parts),
            "follow_ups": follow_ups,
            "generated_at": now_iso(),
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
