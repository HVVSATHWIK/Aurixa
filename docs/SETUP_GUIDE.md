# AURIXA Setup and User Guide

## 1. Quick Start (Local)

1. Install frontend dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

3. Create env files:

- Copy `.env.example` to `.env` at project root.
- Copy `backend/.env.example` to `backend/.env`.

4. Start backend:

```bash
npm run backend:dev
```

5. Start frontend:

```bash
npm run dev
```

6. Open the frontend URL shown by Vite.

## 2. First End-to-End Run

1. Open Operations.
2. Paste article URL or article text.
3. Click Run Live Analysis.
4. Wait for status to become LIVE INTELLIGENCE READY.
5. Click Generate Broadcast Audio.
6. Click Build 90s Brief (Web + AI).
7. Click Open Studio Player.

## 3. Audio Behavior (Important)

Audio generation now follows this order:

1. NotebookLM generation (primary path).
2. Local TTS generation from latest briefing script (edge-tts, then gTTS, then pyttsx3 fallback).
3. Optional static fallback URL (only if configured and local TTS fails).

This avoids unrelated demo audio in normal fallback scenarios.

## 4. Recommended Backend Env Values

Set these in `backend/.env`:

```dotenv
GEMINI_API_TOKEN=your_token
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_MODEL_CANDIDATES=gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash

AURIXA_AUDIO_OUTPUT_DIR=backend/generated_audio
AURIXA_AUDIO_BASE_URL=http://127.0.0.1:8000/generated-audio
AURIXA_AUDIO_LOCAL_TTS_ENABLED=true
AURIXA_EDGE_TTS_VOICE=en-US-AriaNeural
AURIXA_GTTS_LANG=en
AURIXA_AUDIO_FALLBACK_URL=

AURIXA_VIDEO_OUTPUT_DIR=backend/generated_video
AURIXA_VIDEO_BASE_URL=http://127.0.0.1:8000/generated-video
AURIXA_VIDEO_RENDER_FPS=8
```

NotebookLM options:

```dotenv
NOTEBOOKLM_AUTH_JSON=
AURIXA_NOTEBOOKLM_TIMEOUT_SECONDS=1200
AURIXA_NOTEBOOKLM_POLL_SECONDS=15
```

## 5. Troubleshooting

### Audio is irrelevant

- Make sure the article was analyzed first.
- Check that extraction briefing bullets look correct.
- Confirm the audio status message does not indicate static fallback.
- Verify local TTS fallback is enabled: `AURIXA_AUDIO_LOCAL_TTS_ENABLED=true`.

### Analysis text looks like website chrome or footer

- Retry once with pasted article text for critical demos.
- Keep URL inputs, but note extraction now prefers JSON-LD article fields and filters common boilerplate.

### Studio modal feels too large

- The modal is now height-capped with internal scrolling.
- If it still feels crowded, reduce browser zoom or source list volume by lowering `max_sources`.

### NotebookLM unavailable or rate-limited

- Run `notebooklm login` in your environment.
- Keep fallback enabled so local TTS can continue the demo path.

## 6. Demo-Safe Workflow

For live demos where network quality varies:

1. Start with pasted article text (fast and reliable).
2. Run one complete cycle (analysis -> audio -> video).
3. Then switch to URL-based runs.
4. Keep one validated article ready for fallback demo continuity.
