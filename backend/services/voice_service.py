from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech
from config.settings import settings
import os
import uuid

class VoiceService:
    """Service for speech-to-text and text-to-speech"""
    
    def __init__(self):
        self.stt = OpenAISpeechToText(api_key=settings.EMERGENT_LLM_KEY)
        self.tts = OpenAITextToSpeech(api_key=settings.EMERGENT_LLM_KEY)
    
    async def transcribe_audio(self, audio_file, language: str = "en") -> str:
        """Convert audio to text"""
        try:
            response = await self.stt.transcribe(
                file=audio_file,
                model=settings.STT_MODEL,
                language=language,
                response_format="text"
            )
            return response.text
        except Exception as e:
            raise Exception(f"Speech-to-text failed: {str(e)}")
    
    async def generate_speech(self, text: str, language: str = "en") -> bytes:
        """Convert text to speech"""
        try:
            # Adjust voice based on language if needed
            voice = settings.TTS_VOICE
            
            audio_bytes = await self.tts.generate_speech(
                text=text,
                model=settings.TTS_MODEL,
                voice=voice
            )
            return audio_bytes
        except Exception as e:
            raise Exception(f"Text-to-speech failed: {str(e)}")
    
    async def generate_speech_base64(self, text: str, language: str = "en") -> str:
        """Convert text to speech and return as base64"""
        try:
            audio_base64 = await self.tts.generate_speech_base64(
                text=text,
                model=settings.TTS_MODEL,
                voice=settings.TTS_VOICE
            )
            return audio_base64
        except Exception as e:
            raise Exception(f"Text-to-speech (base64) failed: {str(e)}")