from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


Severity = Literal["CRITICAL", "MEDIUM", "LOW"]
AudioStatus = Literal["idle", "queued", "running", "completed", "failed"]
VideoStatus = Literal["idle", "queued", "running", "completed", "failed"]


class Telemetry(BaseModel):
    raw_input: str
    draft_version: str
    status: str
    confidence_score: float
    risk_score: float


class Pipeline(BaseModel):
    active_node: str
    completed_nodes: list[str] = Field(default_factory=list)


class Violation(BaseModel):
    id: str
    type: str
    severity: Severity
    original_text: Optional[str] = None
    fixed_output: Optional[str] = None
    description: Optional[str] = None
    resolution_status: str


class Entity(BaseModel):
    name: str
    type: str = "OTHER"


class Intelligence(BaseModel):
    violations: list[Violation] = Field(default_factory=list)
    ruleset: str
    briefing: list[str] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    provider: str = "PENDING"
    provider_message: str = "Awaiting first analysis run."
    sentiment: str = "NEUTRAL"
    hindi_summary: str = ""
    telugu_summary: str = ""
    source_url: Optional[str] = None
    generated_at: str = ""


class AuditEvent(BaseModel):
    timestamp: str
    agent: str
    message: str


class Studio(BaseModel):
    audio_status: AudioStatus = "idle"
    audio_job_id: Optional[str] = None
    audio_message: str = ""
    audio_url: Optional[str] = None
    video_status: VideoStatus = "idle"
    video_job_id: Optional[str] = None
    video_message: str = ""
    video_url: Optional[str] = None


class AurixaState(BaseModel):
    task_id: str
    system_status: str
    iteration: int
    retry_count: int
    telemetry: Telemetry
    pipeline: Pipeline
    intelligence: Intelligence
    audit_trail: list[AuditEvent] = Field(default_factory=list)
    studio: Studio = Field(default_factory=Studio)


class AnalyzeRequest(BaseModel):
    article_url: Optional[str] = None
    article_text: Optional[str] = None


class GenerateAudioRequest(BaseModel):
    script_text: Optional[str] = None


class WebSource(BaseModel):
    title: str
    url: str
    snippet: str = ""


class VideoScene(BaseModel):
    title: str
    body: str
    visual: str
    duration_sec: int = Field(default=12, ge=6, le=30)


class GenerateVideoBriefRequest(BaseModel):
    focus_topic: Optional[str] = None
    duration_seconds: int = Field(default=90, ge=45, le=180)
    include_web_search: bool = True
    max_sources: int = Field(default=5, ge=0, le=8)
    render_video: bool = True


class VideoBrief(BaseModel):
    title: str
    subtitle: str
    narration_script: str
    scenes: list[VideoScene] = Field(default_factory=list)
    sources: list[WebSource] = Field(default_factory=list)
    provider: str = "HEURISTIC"
    provider_message: str = ""
    search_query: str = ""
    video_status: VideoStatus = "idle"
    video_job_id: Optional[str] = None
    video_url: Optional[str] = None
    generated_at: str = ""


class NavigatorQuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None


class AudioJob(BaseModel):
    job_id: str
    status: AudioStatus
    message: str
    audio_url: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class VideoJob(BaseModel):
    job_id: str
    status: VideoStatus
    message: str
    video_url: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
