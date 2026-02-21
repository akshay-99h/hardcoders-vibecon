from emergentintegrations.llm.chat import LlmChat, UserMessage
from config.settings import settings
from typing import Optional
import uuid

class LLMService:
    """Model-agnostic LLM service for all AI agents"""
    
    def __init__(self, system_message: str, provider: Optional[str] = None, model: Optional[str] = None):
        self.provider = provider or settings.PRIMARY_PROVIDER
        self.model = model or settings.PRIMARY_MODEL
        self.system_message = system_message
        self.session_id = str(uuid.uuid4())
        
        # Initialize chat
        self.chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=self.session_id,
            system_message=self.system_message
        )
        
        # Set model
        self.chat.with_model(self.provider, self.model)
    
    async def send_message(self, message: str) -> str:
        """Send a message and get response"""
        user_message = UserMessage(text=message)
        response = await self.chat.send_message(user_message)
        return response
    
    async def send_with_context(self, message: str, context: str) -> str:
        """Send a message with additional context"""
        full_message = f"CONTEXT:\n{context}\n\nQUERY:\n{message}"
        return await self.send_message(full_message)
    
    def switch_model(self, provider: str, model: str):
        """Switch to a different model (for model routing)"""
        self.provider = provider
        self.model = model
        self.chat.with_model(provider, model)