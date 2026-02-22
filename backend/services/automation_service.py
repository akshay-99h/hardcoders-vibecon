import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import WebSocket, WebSocketDisconnect


class AutomationService:
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def handle_connection(self, websocket: WebSocket, user_id: str):
        await websocket.accept()

        async with self._lock:
            existing = self._sessions.get(user_id, {})
            self._sessions[user_id] = {
                **existing,
                "user_id": user_id,
                "websocket": websocket,
                "extension_connected": True,
                "automation_state": existing.get("automation_state") or {"status": "idle"},
                "connected_at": self._now_iso(),
                "updated_at": self._now_iso(),
            }

        await websocket.send_json({
            "type": "connection_ack",
            "status": "connected",
            "user_id": user_id,
        })

        try:
            while True:
                raw_message = await websocket.receive_text()
                try:
                    payload = json.loads(raw_message)
                except json.JSONDecodeError:
                    continue
                await self._handle_extension_message(user_id, payload)
        except WebSocketDisconnect:
            pass
        finally:
            async with self._lock:
                session = self._sessions.get(user_id)
                if session and session.get("websocket") is websocket:
                    session["websocket"] = None
                    session["extension_connected"] = False
                    session["updated_at"] = self._now_iso()
                    self._sessions[user_id] = session

    async def _handle_extension_message(self, user_id: str, payload: Dict[str, Any]):
        message_type = str(payload.get("type", "")).lower()
        state_payload = payload.get("automation_state") or payload.get("state") or payload.get("status")

        async with self._lock:
            session = self._sessions.setdefault(
                user_id,
                {
                    "user_id": user_id,
                    "websocket": None,
                    "extension_connected": False,
                    "automation_state": {"status": "idle"},
                },
            )

            if message_type in {"automation_error", "error", "failed"}:
                error_message = payload.get("error") or payload.get("message") or "Automation failed"
                session["automation_state"] = {
                    "status": "error",
                    "error": error_message,
                }
                session["last_error"] = error_message
            elif message_type in {"automation_done", "completed", "done", "success"}:
                session["automation_state"] = {
                    "status": "done",
                    "result": payload.get("result"),
                }
            elif state_payload is not None:
                if isinstance(state_payload, dict):
                    session["automation_state"] = state_payload
                else:
                    session["automation_state"] = {"status": str(state_payload)}

            if "extension_connected" in payload:
                session["extension_connected"] = bool(payload.get("extension_connected"))

            session["updated_at"] = self._now_iso()
            self._sessions[user_id] = session

    async def start_automation(
        self,
        user_id: str,
        mission_id: str,
        mission_title: str,
        mission_description: str,
        portal_url: Optional[str],
        mission_steps: List[str],
    ):
        async with self._lock:
            session = self._sessions.get(user_id)
            websocket = session.get("websocket") if session else None

        if websocket is None:
            raise ValueError("Automation extension is not connected")

        command_payload = {
            "type": "start_automation",
            "mission_id": mission_id,
            "mission_title": mission_title,
            "mission_description": mission_description,
            "portal_url": portal_url,
            "mission_steps": mission_steps,
        }

        try:
            await websocket.send_json(command_payload)
        except Exception as exc:
            async with self._lock:
                failed_session = self._sessions.get(user_id, {})
                failed_session["websocket"] = None
                failed_session["extension_connected"] = False
                failed_session["automation_state"] = {
                    "status": "error",
                    "error": "Failed to deliver automation request to extension",
                }
                failed_session["updated_at"] = self._now_iso()
                self._sessions[user_id] = failed_session
            raise RuntimeError("Could not send automation request to extension") from exc

        async with self._lock:
            active_session = self._sessions.setdefault(
                user_id,
                {"user_id": user_id, "extension_connected": True},
            )
            active_session["automation_state"] = {
                "status": "running",
                "mission_id": mission_id,
                "mission_title": mission_title,
            }
            active_session["updated_at"] = self._now_iso()
            self._sessions[user_id] = active_session

        return {"started": True, "automation_state": {"status": "running"}}

    def get_session_by_user(self, user_id: str):
        session = self._sessions.get(user_id)
        if not session:
            return None

        return {key: value for key, value in session.items() if key != "websocket"}


automation_service = AutomationService()
