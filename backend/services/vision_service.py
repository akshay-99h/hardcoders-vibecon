"""
Vision Service for OCR and Image Analysis using OpenAI Vision API
"""
import os
import base64
from typing import Optional, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from config.settings import settings
from dotenv import load_dotenv

load_dotenv()


class VisionService:
    """Service for analyzing images and performing OCR using OpenAI Vision API"""
    
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY", settings.EMERGENT_LLM_KEY)
        self.provider = "openai"
        self.model = "gpt-5.1"  # GPT-5.1 recommended for vision tasks
    
    async def analyze_legal_document(
        self, 
        image_base64: str, 
        user_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a legal document image and provide guidance
        
        Args:
            image_base64: Base64 encoded image string
            user_query: Optional user question about the document
            
        Returns:
            Dict with analysis results
        """
        try:
            # Create a new chat session for this analysis
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"vision_{os.urandom(8).hex()}",
                system_message="""You are an expert legal document analyzer for Indian legal and government notices.

Your role is to:
1. Extract and read ALL text from the document (OCR)
2. Identify the type of document (legal notice, summons, tax notice, etc.)
3. Explain what the document is about in simple terms
4. Identify key information: dates, amounts, deadlines, parties involved
5. Provide actionable guidance on how to respond
6. Reference relevant official portals or helplines if applicable

IMPORTANT:
- Explain in plain English (and Hindi if the document is in Hindi)
- Focus on practical steps the user should take
- If it's a legal notice, explain urgency and consequences
- Always recommend consulting a lawyer for complex legal matters"""
            )
            
            # Set the model to GPT-5.1 for vision
            chat.with_model(self.provider, self.model)
            
            # Create image content
            image_content = ImageContent(image_base64=image_base64)
            
            # Create the analysis prompt
            if user_query:
                prompt = f"""Please analyze this legal/government document image and answer the user's question: "{user_query}"

Provide:
1. Document Type & Summary
2. Key Information (dates, amounts, parties)
3. What This Means for the User
4. Recommended Actions
5. Important Deadlines (if any)
6. Where to Get Help"""
            else:
                prompt = """Please analyze this legal/government document image.

Provide:
1. Document Type & Summary
2. Key Information (dates, amounts, parties, reference numbers)
3. What This Means
4. Recommended Actions & Next Steps
5. Important Deadlines (if any)
6. Official Resources/Helplines"""
            
            # Create user message with image
            user_message = UserMessage(
                text=prompt,
                file_contents=[image_content]
            )
            
            # Get analysis
            response = await chat.send_message(user_message)
            
            return {
                "success": True,
                "analysis": response,
                "model_used": f"{self.provider}/{self.model}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to analyze the document. Please ensure the image is clear and try again."
            }
    
    async def extract_text_only(self, image_base64: str) -> Dict[str, Any]:
        """
        Extract text from image (OCR only, no analysis)
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            Dict with extracted text
        """
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"ocr_{os.urandom(8).hex()}",
                system_message="You are an OCR system. Extract all text from images accurately."
            )
            
            chat.with_model(self.provider, self.model)
            
            image_content = ImageContent(image_base64=image_base64)
            
            user_message = UserMessage(
                text="Please extract ALL text from this image. Return only the extracted text, exactly as it appears.",
                file_contents=[image_content]
            )
            
            response = await chat.send_message(user_message)
            
            return {
                "success": True,
                "extracted_text": response
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
