# AURIXA Backend Adapter

Minimal FastAPI adapter that emits the frontend state schema over polling and WebSocket.

## Endpoints

- GET /health
- GET /api/state
- WS /ws/state

## Setup

1. Copy `.env.example` to `.env` in this `backend/` folder.
2. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

3. Run server:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## Frontend Mapping

Set frontend env values in the project root `.env` file:

```dotenv
VITE_AURIXA_WS_URL=ws://127.0.0.1:8000/ws/state
VITE_AURIXA_POLL_URL=http://127.0.0.1:8000/api/state
```

## Gemini Token

Use one canonical variable name:

```dotenv
GEMINI_API_TOKEN=your_token_here
```

Keep this token in backend environment only.
