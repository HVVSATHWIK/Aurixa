from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


Severity = Literal["CRITICAL", "MEDIUM", "LOW"]


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


class Intelligence(BaseModel):
    violations: list[Violation] = Field(default_factory=list)
    ruleset: str


class AuditEvent(BaseModel):
    timestamp: str
    agent: str
    message: str


class AurixaState(BaseModel):
    task_id: str
    system_status: str
    iteration: int
    retry_count: int
    telemetry: Telemetry
    pipeline: Pipeline
    intelligence: Intelligence
    audit_trail: list[AuditEvent] = Field(default_factory=list)
