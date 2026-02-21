from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Header, Response, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
import uuid
import base64
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Import services and agents
from config.settings import settings
from services.chat_agent import ChatAgent
from services.voice_service import VoiceService
from services.context_service import ContextService
from services.vision_service import VisionService
from services.call_service import call_service
from services.signaling_service import manager, handle_signaling_message

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
chat_agent = ChatAgent()
context_service = ContextService()
vision_service = VisionService()

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
    document_context = ""
    
    if chat_message.includeContext:
        messages = []
        async for msg in db.messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(20):
            messages.append(msg)
        
        if len(messages) > 1:
            # Separate document context from regular conversation
            regular_messages = []
            for m in messages[:-1]:  # Exclude current user message
                if m.get("is_document_context"):
                    # Extract document context for better AI understanding
                    document_context = m.get("content", "")
                else:
                    regular_messages.append(f"{m['role']}: {m['content']}")
            
            conversation_context = "\n".join(regular_messages)
    
    # Get knowledge base context for the user's query
    knowledge_context = context_service.get_context_for_query(chat_message.message)
    
    # Get AI response
    try:
        result = await chat_agent.process({
            "user_input": chat_message.message,
            "previous_context": conversation_context,
            "knowledge_context": knowledge_context,
            "document_context": document_context  # Pass document context if available
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

# ============== DOCUMENT ANALYSIS ENDPOINTS ==============

@app.post("/api/documents/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    query: Optional[str] = None,
    conversation_id: Optional[str] = None,
    store_document: bool = False,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Analyze a legal document image using OCR and AI"""
    user = await get_current_user(authorization, request)
    
    # Check file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF"
        )
    
    # Check file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    try:
        # Handle PDF files differently - convert to image
        if file.content_type == "application/pdf":
            from pdf2image import convert_from_bytes
            from PIL import Image
            import io
            
            # Convert PDF to images (first page only)
            images = convert_from_bytes(file_content, first_page=1, last_page=1)
            
            if not images:
                raise HTTPException(status_code=400, detail="Could not extract image from PDF")
            
            # Convert PIL Image to base64
            img = images[0]
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            image_base64 = base64.b64encode(img_byte_arr.read()).decode('utf-8')
        else:
            # For image files, directly convert to base64
            image_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Analyze the document
        result = await vision_service.analyze_legal_document(
            image_base64=image_base64,
            user_query=query
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("message", "Analysis failed"))
        
        # Get or create conversation for document context
        if not conversation_id:
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
            conversation_doc = {
                "conversation_id": conversation_id,
                "user_id": user["user_id"],
                "title": f"Document: {file.filename}",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.conversations.insert_one(conversation_doc)
        
        # Save document context message - allows follow-up questions
        document_context_msg = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "conversation_id": conversation_id,
            "role": "system",
            "content": f"[DOCUMENT CONTEXT - {file.filename}]\n\n{result['analysis']}",
            "timestamp": datetime.now(timezone.utc),
            "is_document_context": True,
            "document_filename": file.filename
        }
        await db.messages.insert_one(document_context_msg)
        
        # If user asked a question, save it and answer as messages
        if query:
            user_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "conversation_id": conversation_id,
                "role": "user",
                "content": f"📄 {file.filename}: {query}",
                "timestamp": datetime.now(timezone.utc)
            }
            await db.messages.insert_one(user_msg)
            
            assistant_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": result["analysis"],
                "timestamp": datetime.now(timezone.utc)
            }
            await db.messages.insert_one(assistant_msg)
        
        # Update conversation timestamp
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        
        # Optionally store document metadata (NOT the full file for privacy)
        document_id = None
        if store_document:
            doc_record = {
                "document_id": f"doc_{uuid.uuid4().hex[:12]}",
                "user_id": user["user_id"],
                "conversation_id": conversation_id,
                "filename": file.filename,
                "file_type": file.content_type,
                "file_size": len(file_content),
                "analysis_summary": result["analysis"][:500] + "..." if len(result["analysis"]) > 500 else result["analysis"],
                "query": query,
                "analyzed_at": datetime.now(timezone.utc)
            }
            await db.documents.insert_one(doc_record)
            document_id = doc_record["document_id"]
        
        return {
            "success": True,
            "analysis": result["analysis"],
            "model_used": result["model_used"],
            "conversation_id": conversation_id,
            "document_id": document_id,
            "stored": store_document
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Document analysis error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to analyze document: {str(e)}")

@app.post("/api/documents/ocr")
async def extract_text_from_document(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Extract text from document image (OCR only)"""
    user = await get_current_user(authorization, request)
    
    # Check file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: JPEG, PNG, WEBP"
        )
    
    try:
        file_content = await file.read()
        image_base64 = base64.b64encode(file_content).decode('utf-8')
        
        result = await vision_service.extract_text_only(image_base64)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail="OCR failed")
        
        return {
            "success": True,
            "text": result["extracted_text"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract text")

@app.get("/api/documents/history")
async def get_document_history(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get user's document analysis history"""
    user = await get_current_user(authorization, request)
    
    try:
        documents = []
        async for doc in db.documents.find(
            {"user_id": user["user_id"]},
            {"_id": 0}
        ).sort("analyzed_at", -1).limit(50):
            documents.append(serialize_doc(doc))
        
        return {
            "success": True,
            "documents": documents
        }
    except Exception as e:
        print(f"Error fetching document history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document history")

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Mission-Mode Platform"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Mission-Mode Platform API", "version": "1.0.0"}

# ============== CALL ENDPOINTS ==============

@app.post("/api/calls/token")
async def create_call_token(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Generate short-lived token for WebRTC call"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    room_id = body.get("room_id")
    
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id required")
    
    # Generate call token
    token = call_service.generate_call_token(user["user_id"], room_id)
    
    # Get ICE server configuration
    ice_servers = call_service.get_ice_servers()
    
    return {
        "token": token,
        "room_id": room_id,
        "ice_servers": ice_servers,
        "expires_in": call_service.token_ttl
    }


@app.get("/api/calls/{room_id}/status")
async def get_call_status(
    room_id: str,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get current status of a call room"""
    user = await get_current_user(authorization, request)
    
    room = call_service.get_room(room_id)
    participant_count = manager.get_participant_count(room_id)
    
    if not room:
        return {
            "room_id": room_id,
            "status": "not_found",
            "participant_count": participant_count,
            "is_full": False
        }
    
    return {
        "room_id": room_id,
        "status": "active" if participant_count > 0 else "empty",
        "participant_count": participant_count,
        "is_full": room.is_full(),
        "max_participants": room.max_participants
    }


@app.websocket("/ws/calls/{room_id}")
async def websocket_call_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...)
):
    """WebSocket endpoint for call signaling"""
    
    # Verify token
    payload = call_service.verify_call_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    user_id = payload.get("user_id")
    token_room_id = payload.get("room_id")
    
    # Verify room ID matches token
    if token_room_id != room_id:
        await websocket.close(code=4002, reason="Room ID mismatch")
        return
    
    # Get or create room
    room = call_service.get_or_create_room(room_id)
    
    # Check if room is full
    if room.is_full() and user_id not in room.participants:
        await websocket.close(code=4003, reason="Room is full")
        return
    
    # Add participant to room
    if not room.add_participant(user_id):
        await websocket.close(code=4003, reason="Room is full")
        return
    
    # Connect to WebSocket manager
    await manager.connect(room_id, user_id, websocket)
    
    print(f"User {user_id} joined call room {room_id}")
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            # Handle signaling message
            await handle_signaling_message(room_id, user_id, data, websocket)
    
    except WebSocketDisconnect:
        print(f"User {user_id} disconnected from call room {room_id}")
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        # Cleanup
        manager.disconnect(room_id, user_id)
        room.remove_participant(user_id)
        
        # Notify others
        await manager.broadcast_to_room(room_id, {
            "type": "user_left",
            "user_id": user_id
        })
        
        # Cleanup empty room
        call_service.cleanup_room(room_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
