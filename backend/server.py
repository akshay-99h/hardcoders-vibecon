from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
import uuid
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Import services and agents
from config.settings import settings
from agents.problem_understanding_agent import ProblemUnderstandingAgent
from services.voice_service import VoiceService
from services.context_service import ContextService

# Helper function to serialize datetime objects
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, list):
            serialized[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        else:
            serialized[key] = value
    return serialized

# Initialize FastAPI app
app = FastAPI(title="Mission-Mode Platform API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
db = mongo_client.get_database()

# Initialize services
voice_service = VoiceService()
chat_agent = ProblemUnderstandingAgent()
context_service = ContextService()

# Load context files on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Loading knowledge base context files...")
    context_service.load_context_files()

# Pydantic Models
class ChatMessage(BaseModel):
    message: str
    conversationId: Optional[str] = None
    includeContext: Optional[bool] = True

class ChatResponse(BaseModel):
    message: str
    conversationId: str
    contextUsed: bool
    model: str
    tokensUsed: Optional[int] = None

# ============== AUTH ENDPOINTS ==============

@app.get("/api/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user from session token"""
    session_token = None
    
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return serialize_doc(user_doc)

@app.post("/api/auth/session")
async def create_session(request: Request):
    """Exchange session_id for session_token (Emergent OAuth callback)"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        data = response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data["name"],
                "picture": data.get("picture"),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.SESSION_EXPIRY_DAYS)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_data = serialize_doc(user_doc)
    
    response = JSONResponse(content=user_data)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=settings.SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return response

@app.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(None), request: Request = None):
    """Logout user"""
    session_token = None
    
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token")
    
    return response

# ============== CHAT ENDPOINTS ==============

@app.post("/api/chat")
async def chat(chat_message: ChatMessage, authorization: Optional[str] = Header(None), request: Request = None):
    """Send message to chat agent"""
    user = await get_current_user(authorization, request)
    
    # Get or create conversation
    conversation_id = chat_message.conversationId
    if not conversation_id:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        
        # Create new conversation
        conversation_doc = {
            "conversation_id": conversation_id,
            "user_id": user["user_id"],
            "title": chat_message.message[:50] + "..." if len(chat_message.message) > 50 else chat_message.message,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.conversations.insert_one(conversation_doc)
    
    # Save user message
    user_message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "role": "user",
        "content": chat_message.message,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.messages.insert_one(user_message_doc)
    
    # Get conversation history if needed
    conversation_context = ""
    if chat_message.includeContext:
        messages = []
        async for msg in db.messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(10):
            messages.append(msg)
        
        if len(messages) > 1:
            conversation_context = "\n".join([f"{m['role']}: {m['content']}" for m in messages[:-1]])
    
    # Get knowledge base context for the user's query
    knowledge_context = context_service.get_context_for_query(chat_message.message)
    
    # Get AI response
    try:
        result = await chat_agent.process({
            "user_input": chat_message.message,
            "previous_context": conversation_context,
            "knowledge_context": knowledge_context
        })
        
        # Handle different response types
        if "error" in result:
            assistant_message = result.get("message", "I apologize, but I encountered an error. Please try rephrasing your question.")
        elif "success" in result:
            # Use the helpful message from the LLM
            assistant_message = result.get("message", "I'm here to help! Please let me know what you need assistance with.")
        else:
            # Fallback
            assistant_message = "I'm here to help you with government services. What would you like to know?"
    
    except Exception as e:
        print(f"Chat error: {e}")
        assistant_message = "I apologize, but I'm having trouble processing your request. Could you please rephrase?"
    
    # Save assistant message
    assistant_message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": assistant_message,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.messages.insert_one(assistant_message_doc)
    
    # Update conversation
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return ChatResponse(
        message=assistant_message,
        conversationId=conversation_id,
        contextUsed=chat_message.includeContext,
        model=settings.PRIMARY_MODEL,
        tokensUsed=None
    )

@app.get("/api/conversations")
async def get_conversations(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all conversations for current user"""
    user = await get_current_user(authorization, request)
    
    conversations = []
    async for conv in db.conversations.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("updated_at", -1):
        conversations.append(serialize_doc(conv))
    
    return conversations

@app.get("/api/conversations/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get conversation history"""
    user = await get_current_user(authorization, request)
    
    # Verify conversation belongs to user
    conversation = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = []
    async for msg in db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1):
        messages.append(serialize_doc(msg))
    
    return {
        "messages": messages,
        "conversationId": conversation_id
    }

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Delete a conversation"""
    user = await get_current_user(authorization, request)
    
    # Delete conversation and messages
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": conversation_id})
    
    return {"success": True}

# ============== VOICE ENDPOINTS ==============

@app.post("/api/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = "en",
    authorization: Optional[str] = Header(None)
):
    """Transcribe audio to text"""
    try:
        audio_content = await audio.read()
        temp_path = f"/tmp/{uuid.uuid4().hex}.mp3"
        
        with open(temp_path, "wb") as f:
            f.write(audio_content)
        
        with open(temp_path, "rb") as audio_file:
            text = await voice_service.transcribe_audio(audio_file, language)
        
        os.remove(temp_path)
        
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/synthesize")
async def synthesize_speech(request: Request, authorization: Optional[str] = Header(None)):
    """Convert text to speech"""
    body = await request.json()
    text = body.get("text", "")
    language = body.get("language", "en")
    
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    
    try:
        audio_base64 = await voice_service.generate_speech_base64(text, language)
        return {"audio_base64": audio_base64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Mission-Mode Platform"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Mission-Mode Platform API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
