# PS1 Architecture One-Pager

## Problem Statement

**Problem Statement 1: AI for Enterprise Content Operations**

AURIXA is an autonomous, self-correcting content operations system for enterprise workflows.

## System Objective

Reduce content cycle time while improving compliance and transparency through a multi-agent autonomous loop.

## Agent Topology

1. `INGESTION` agent
- Parses raw enterprise input and contextual metadata.

2. `DRAFTING` agent
- Produces structured draft content.

3. `COMPLIANCE` agent
- Detects factual mismatch, tone inconsistency, and regulatory risk.
- Produces confidence and risk scoring plus reasoning.

4. `EDITOR` agent
- Applies targeted fixes only where violations are present.

5. `APPROVAL` gate
- Marks content ready for distribution after compliance pass.

## Core Innovation: Self-Correction Loop

The system uses a closed-loop control cycle:

`COMPLIANCE -> EDITOR -> COMPLIANCE`

This repeats automatically until violations are resolved and thresholds are met.

## State-Driven Contract

Frontend consumes a canonical runtime state object including:

- `task_id`
- `system_status`
- `iteration`, `retry_count`
- `telemetry` (raw input, draft version, status, confidence, risk)
- `pipeline` (active node, completed nodes)
- `intelligence` (violations, ruleset)
- `audit_trail` (timestamp, agent, message)

## Observability and Governance

AURIXA dashboard provides:

- Live transport-aware status (websocket/polling/simulated)
- Pipeline node state and active agent focus
- Violation diff and resolution status
- Immutable-style audit trail visualization

This supports governance, explainability, and post-incident analysis.

## Deployment Model

- Backend: Python + LangGraph orchestrator emitting state snapshots/stream updates.
- Frontend: Vite + React + Tailwind observability deck.
- CI: typecheck, lint, build on every push and PR.

## Success Metrics

- Lower manual review load
- Reduced time-to-approval
- Higher first-pass compliance rate
- Full traceability for enterprise audit requirements
