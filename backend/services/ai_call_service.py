"""
AI Call Service - Voice conversation with AI assistant
"""
from typing import Dict, Any
from services.voice_service import VoiceService
from services.chat_agent import ChatAgent
from services.context_service import ContextService
from config.settings import settings
from datetime import datetime, timezone
from io import BytesIO
import uuid

# MODULE-LEVEL (GLOBAL) storage - persists across ALL instances and requests
_GLOBAL_ACTIVE_CALLS: Dict[str, Dict[str, Any]] = {}


class AICallService:
    """Service for managing AI voice calls"""
    
    def __init__(self):
        self.voice_service = VoiceService()
        self.chat_agent = ChatAgent()
        self.context_service = ContextService()
    
    def create_call_session(self, user_id: str, conversation_id: str = None, language: str = "en") -> str:
        """Create a new AI call session"""
        call_id = f"call_{uuid.uuid4().hex[:12]}"
        
        _GLOBAL_ACTIVE_CALLS[call_id] = {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "language": language,
            "turn_count": 0,
            "context_loaded": False,
            "base_context": "",
            "document_context": "",
            "recent_turns": [],
            "created_at": datetime.now(timezone.utc)
        }
        
        print(f"✅ Created call session: {call_id} for user {user_id}")
        print(f"📋 Active sessions: {list(_GLOBAL_ACTIVE_CALLS.keys())}")
        
        return call_id
    
    def get_call_session(self, call_id: str) -> Dict[str, Any]:
        """Get call session info"""
        session = _GLOBAL_ACTIVE_CALLS.get(call_id)
        if session:
            print(f"✅ Found call session: {call_id}")
        else:
            print(f"❌ Call session not found: {call_id}")
            print(f"📋 Available sessions: {list(_GLOBAL_ACTIVE_CALLS.keys())}")
        return session
    
    def end_call_session(self, call_id: str):
        """End call session"""
        if call_id in _GLOBAL_ACTIVE_CALLS:
            del _GLOBAL_ACTIVE_CALLS[call_id]
            print(f"✅ Ended call session: {call_id}")

    def set_initial_context(self, call_id: str, base_context: str = "", document_context: str = ""):
        """Store DB-backed context once per call to avoid repeated DB reads each turn."""
        session = self.get_call_session(call_id)
        if not session:
            return
        session["base_context"] = base_context or ""
        session["document_context"] = document_context or ""
        session["context_loaded"] = True

    def append_turn_context(self, call_id: str, user_text: str, assistant_text: str, max_lines: int = 16):
        """Keep a small rolling context window for faster follow-up turns."""
        session = self.get_call_session(call_id)
        if not session:
            return

        recent_turns = session.setdefault("recent_turns", [])
        recent_turns.extend([
            f"user: {user_text}",
            f"assistant: {assistant_text}",
        ])
        if len(recent_turns) > max_lines:
            session["recent_turns"] = recent_turns[-max_lines:]
    
    async def process_audio_turn(
        self, 
        call_id: str, 
        audio_data: bytes,
        conversation_context: str = "",
        knowledge_context: str = "",
        document_context: str = "",
        include_audio: bool = True
    ) -> Dict[str, Any]:
        """
        Process one turn of conversation:
        1. Audio → Text (STT)
        2. Text → AI Response
        3. Response → Audio (TTS with emotion)
        
        Returns:
            {
                "transcribed_text": str,
                "response_text": str,
                "response_audio_base64": str,
                "language": str
            }
        """
        call_session = self.get_call_session(call_id)
        if not call_session:
            raise ValueError("Invalid call session")
        
        language = call_session["language"]

        if not audio_data or len(audio_data) < settings.VOICE_MIN_AUDIO_BYTES:
            return {
                "transcribed_text": "",
                "response_text": "",
                "language": language,
                "turn_number": call_session["turn_count"],
                "no_speech": True
            }
        
        # Step 1: Transcribe audio to text
        print(f"Processing audio turn for call {call_id}, audio size: {len(audio_data)} bytes")

        # Keep audio in-memory to avoid filesystem I/O per turn.
        audio_file = BytesIO(audio_data)
        audio_file.name = "voice.webm"

        try:
            print(f"Transcribing audio with language: {language}")
            transcribed_text = await self.voice_service.transcribe_audio(audio_file, language)
            transcribed_text = (transcribed_text or "").strip()
            print(f"Transcribed text: {transcribed_text}")
        except Exception as e:
            print(f"Transcription error: {e}")
            import traceback
            traceback.print_exc()
            raise

        if not transcribed_text:
            return {
                "transcribed_text": "",
                "response_text": "",
                "language": language,
                "turn_number": call_session["turn_count"],
                "no_speech": True
            }
        
        # Step 2: Get AI response
        ai_result = await self.chat_agent.process({
            "user_input": transcribed_text,
            "previous_context": conversation_context,
            "knowledge_context": knowledge_context,
            "document_context": document_context,
            "fast_mode": True
        })
        
        if "error" in ai_result:
            response_text = ai_result.get("message", "I apologize, but I encountered an error.")
        else:
            response_text = ai_result.get("message", "How can I help you?")
        
        response_audio = None
        if include_audio:
            # Step 3: Generate emotional audio response (optional for low-latency mode)
            response_audio = await self.voice_service.generate_speech_base64(response_text, language)
        
        # Increment turn count
        call_session["turn_count"] += 1
        
        payload = {
            "transcribed_text": transcribed_text,
            "response_text": response_text,
            "language": language,
            "turn_number": call_session["turn_count"]
        }
        if include_audio and response_audio:
            payload["response_audio_base64"] = response_audio
        return payload


# Global AI call service
ai_call_service = AICallService()
