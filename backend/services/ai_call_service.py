"""
AI Call Service - Voice conversation with AI assistant
"""
from typing import Dict, Any
from services.voice_service import VoiceService
from services.chat_agent import ChatAgent
from services.context_service import ContextService
import uuid


class AICallService:
    """Service for managing AI voice calls"""
    
    # Class-level storage for call sessions (persists across requests)
    _active_calls: Dict[str, Dict[str, Any]] = {}
    
    def __init__(self):
        self.voice_service = VoiceService()
        self.chat_agent = ChatAgent()
        self.context_service = ContextService()
    
    def create_call_session(self, user_id: str, conversation_id: str = None, language: str = "en") -> str:
        """Create a new AI call session"""
        call_id = f"call_{uuid.uuid4().hex[:12]}"
        
        self._active_calls[call_id] = {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "language": language,
            "turn_count": 0,
            "created_at": datetime.now(timezone.utc)
        }
        
        print(f"✅ Created call session: {call_id} for user {user_id}")
        print(f"📋 Active sessions: {list(self._active_calls.keys())}")
        
        return call_id
    
    def get_call_session(self, call_id: str) -> Dict[str, Any]:
        """Get call session info"""
        session = self._active_calls.get(call_id)
        if session:
            print(f"✅ Found call session: {call_id}")
        else:
            print(f"❌ Call session not found: {call_id}")
            print(f"📋 Available sessions: {list(self._active_calls.keys())}")
        return session
    
    def end_call_session(self, call_id: str):
        """End call session"""
        if call_id in self._active_calls:
            del self._active_calls[call_id]
            print(f"✅ Ended call session: {call_id}")
    
    async def process_audio_turn(
        self, 
        call_id: str, 
        audio_data: bytes,
        conversation_context: str = "",
        knowledge_context: str = "",
        document_context: str = ""
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
        
        # Step 1: Transcribe audio to text
        import tempfile
        import os
        
        print(f"Processing audio turn for call {call_id}, audio size: {len(audio_data)} bytes")
        
        # Save audio to temp file
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        temp_audio.write(audio_data)
        temp_audio.close()
        
        print(f"Saved audio to temp file: {temp_audio.name}")
        
        try:
            with open(temp_audio.name, "rb") as audio_file:
                print(f"Transcribing audio with language: {language}")
                transcribed_text = await self.voice_service.transcribe_audio(audio_file, language)
                print(f"Transcribed text: {transcribed_text}")
        except Exception as e:
            print(f"Transcription error: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            os.unlink(temp_audio.name)
        
        # Step 2: Get AI response
        ai_result = await self.chat_agent.process({
            "user_input": transcribed_text,
            "previous_context": conversation_context,
            "knowledge_context": knowledge_context,
            "document_context": document_context
        })
        
        if "error" in ai_result:
            response_text = ai_result.get("message", "I apologize, but I encountered an error.")
        else:
            response_text = ai_result.get("message", "How can I help you?")
        
        # Step 3: Generate emotional audio response
        # Use OpenAI TTS with emotional voice
        response_audio = await self.voice_service.generate_speech_base64(response_text, language)
        
        # Increment turn count
        call_session["turn_count"] += 1
        
        return {
            "transcribed_text": transcribed_text,
            "response_text": response_text,
            "response_audio_base64": response_audio,
            "language": language,
            "turn_number": call_session["turn_count"]
        }


# Global AI call service
ai_call_service = AICallService()
