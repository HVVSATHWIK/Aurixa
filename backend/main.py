from __future__ import annotations

import asyncio
import os
from contextlib import suppress
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.orchestrator import LangGraphLikeOrchestrator, bootstrap_state

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
TICK_SECONDS = float(os.getenv("AURIXA_TICK_SECONDS", "2.0"))
MAX_AUDIT_LOGS = int(os.getenv("AURIXA_MAX_AUDIT_LOGS", "12"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,https://aurixa-46cc7.web.app",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="AURIXA Backend Adapter", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_state_lock = asyncio.Lock()
_state: dict[str, Any] = bootstrap_state()
_clients: set[WebSocket] = set()
_orchestrator = LangGraphLikeOrchestrator()
_tick_task: asyncio.Task[None] | None = None


async def broadcast_state(snapshot: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for client in list(_clients):
        try:
            await client.send_json({"state": snapshot})
        except Exception:
            dead.append(client)

    for client in dead:
        with suppress(Exception):
            await client.close()
        _clients.discard(client)


async def tick_loop() -> None:
    global _state

    while True:
        await asyncio.sleep(TICK_SECONDS)
        async with _state_lock:
            _state = _orchestrator.step(_state, max_items=MAX_AUDIT_LOGS)
            snapshot = _state

        await broadcast_state(snapshot)


@app.on_event("startup")
async def on_startup() -> None:
    global _tick_task
    if _tick_task is None:
        _tick_task = asyncio.create_task(tick_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _tick_task
    if _tick_task:
        _tick_task.cancel()
        with suppress(asyncio.CancelledError):
            await _tick_task
        _tick_task = None


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "port": PORT,
    }


@app.get("/api/state")
async def get_state() -> dict[str, Any]:
    async with _state_lock:
        return {"state": _state}


@app.websocket("/ws/state")
async def websocket_state(socket: WebSocket) -> None:
    await socket.accept()
    _clients.add(socket)

    async with _state_lock:
        await socket.send_json({"state": _state})

    try:
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        _clients.discard(socket)
    except Exception:
        _clients.discard(socket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
