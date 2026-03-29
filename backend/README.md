# AURIXA Backend Adapter

FastAPI backend for live article intelligence extraction and streaming dashboard state updates.

## Endpoints

- GET /health
- GET /api/state
- POST /api/analyze
- POST /api/generate-audio
- GET /api/audio-jobs/{job_id}
- WS /ws/state

## What /api/analyze Does

`POST /api/analyze` accepts either:

- `article_url`
- `article_text`

The backend runs an on-demand live agent pipeline:

1. Ingestion
2. Drafting (Gemini extraction)
3. Compliance/entity scoring
4. Approval

Each stage updates and broadcasts the canonical state to websocket clients and polling consumers.

Live intelligence payload includes:

- 3-bullet briefing
- extracted entities
- sentiment label
- Hindi summary
- Telugu summary
- confidence and risk scores

Expected request shape:

```json
{
	"article_url": "https://economictimes.indiatimes.com/..."
}
```

or

```json
{
	"article_text": "Full article text..."
}
```

## What /api/generate-audio Does

Creates an async job for NotebookLM audio generation using `notebooklm-py`.

- `POST /api/generate-audio` starts a job and returns HTTP 202 with `job_id`.
- `GET /api/audio-jobs/{job_id}` returns job status.

The backend runs `NotebookLMClient` asynchronously and polls until the `.mp3` artifact is ready.

Demo failsafe:

- If NotebookLM returns RPC overload/rate-limit errors and `AURIXA_AUDIO_FALLBACK_URL` is configured,
  backend serves that fallback URL seamlessly so demo flow does not break.

Auth requirement:

- Run `notebooklm login` once (local dev), or inject `NOTEBOOKLM_AUTH_JSON` in container runtime.

## Setup

1. Copy `.env.example` to `.env` in `backend/`.
2. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

3. Set Gemini token:

```dotenv
GEMINI_API_TOKEN=your_token_here
```

4. (Recommended) Configure NotebookLM runtime env:

```dotenv
NOTEBOOKLM_AUTH_JSON=...
AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS=1200
AURIXA_NOTEBOOKLM_POLL_SECONDS=15
AURIXA_AUDIO_FALLBACK_URL=https://your-cdn.example.com/fallback-demo.mp3
```

5. Run server:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## Frontend Mapping

Set frontend env values in the project root `.env`:

```dotenv
VITE_AURIXA_WS_URL=ws://127.0.0.1:8000/ws/state
VITE_AURIXA_POLL_URL=http://127.0.0.1:8000/api/state
VITE_AURIXA_ANALYZE_URL=http://127.0.0.1:8000/api/analyze
VITE_AURIXA_AUDIO_URL=http://127.0.0.1:8000/api/generate-audio
VITE_AURIXA_AUDIO_JOB_BASE_URL=http://127.0.0.1:8000/api/audio-jobs
```
