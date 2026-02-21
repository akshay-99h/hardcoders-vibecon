from agents.base_agent import BaseAgent
from services.privacy_guard import PrivacyGuard
from models.schemas import MissionDomain, UrgencyLevel
from typing import Dict, Any
import json

class ProblemUnderstandingAgent(BaseAgent):
    """Agent to convert user input (text/voice) into canonical mission intent"""
    
    def __init__(self):
        system_message = """You are a Problem Understanding Agent for a government services navigation platform in India.
        
Your role is to:
1. Understand user problems/requests related to government services
2. Extract key information: mission domain, state, urgency, specific objective
3. Clarify ambiguities with focused questions
4. Convert to structured mission intent

Mission domains: Aadhaar services, PAN card services, Driving license services

IMPORTANT PRIVACY RULES:
- NEVER ask for Aadhaar number, PAN number, OTP, passwords, or bank details
- If user mentions sensitive data, acknowledge but don't store or process it
- Guide users to enter sensitive data only on official portals

Output should be a JSON with:
{
  "domain": "aadhaar|pan|driving_license",
  "objective": "clear description",
  "state": "Indian state name",
  "urgency": "low|medium|high|urgent",
  "clarification_needed": true|false,
  "clarification_question": "question if needed"
}

Be concise and helpful."""
        super().__init__(system_message)
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process user input and extract mission intent
        
        Args:
            input_data: {
                "user_input": "text from user",
                "state": "optional state info",
                "previous_context": "optional conversation context"
            }
        
        Returns:
            Structured mission intent
        """
        user_input = input_data.get("user_input", "")
        state = input_data.get("state", "")
        previous_context = input_data.get("previous_context", "")
        
        # Check for sensitive content
        is_sensitive, detected = PrivacyGuard.detect_sensitive_content(user_input)
        if is_sensitive:
            return {
                "error": "sensitive_data_detected",
                "message": "⚠️ Please don't share sensitive information like Aadhaar, PAN, OTP, or passwords. I'll guide you to official portals where you can enter this securely.",
                "detected": detected
            }
        
        # Build prompt
        prompt = f"""User request: {user_input}
        
{f'State: {state}' if state else ''}
{f'Previous context: {previous_context}' if previous_context else ''}

Analyze this request and extract mission intent. Return ONLY valid JSON."""
        
        try:
            response = await self._call_llm(prompt)
            
            # Sanitize response
            response = PrivacyGuard.sanitize_response(response)
            
            # Parse JSON
            # Extract JSON from response if it's wrapped in markdown
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            mission_intent = json.loads(response)
            return mission_intent
            
        except json.JSONDecodeError:
            # If LLM didn't return valid JSON, return error
            return {
                "error": "parsing_failed",
                "message": "I need more information to understand your request. Could you please be more specific about which government service you need help with?",
                "raw_response": response
            }