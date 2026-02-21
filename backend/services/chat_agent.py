"""
Chat Agent for RakshaAI
Handles user queries with context-aware responses
"""
from typing import Dict, Any
from services.llm_service import LLMService
from services.privacy_guard import PrivacyGuard


class ChatAgent:
    """Agent to convert user input (text/voice) into helpful guidance"""
    
    def __init__(self):
        system_message = """You are an AI assistant for HardCoders, helping users navigate legal and financial processes in India.

Your role is to:
1. Understand user questions about government services (Aadhaar, PAN card, driving license, etc.)
2. Provide clear, step-by-step guidance in plain English
3. Explain complex processes simply
4. Give actionable advice

IMPORTANT PRIVACY RULES:
- NEVER ask users to share Aadhaar numbers, PAN numbers, OTPs, passwords, or bank details with you
- If a step requires entering sensitive data, tell them to enter it ONLY on the official government portal
- Remind users to verify they're on official .gov.in websites

Be helpful, friendly, and concise. Focus on giving practical step-by-step instructions."""
        super().__init__(system_message)
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process user input and provide helpful guidance
        
        Args:
            input_data: {
                "user_input": "text from user",
                "previous_context": "optional conversation context",
                "knowledge_context": "optional knowledge base context",
                "document_context": "optional uploaded document analysis"
            }
        
        Returns:
            Response with guidance
        """
        user_input = input_data.get("user_input", "")
        previous_context = input_data.get("previous_context", "")
        knowledge_context = input_data.get("knowledge_context", "")
        document_context = input_data.get("document_context", "")
        
        # Check for sensitive content (actual data sharing attempts)
        is_sensitive, detected = PrivacyGuard.detect_sensitive_content(user_input)
        if is_sensitive:
            return {
                "error": "sensitive_data_detected",
                "message": "⚠️ Please don't share sensitive information like Aadhaar numbers, PAN numbers, OTPs, or passwords with me. I'll guide you to official portals where you can enter this securely.",
                "detected": detected
            }
        
        # Build prompt for helpful response
        prompt = ""
        
        # Add document context first if available (most important)
        if document_context:
            prompt += f"{document_context}\n\n"
            prompt += "IMPORTANT: The user has uploaded a document (analyzed above). Answer their questions based on this document analysis.\n\n"
        
        # Add knowledge base context (if available)
        if knowledge_context:
            prompt += f"{knowledge_context}\n\n"
        
        # Add conversation context (if available)
        if previous_context:
            prompt += f"Previous conversation:\n{previous_context}\n\n"
        
        # Add user's current question
        prompt += f"User question: {user_input}\n\n"
        
        # Add instructions based on available context
        if document_context:
            prompt += """Answer the user's question based on the document they uploaded. 
Be specific and reference details from the document analysis.
If they ask about deadlines, amounts, or actions to take, provide clear guidance based on the document."""
        elif knowledge_context:
            prompt += """Using the KNOWLEDGE BASE CONTEXT provided above, give a clear, accurate response with step-by-step guidance.
Reference the official portals, helplines, and procedures mentioned in the context.
Keep your response concise but complete, and ensure all information is factual and safe."""
        else:
            prompt += """Provide a clear, helpful response with step-by-step guidance if applicable.
If the user is asking about creating/renewing documents like Aadhaar or PAN, provide the specific steps.
Keep your response concise but complete."""
        
        try:
            response = await self._call_llm(prompt)
            
            # Return the helpful response
            return {
                "success": True,
                "message": response
            }
            
        except Exception as e:
            return {
                "error": "llm_error",
                "message": "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?",
                "details": str(e)
            }