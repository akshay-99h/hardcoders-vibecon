"""
WebSocket Signaling Server for WebRTC Calls
Handles signaling between peers
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from datetime import datetime, timezone


class ConnectionManager:
    """Manages WebSocket connections for call rooms"""
    
    def __init__(self):
        # room_id -> {user_id -> websocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
    
    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        """Connect user to room"""
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        
        self.active_connections[room_id][user_id] = websocket
        
        # Start heartbeat
        task_key = f"{room_id}:{user_id}"
        self.heartbeat_tasks[task_key] = asyncio.create_task(
            self._heartbeat(room_id, user_id, websocket)
        )
    
    def disconnect(self, room_id: str, user_id: str):
        """Disconnect user from room"""
        task_key = f"{room_id}:{user_id}"
        
        # Cancel heartbeat
        if task_key in self.heartbeat_tasks:
            self.heartbeat_tasks[task_key].cancel()
            del self.heartbeat_tasks[task_key]
        
        # Remove connection
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                del self.active_connections[room_id][user_id]
            
            # Clean up empty rooms
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
    
    async def send_to_user(self, room_id: str, user_id: str, message: dict):
        """Send message to specific user"""
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                try:
                    await self.active_connections[room_id][user_id].send_json(message)
                except Exception as e:
                    print(f"Error sending to {user_id}: {e}")
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all users in room except sender"""
        if room_id in self.active_connections:
            for user_id, websocket in self.active_connections[room_id].items():
                if user_id != exclude_user:
                    try:
                        await websocket.send_json(message)
                    except Exception as e:
                        print(f"Error broadcasting to {user_id}: {e}")
    
    def get_room_participants(self, room_id: str) -> Set[str]:
        """Get list of participants in room"""
        if room_id in self.active_connections:
            return set(self.active_connections[room_id].keys())
        return set()
    
    def get_participant_count(self, room_id: str) -> int:
        """Get number of participants in room"""
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0
    
    async def _heartbeat(self, room_id: str, user_id: str, websocket: WebSocket):
        """Send periodic heartbeat to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # 30 second heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Heartbeat error for {user_id}: {e}")


# Global connection manager
manager = ConnectionManager()


async def handle_signaling_message(
    room_id: str,
    user_id: str,
    message: dict,
    websocket: WebSocket
):
    """
    Handle incoming signaling messages
    
    Message types:
    - join: User joins room
    - offer: SDP offer from caller
    - answer: SDP answer from callee
    - ice_candidate: ICE candidate exchange
    - leave: User leaves room
    """
    msg_type = message.get("type")
    
    try:
        if msg_type == "join":
            # Notify other participants
            participants = manager.get_room_participants(room_id)
            other_participants = [p for p in participants if p != user_id]
            
            # Send current participants to new joiner
            await manager.send_to_user(room_id, user_id, {
                "type": "participants",
                "participants": other_participants
            })
            
            # Notify others about new participant
            await manager.broadcast_to_room(room_id, {
                "type": "user_joined",
                "user_id": user_id
            }, exclude_user=user_id)
        
        elif msg_type == "offer":
            # Forward SDP offer to target user
            target_user = message.get("target_user_id")
            if target_user:
                await manager.send_to_user(room_id, target_user, {
                    "type": "offer",
                    "from_user_id": user_id,
                    "sdp": message.get("sdp")
                })
        
        elif msg_type == "answer":
            # Forward SDP answer to target user
            target_user = message.get("target_user_id")
            if target_user:
                await manager.send_to_user(room_id, target_user, {
                    "type": "answer",
                    "from_user_id": user_id,
                    "sdp": message.get("sdp")
                })
        
        elif msg_type == "ice_candidate":
            # Forward ICE candidate to target user
            target_user = message.get("target_user_id")
            if target_user:
                await manager.send_to_user(room_id, target_user, {
                    "type": "ice_candidate",
                    "from_user_id": user_id,
                    "candidate": message.get("candidate")
                })
        
        elif msg_type == "leave":
            # Notify others about user leaving
            await manager.broadcast_to_room(room_id, {
                "type": "user_left",
                "user_id": user_id
            }, exclude_user=user_id)
    
    except Exception as e:
        print(f"Error handling signaling message: {e}")
        await manager.send_to_user(room_id, user_id, {
            "type": "error",
            "message": "Failed to process signaling message"
        })
