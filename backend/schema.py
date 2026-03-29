from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


Severity = Literal["CRITICAL", "MEDIUM", "LOW"]
AudioStatus = Literal["idle", "queued", "running", "completed", "failed"]


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


class AudioJob(BaseModel):
    job_id: str
    status: AudioStatus
    message: str
    audio_url: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
