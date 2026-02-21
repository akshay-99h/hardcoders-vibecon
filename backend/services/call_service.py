"""
WebRTC Call Service
Handles call token generation and room management
"""
import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set
from dotenv import load_dotenv

load_dotenv()


class CallRoom:
    """Represents an active call room"""
    
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.participants: Set[str] = set()
        self.created_at = datetime.now(timezone.utc)
        self.max_participants = 2
    
    def add_participant(self, user_id: str) -> bool:
        """Add participant if room not full"""
        if len(self.participants) >= self.max_participants:
            return False
        self.participants.add(user_id)
        return True
    
    def remove_participant(self, user_id: str):
        """Remove participant from room"""
        self.participants.discard(user_id)
    
    def is_full(self) -> bool:
        """Check if room is full"""
        return len(self.participants) >= self.max_participants
    
    def is_empty(self) -> bool:
        """Check if room is empty"""
        return len(self.participants) == 0


class CallService:
    """Service for managing WebRTC calls"""
    
    def __init__(self):
        self.token_secret = os.getenv("CALL_TOKEN_SECRET", "default-secret-change-me")
        self.token_ttl = int(os.getenv("CALL_TOKEN_TTL_SECONDS", "3600"))
        self.stun_urls = os.getenv("WEBRTC_STUN_URLS", "stun:stun.l.google.com:19302").split(",")
        self.turn_urls = os.getenv("WEBRTC_TURN_URLS", "").split(",") if os.getenv("WEBRTC_TURN_URLS") else []
        self.turn_username = os.getenv("WEBRTC_TURN_USERNAME", "")
        self.turn_credential = os.getenv("WEBRTC_TURN_CREDENTIAL", "")
        
        # Active rooms
        self.rooms: Dict[str, CallRoom] = {}
    
    def generate_call_token(self, user_id: str, room_id: str) -> str:
        """
        Generate a short-lived JWT token for call access
        
        Args:
            user_id: User identifier
            room_id: Room identifier
            
        Returns:
            JWT token string
        """
        payload = {
            "user_id": user_id,
            "room_id": room_id,
            "exp": datetime.now(timezone.utc) + timedelta(seconds=self.token_ttl),
            "iat": datetime.now(timezone.utc)
        }
        
        token = jwt.encode(payload, self.token_secret, algorithm="HS256")
        return token
    
    def verify_call_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode call token
        
        Returns:
            Decoded payload or None if invalid
        """
        try:
            payload = jwt.decode(token, self.token_secret, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def get_or_create_room(self, room_id: str) -> CallRoom:
        """Get existing room or create new one"""
        if room_id not in self.rooms:
            self.rooms[room_id] = CallRoom(room_id)
        return self.rooms[room_id]
    
    def get_room(self, room_id: str) -> Optional[CallRoom]:
        """Get room by ID"""
        return self.rooms.get(room_id)
    
    def cleanup_room(self, room_id: str):
        """Remove empty room"""
        room = self.rooms.get(room_id)
        if room and room.is_empty():
            del self.rooms[room_id]
    
    def get_ice_servers(self) -> list:
        """Get ICE server configuration"""
        ice_servers = []
        
        # Add STUN servers
        for stun_url in self.stun_urls:
            if stun_url.strip():
                ice_servers.append({"urls": stun_url.strip()})
        
        # Add TURN servers if configured
        if self.turn_urls and self.turn_username:
            for turn_url in self.turn_urls:
                if turn_url.strip():
                    ice_servers.append({
                        "urls": turn_url.strip(),
                        "username": self.turn_username,
                        "credential": self.turn_credential
                    })
        
        return ice_servers


# Global service instance
call_service = CallService()
