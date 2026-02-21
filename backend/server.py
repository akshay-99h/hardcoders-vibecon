from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
import uuid
import aiofiles
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

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

# Import services and agents
from config.settings import settings
from models.schemas import (
    User, UserSession, Mission, MissionStep, MissionRun,
    MissionDomain, MissionStatus, UrgencyLevel
)
from agents.problem_understanding_agent import ProblemUnderstandingAgent
from agents.source_verification_agent import SourceVerificationAgent
from agents.workflow_builder_agent import WorkflowBuilderAgent
from agents.risk_compliance_agent import RiskComplianceAgent
from agents.language_voice_agent import LanguageVoiceAgent
from services.voice_service import VoiceService
from services.privacy_guard import PrivacyGuard
from tools.calculator_tools import CalculatorTools

# Initialize FastAPI app
app = FastAPI(title="Mission-Mode Platform API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configured for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
db = mongo_client.get_database()

# Initialize services
voice_service = VoiceService()
calculator = CalculatorTools()

# Initialize agents
problem_agent = ProblemUnderstandingAgent()
source_agent = SourceVerificationAgent()
workflow_agent = WorkflowBuilderAgent()
risk_agent = RiskComplianceAgent()
language_agent = LanguageVoiceAgent()

# ============== AUTH ENDPOINTS ==============

@app.get("/api/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None):
    """Get current user from session token"""
    # Try to get token from Authorization header first, then cookie
    session_token = None
    
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

@app.post("/api/auth/session")
async def create_session(request: Request):
    """Exchange session_id for session_token (Emergent OAuth callback)"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        data = response.json()
    
    # Create or update user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data["name"],
                "picture": data.get("picture"),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        # Create new user
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "preferred_language": "english",
            "voice_enabled": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.SESSION_EXPIRY_DAYS)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    # Return response with cookie
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Serialize datetime objects for JSON response
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

# ============== MISSION ENDPOINTS ==============

@app.post("/api/missions/understand")
async def understand_problem(request: Request):
    """Convert user input to mission intent"""
    body = await request.json()
    
    result = await problem_agent.process({
        "user_input": body.get("user_input", ""),
        "state": body.get("state", ""),
        "previous_context": body.get("previous_context", "")
    })
    
    return result

@app.post("/api/missions/create")
async def create_mission(request: Request, authorization: Optional[str] = Header(None)):
    """Create a new mission"""
    # Get user
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    
    # Step 1: Understand problem
    problem_result = await problem_agent.process({
        "user_input": body.get("user_input", ""),
        "state": body.get("state", ""),
        "previous_context": body.get("previous_context", "")
    })
    
    if "error" in problem_result:
        return problem_result
    
    # Step 2: Verify sources
    source_result = await source_agent.process({
        "domain": problem_result.get("domain", ""),
        "objective": problem_result.get("objective", ""),
        "state": problem_result.get("state", "")
    })
    
    # Step 3: Build workflow
    workflow_result = await workflow_agent.process({
        "domain": problem_result.get("domain", ""),
        "objective": problem_result.get("objective", ""),
        "state": problem_result.get("state", ""),
        "sources": [s["url"] for s in source_result.get("sources", [])]
    })
    
    # Step 4: Risk assessment
    risk_result = await risk_agent.process({
        "mission_steps": workflow_result.get("steps", []),
        "sources": source_result.get("sources", []),
        "user_input": body.get("user_input", ""),
        "context": ""
    })
    
    if not risk_result.get("allow_proceed", True):
        raise HTTPException(
            status_code=400,
            detail=f"Mission blocked for safety: {risk_result.get('recommendations', ['High risk detected'])[0]}"
        )
    
    # Create mission
    mission_id = f"mission_{uuid.uuid4().hex[:12]}"
    
    mission_doc = {
        "mission_id": mission_id,
        "user_id": user["user_id"],
        "domain": problem_result.get("domain", ""),
        "title": f"{problem_result.get('domain', '').replace('_', ' ').title()} - {problem_result.get('objective', '')}",
        "objective": problem_result.get("objective", ""),
        "briefing": f"Mission to help you with {problem_result.get('objective', '')}",
        "state": problem_result.get("state", ""),
        "urgency": problem_result.get("urgency", "medium"),
        "status": "planned",
        "steps": workflow_result.get("steps", []),
        "current_step_index": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "estimated_completion_time": workflow_result.get("estimated_completion_time", ""),
        "documents_required": [],
        "escalation_contacts": [],
        "risk_assessment": risk_result,
        "sources": source_result.get("sources", [])
    }
    
    await db.missions.insert_one(mission_doc)
    
    # Remove _id from response
    mission_doc.pop("_id", None)
    
    return mission_doc

@app.get("/api/missions")
async def get_missions(authorization: Optional[str] = Header(None), request: Request = None):
    """Get all missions for current user"""
    user = await get_current_user(authorization, request)
    
    missions = []
    async for mission_doc in db.missions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1):
        missions.append(mission_doc)
    
    return missions

@app.get("/api/missions/{mission_id}")
async def get_mission(mission_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    """Get specific mission"""
    user = await get_current_user(authorization, request)
    
    mission_doc = await db.missions.find_one(
        {"mission_id": mission_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not mission_doc:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    return mission_doc

@app.put("/api/missions/{mission_id}/step/{step_index}")
async def update_step_status(
    mission_id: str, 
    step_index: int, 
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Update status of a mission step"""
    user = await get_current_user(authorization, request)
    body = await request.json()
    
    mission_doc = await db.missions.find_one(
        {"mission_id": mission_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not mission_doc:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Update step status
    if step_index < len(mission_doc["steps"]):
        mission_doc["steps"][step_index]["status"] = body.get("status", "completed")
        
        await db.missions.update_one(
            {"mission_id": mission_id},
            {
                "$set": {
                    "steps": mission_doc["steps"],
                    "current_step_index": step_index + 1 if body.get("status") == "completed" else step_index,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
    
    return {"success": True}

# ============== VOICE ENDPOINTS ==============

@app.post("/api/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = "en",
    authorization: Optional[str] = Header(None)
):
    """Transcribe audio to text"""
    # Verify authentication
    # user = await get_current_user(authorization, None)
    
    try:
        # Read audio file
        audio_content = await audio.read()
        
        # Save temporarily
        temp_path = f"/tmp/{uuid.uuid4().hex}.mp3"
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(audio_content)
        
        # Transcribe
        with open(temp_path, "rb") as audio_file:
            text = await voice_service.transcribe_audio(audio_file, language)
        
        # Clean up
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

# ============== TOOL ENDPOINTS ==============

@app.post("/api/tools/emi-calculator")
async def calculate_emi(request: Request):
    """Calculate EMI"""
    body = await request.json()
    result = calculator.calculate_emi(
        principal=body.get("principal", 0),
        interest_rate=body.get("interest_rate", 0),
        tenure_months=body.get("tenure_months", 0)
    )
    return result

@app.post("/api/tools/fraud-check")
async def check_fraud(request: Request):
    """Check fraud probability"""
    body = await request.json()
    result = calculator.calculate_fraud_probability(body.get("indicators", {}))
    return result

# ============== LANGUAGE ENDPOINT ==============

@app.post("/api/language/translate")
async def translate_text(request: Request):
    """Translate text to target language"""
    body = await request.json()
    
    result = await language_agent.process({
        "text": body.get("text", ""),
        "target_language": body.get("target_language", "english"),
        "mode": body.get("mode", "text"),
        "simplify": body.get("simplify", False)
    })
    
    return result

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
