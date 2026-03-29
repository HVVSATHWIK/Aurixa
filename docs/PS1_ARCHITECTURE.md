# Architecture One-Pager

## Problem Statement

Primary:

- Problem Statement 8: AI-Native News Experience

Supporting depth:

- Problem Statement 1: AI for Enterprise Content Operations
- Problem Statement 2: Agentic AI for Autonomous Enterprise Workflows

AURIXA is an autonomous, self-correcting intelligence operations system with interactive newsroom outputs.

## System Objective

Reduce content cycle time while improving compliance and transparency through a multi-agent autonomous loop.

## PS8 Output Modules

1. News Navigator briefing + follow-up Q&A
2. Story Arc Tracker (timeline + entities + sentiment)
3. AI Video Studio (AI storyboard + audio + source context)
4. Vernacular engine (Hindi and Telugu summaries)

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
- External tools: Gemini, NotebookLM, web source retrieval (Google News RSS with fallback retrieval path).
- CI: typecheck, lint, build on every push and PR.

## Success Metrics

- Lower manual review load
- Reduced time-to-approval
- Higher first-pass compliance rate
- Full traceability for enterprise audit requirements
