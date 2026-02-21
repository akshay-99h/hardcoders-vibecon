from abc import ABC, abstractmethod
from services.llm_service import LLMService
from typing import Dict, Any

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, system_message: str):
        self.llm = LLMService(system_message=system_message)
    
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process input and return result"""
        pass
    
    async def _call_llm(self, message: str, context: str = "") -> str:
        """Call LLM with optional context"""
        if context:
            return await self.llm.send_with_context(message, context)
        return await self.llm.send_message(message)