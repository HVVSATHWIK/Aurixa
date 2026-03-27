from __future__ import annotations

import random
from copy import deepcopy
from datetime import datetime
from typing import Any, Dict

from backend.schema import AurixaState


def now_hms() -> str:
    return datetime.now().strftime("%H:%M:%S")


def bootstrap_state() -> Dict[str, Any]:
    state = AurixaState(
        task_id="REQ-8829-ET",
        system_status="AUTONOMOUS EXECUTION ACTIVE",
        iteration=2,
        retry_count=1,
        telemetry={
            "raw_input": '"Analyzing global market trends for Q3 2024 with a focus on..."',
            "draft_version": "v2.1",
            "status": "Processing",
            "confidence_score": 98.4,
            "risk_score": 14.2,
        },
        pipeline={
            "active_node": "COMPLIANCE",
            "completed_nodes": ["INGESTION", "DRAFTING"],
        },
        intelligence={
            "violations": [
                {
                    "id": "v_01",
                    "type": "FACTUAL MISMATCH",
                    "severity": "CRITICAL",
                    "original_text": '"Growth at 15%..."',
                    "fixed_output": '"Projected growth at 12.4% based on historical trends"',
                    "resolution_status": "AUTO-CORRECTION COMPLETE",
                },
                {
                    "id": "v_02",
                    "type": "TONE INCONSISTENCY",
                    "severity": "MEDIUM",
                    "description": "Switch from professional to colloquial language detected in paragraph 4.",
                    "resolution_status": "PENDING",
                },
            ],
            "ruleset": "Scanning against Global Regulatory Set v4.0",
        },
        audit_trail=[
            {
                "timestamp": "14:22:01",
                "agent": "AGENT:COMPLIANCE",
                "message": "Scanning for high-severity risk indicators...",
            },
            {
                "timestamp": "14:21:45",
                "agent": "AGENT:EDITOR",
                "message": "Refining tone for executive presentation.",
            },
            {
                "timestamp": "14:21:12",
                "agent": "AGENT:DRAFTING",
                "message": "Draft v2.1 committed to neural stack.",
            },
            {
                "timestamp": "14:20:58",
                "agent": "SYSTEM",
                "message": "Ingestion complete. Processing 24kb text.",
            },
        ],
    )

    return state.model_dump()


class LangGraphLikeOrchestrator:
    """Minimal adapter that mimics LangGraph node transitions and loop control."""

    path = ["INGESTION", "DRAFTING", "COMPLIANCE", "EDITOR", "COMPLIANCE", "APPROVAL"]

    def __init__(self) -> None:
        self._cursor = 2

    def _push_audit(self, state: Dict[str, Any], agent: str, message: str, max_items: int) -> None:
        state["audit_trail"] = [
            {
                "timestamp": now_hms(),
                "agent": agent,
                "message": message,
            },
            *state["audit_trail"],
        ][:max_items]

    def _set_violation_status(self, state: Dict[str, Any], violation_id: str, status: str) -> None:
        for violation in state["intelligence"]["violations"]:
            if violation["id"] == violation_id:
                violation["resolution_status"] = status
                return

    def step(self, current: Dict[str, Any], max_items: int = 12) -> Dict[str, Any]:
        next_state = deepcopy(current)
        active = self.path[self._cursor]

        completed = [n for n in ["INGESTION", "DRAFTING", "COMPLIANCE", "EDITOR", "APPROVAL"] if n != active]
        next_state["pipeline"]["active_node"] = active
        next_state["pipeline"]["completed_nodes"] = completed[: max(0, len(completed) - 1)]

        if active == "INGESTION":
            next_state["iteration"] += 1
            next_state["telemetry"]["status"] = "Processing"
            self._push_audit(next_state, "AGENT:INGESTION", "Ingestion window refreshed for next content bundle.", max_items)
        elif active == "DRAFTING":
            next_state["telemetry"]["status"] = "Drafting"
            self._push_audit(next_state, "AGENT:DRAFTING", "Drafting agent generated a structured content revision.", max_items)
        elif active == "COMPLIANCE":
            next_state["telemetry"]["status"] = "Validation"
            self._set_violation_status(next_state, "v_02", "PENDING")
            self._push_audit(next_state, "AGENT:COMPLIANCE", "Compliance scan flagged tone inconsistency for remediation.", max_items)
        elif active == "EDITOR":
            next_state["telemetry"]["status"] = "Auto-correction"
            self._set_violation_status(next_state, "v_02", "AUTO-CORRECTION COMPLETE")
            self._push_audit(next_state, "AGENT:EDITOR", "Editor agent patched tone mismatch and submitted for re-check.", max_items)
        elif active == "APPROVAL":
            next_state["telemetry"]["status"] = "Approved"
            self._push_audit(next_state, "AGENT:APPROVAL", "Final checks passed. Distribution package marked approved.", max_items)

        next_state["telemetry"]["confidence_score"] = round(
            min(99.9, float(next_state["telemetry"]["confidence_score"]) + random.uniform(0.1, 0.5)),
            1,
        )
        next_state["telemetry"]["risk_score"] = round(
            max(5.0, float(next_state["telemetry"]["risk_score"]) - random.uniform(0.1, 0.4)),
            1,
        )

        self._cursor = (self._cursor + 1) % len(self.path)

        return AurixaState.model_validate(next_state).model_dump()
