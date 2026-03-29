# AURIXA - PS1 Enterprise Content Operations

AURIXA is a state-driven, autonomous multi-agent observability frontend for **Problem Statement 1: AI for Enterprise Content Operations**.

This frontend visualizes the full lifecycle of enterprise content processing:

1. Ingestion
2. Drafting
3. Compliance detection
4. Auto-correction by Editor
5. Re-validation loop (Compliance <-> Editor)
6. Approval

The UI is intentionally observational: no manual control buttons, only real-time telemetry, violations, pipeline state, and audit trail.

## Core Value Proposition

- Autonomous self-correction loop instead of manual intervention
- End-to-end auditability of agent decisions
- Compliance-first enterprise content workflow
- Real-time visibility for trust and governance

## Realtime State Integration

The frontend supports three stream modes via environment variables:

- `auto`: Try WebSocket first; fallback to polling
- `websocket`: Force WebSocket
- `polling`: Force HTTP polling

If neither endpoint is configured, AURIXA runs a built-in simulated stream so the dashboard still behaves in real time for demos.

Copy `.env.example` to `.env` and set your backend endpoints.

### Where to store endpoints

Store frontend endpoint values in [ .env ](.env):

- `VITE_AURIXA_WS_URL=ws://127.0.0.1:8000/ws/state`
- `VITE_AURIXA_POLL_URL=http://127.0.0.1:8000/api/state`
- `VITE_AURIXA_ANALYZE_URL=http://127.0.0.1:8000/api/analyze`
- `VITE_AURIXA_AUDIO_URL=http://127.0.0.1:8000/api/generate-audio`
- `VITE_AURIXA_AUDIO_JOB_BASE_URL=http://127.0.0.1:8000/api/audio-jobs`

For CI and production build pipelines, store endpoint values in GitHub repository secrets:

- `VITE_AURIXA_WS_URL`
- `VITE_AURIXA_POLL_URL`

Path in GitHub UI:
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret

## Live FastAPI + Gemini Adapter

Backend adapter files are in [backend/main.py](backend/main.py), [backend/orchestrator.py](backend/orchestrator.py), and [backend/schema.py](backend/schema.py).

Exposed endpoints:

- `GET /api/state`
- `WS /ws/state`
- `POST /api/analyze`
- `POST /api/generate-audio`
- `GET /api/audio-jobs/{job_id}`

`POST /api/generate-audio` is asynchronous and returns an immediate `job_id` (HTTP 202). Poll `GET /api/audio-jobs/{job_id}` until status is `completed` or `failed`.

Run locally:

```bash
npm run backend:setup
npm run backend:dev
```

Backend env values go in `backend/.env` (copy from [backend/.env.example](backend/.env.example)).

## Authentication and Access

The app now enforces sign-in before entering the observability deck.

- Email/password sign-in and sign-up are supported.
- Google sign-in is supported.
- Auth state is persisted through Firebase Auth.

### Firebase console checklist

1. Go to Firebase Console -> Authentication -> Sign-in method.
2. Enable `Email/Password` provider.
3. Enable `Google` provider.
4. Add your local and production domains in authorized domains.

## Environment Keys

Create a local `.env` file at project root (same level as `package.json`).

This repository already includes a local `.env` template setup for your Firebase project values.

Use these key names:

- `GEMINI_API_TOKEN` for backend/server agent calls
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Note: Environment variable names cannot contain spaces, so `gemini api token` is represented as `GEMINI_API_TOKEN`.

### Accepted Backend Payload Shapes

The frontend accepts any of these payloads from WebSocket or HTTP:

```json
{ "task_id": "REQ-8829-ET", "...": "..." }
```

```json
{ "state": { "task_id": "REQ-8829-ET", "...": "..." } }
```

```json
{ "payload": { "task_id": "REQ-8829-ET", "...": "..." } }
```

## Local Setup

```bash
npm install
npm run dev
```

Open the Vite URL printed in terminal.

## Quality Gates

```bash
npm run typecheck
npm run lint
npm run build
npm run check
```

`npm run check` runs typecheck + lint + build in sequence.

## Firebase Deployment

Firebase Hosting config is included in:

- `firebase.json`
- `.firebaserc`

Local deploy command:

```bash
npm run firebase:login
npm run firebase:deploy
```

GitHub deploy workflow:

- `.github/workflows/firebase-hosting.yml`

Add this GitHub repository secret for CI deploy:

- `FIREBASE_SERVICE_ACCOUNT_AURIXA_46CC7`

Also add these GitHub repository secrets for build-time frontend config:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_AURIXA_WS_URL` (optional)
- `VITE_AURIXA_POLL_URL` (optional)

This is the service account JSON value from Firebase project settings.

If this secret is missing, GitHub deploy job will fail at deploy step.

## CI

GitHub Actions workflow runs on every push and PR:

- typecheck
- lint
- build

Workflow file: `.github/workflows/ci.yml`

## API Keys / Secrets You May Need

### Frontend

- Frontend can run without AI API keys.
- Frontend needs Firebase web config values and stream endpoints (`VITE_AURIXA_WS_URL`, `VITE_AURIXA_POLL_URL`).
- Optional explicit API routes for controls: `VITE_AURIXA_ANALYZE_URL`, `VITE_AURIXA_AUDIO_URL`, `VITE_AURIXA_AUDIO_JOB_BASE_URL`.

### Backend (likely required)

Depending on your LangGraph/Python agents and model provider, backend may require one or more of:

- `GEMINI_API_TOKEN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`

Keep these keys only in backend/server environment, never in frontend Vite env vars.

## Submission Alignment (PS1)

AURIXA is scoped to one strong system depth:

- Not a chatbot
- Not a UI-only demo
- Not a multi-problem mashup

It demonstrates autonomous enterprise content operations with compliance-aware self-correction and transparency.
