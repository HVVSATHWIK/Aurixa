# AURIXA Backend Adapter

FastAPI backend for live article intelligence extraction and streaming dashboard state updates.

## Endpoints

- GET /health
- GET /api/state
- POST /api/analyze
- POST /api/generate-audio
- GET /api/audio-jobs/{job_id}
- POST /api/generate-video-brief
- GET /api/video-jobs/{job_id}
- POST /api/navigator-question
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
	"article_url": "https://www.reuters.com/..."
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

- If NotebookLM returns RPC overload/rate-limit errors, backend first attempts local TTS
	generation from the latest briefing script (edge-tts, then gTTS, then pyttsx3), so audio remains story-relevant.
- If local TTS fails and `AURIXA_AUDIO_FALLBACK_URL` is configured, backend serves that fallback URL.

Generated local audio artifacts are served from `/generated-audio/{job_id}.wav`.

Auth requirement:

- Run `notebooklm login` once (local dev), or inject `NOTEBOOKLM_AUTH_JSON` in container runtime.

## What /api/navigator-question Does

Accepts a follow-up question against the current live intelligence state and returns a concise answer plus 3 suggested next questions.

Example request:

```json
{
	"question": "What should a retail investor watch over the next quarter?"
}
```

## What /api/generate-video-brief Does

Builds a newsroom video storyboard package with:

- AI-generated scenes and narration
- optional web-search sources (DuckDuckGo HTML results)
- provider metadata for transparency (`GEMINI` or `HEURISTIC`)
- optional real MP4 rendering (`render_video=true`)

Example request:

```json
{
	"duration_seconds": 90,
	"focus_topic": "Reliance Industries outlook",
	"include_web_search": true,
	"max_sources": 5,
	"render_video": true
}
```

Response includes `title`, `subtitle`, `narration_script`, `scenes`, `sources`, provider diagnostics, and when enabled:

- `video_job_id`
- `video_status` (`queued`, `running`, `completed`, `failed`)
- `video_url` (available on completion)

Poll `GET /api/video-jobs/{job_id}` until status becomes `completed`, then play/download `video_url`.

## Setup

1. Copy `.env.example` to `.env` in `backend/`.
2. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

3. Set Gemini token and model:

```dotenv
GEMINI_API_TOKEN=your_token_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_MODEL_CANDIDATES=gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash
```

`GET /health` returns the active model in `gemini_model`.

4. (Recommended) Configure NotebookLM runtime env:

```dotenv
NOTEBOOKLM_AUTH_JSON=...
AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS=1200
AURIXA_NOTEBOOKLM_POLL_SECONDS=15
AURIXA_AUDIO_BASE_URL=http://127.0.0.1:8000/generated-audio
AURIXA_AUDIO_LOCAL_TTS_ENABLED=true
AURIXA_EDGE_TTS_VOICE=en-US-AriaNeural
AURIXA_GTTS_LANG=en
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
VITE_AURIXA_VIDEO_BRIEF_URL=http://127.0.0.1:8000/api/generate-video-brief
VITE_AURIXA_VIDEO_JOB_BASE_URL=http://127.0.0.1:8000/api/video-jobs
```
