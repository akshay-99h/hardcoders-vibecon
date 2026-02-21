from agents.base_agent import BaseAgent
from typing import Dict, Any
import json

class LanguageVoiceAgent(BaseAgent):
    """Agent for multilingual support and voice adaptation"""
    
    def __init__(self):
        system_message = """You are a Language & Voice Adaptation Agent for government services in India.

Your role is to:
1. Translate content between English, Hindi, and regional languages
2. Adapt voice commands and responses for multilingual users
3. Simplify language for low-literacy users
4. Maintain accuracy of official/legal terms

Language guidelines:
- Keep official terms in English when needed (e.g., "Aadhaar", "PAN")
- Use simple, clear sentences
- Avoid jargon unless necessary
- For Hindi: Use Devanagari script
- For voice: Use short, clear phrases

Supported languages:
- English
- Hindi (हिंदी)
- Regional languages (as needed)

Return JSON with:
{
  "translated_text": "translated content",
  "language": "target language",
  "voice_optimized": "voice-friendly version",
  "simplified": "simplified version for low-literacy"
}"""
        super().__init__(system_message)
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Translate and adapt content for language/voice
        
        Args:
            input_data: {
                "text": "text to translate",
                "target_language": "english|hindi|regional",
                "mode": "text|voice",
                "simplify": true|false
            }
        
        Returns:
            Translated and adapted content
        """
        text = input_data.get("text", "")
        target_language = input_data.get("target_language", "english")
        mode = input_data.get("mode", "text")
        simplify = input_data.get("simplify", False)
        
        # Build prompt
        prompt = f"""Translate and adapt this content:

Original text: {text}
Target language: {target_language}
Mode: {mode}
Simplify: {simplify}

Provide translation with voice-optimized and simplified versions. Return ONLY valid JSON."""
        
        try:
            response = await self._call_llm(prompt)
            
            # Extract JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response)
            return result
            
        except Exception as e:
            # Fallback: return original text
            return {
                "translated_text": text,
                "language": "english",
                "voice_optimized": text,
                "simplified": text
            }