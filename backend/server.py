from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Header, Response, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from typing import Literal
import asyncio
import os
import uuid
import base64
import inspect
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
from services.ai_call_service import ai_call_service
from services.pdf_generator import PDFGeneratorService
from services.billing_service import BillingService
from services.automation_service import automation_service
from services.email_service import EmailService

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
billing_service = BillingService(db)
email_service = EmailService()

# Load context files on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Loading knowledge base context files...")
    context_service.load_context_files()
    await db.grievances.create_index("grievance_id", unique=True)
    await db.grievances.create_index([("user_id", 1), ("created_at", -1)])
    await db.grievances.create_index([("status", 1), ("created_at", -1)])
    await db.login_audit_logs.create_index([("user_id", 1), ("created_at", -1)])

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
    machine_plan: Optional[Dict[str, Any]] = None


class CheckoutRequest(BaseModel):
    plan_key: str


class RoleUpdateRequest(BaseModel):
    role: str


class ManualSubscriptionUpdateRequest(BaseModel):
    plan_key: str
    subscription_status: str = "active"


class DemoRoleToggleRequest(BaseModel):
    is_admin: bool


class SeatUpdateRequest(BaseModel):
    seat_limit: int
    seat_used: Optional[int] = None


class ContactGrievanceRequest(BaseModel):
    topic: str
    message: str
    contact_name: str
    contact_email: str


class GrievanceStatusUpdateRequest(BaseModel):
    status: Literal["open", "in_review", "resolved", "closed"]
    admin_note: Optional[str] = ""


class AutomationStartRequest(BaseModel):
    mission_id: str
    mission_title: str
    mission_description: str
    portal_url: Optional[str] = None
    mission_steps: List[Any] = []
    machine_plan: Optional[Dict[str, Any]] = None


def _is_admin(user: Dict[str, Any]) -> bool:
    return user.get("role") in {"admin", "superadmin"}


def _require_admin(user: Dict[str, Any]):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _resolve_client_ip(request: Optional[Request]) -> str:
    if request is None:
        return "unknown"

    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _resolve_device_and_browser(user_agent: str) -> Dict[str, str]:
    ua = (user_agent or "").lower()

    if "ipad" in ua:
        device = "iPad"
    elif "iphone" in ua:
        device = "iPhone"
    elif "android" in ua and "mobile" in ua:
        device = "Android phone"
    elif "android" in ua:
        device = "Android tablet"
    elif "windows" in ua:
        device = "Windows desktop"
    elif "macintosh" in ua or "mac os x" in ua:
        device = "Mac desktop"
    elif "linux" in ua:
        device = "Linux desktop"
    else:
        device = "Unknown device"

    if "edg/" in ua:
        browser = "Microsoft Edge"
    elif "chrome/" in ua and "chromium" not in ua:
        browser = "Google Chrome"
    elif "safari/" in ua and "chrome/" not in ua:
        browser = "Safari"
    elif "firefox/" in ua:
        browser = "Mozilla Firefox"
    elif "opr/" in ua or "opera" in ua:
        browser = "Opera"
    else:
        browser = "Unknown browser"

    return {"device": device, "browser": browser}


async def _enforce_feature_limit(user_id: str, metric: str, units: int = 1):
    allowed, details = await billing_service.check_and_consume(user_id=user_id, metric=metric, units=units, consume=True)
    if not allowed:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "PLAN_LIMIT_EXCEEDED",
                "feature_key": metric,
                "current_usage": details.get("used", 0),
                "limit": details.get("limit", 0),
                "plan_key": details.get("plan_key", "free"),
                "upgrade_url": "/billing",
            },
        )


async def _resolve_maybe_awaitable(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


async def _get_user_by_session_token(session_token: str):
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

    if not user_doc.get("role"):
        user_doc["role"] = "user"
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {"role": "user", "updated_at": datetime.now(timezone.utc)}}
        )

    return serialize_doc(user_doc)


async def _get_optional_user(
    authorization: Optional[str] = None,
    request: Optional[Request] = None,
) -> Optional[Dict[str, Any]]:
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")

    if not session_token:
        return None

    try:
        return await _get_user_by_session_token(session_token)
    except HTTPException:
        return None

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

    return await _get_user_by_session_token(session_token)

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
        update_fields = {
            "name": data["name"],
            "picture": data.get("picture"),
            "updated_at": datetime.now(timezone.utc)
        }
        if not existing_user.get("role"):
            update_fields["role"] = "user"
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "role": "user",
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

    await billing_service.ensure_customer(user_data)

    # Audit login context and send security alert email (non-blocking, best effort)
    user_agent = request.headers.get("user-agent", "")
    client_ip = _resolve_client_ip(request)
    resolved = _resolve_device_and_browser(user_agent)
    login_context = {
        "ip": client_ip,
        "device": resolved["device"],
        "browser": resolved["browser"],
        "user_agent": user_agent or "Unknown",
        "time": datetime.now(timezone.utc).isoformat(),
    }

    await db.login_audit_logs.insert_one(
        {
            "user_id": user_id,
            "email": user_data.get("email"),
            "name": user_data.get("name"),
            **login_context,
            "created_at": datetime.now(timezone.utc),
        }
    )

    if email_service.enabled:
        asyncio.create_task(email_service.send_login_alert_email(user_data, login_context))
    
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


@app.post("/api/auth/demo-role")
async def toggle_demo_role(
    payload: DemoRoleToggleRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Demo-only endpoint: toggle current user between user/admin roles."""
    user = await get_current_user(authorization, request)
    next_role = "admin" if payload.is_admin else "user"
    now = datetime.now(timezone.utc)

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": next_role, "updated_at": now}},
    )
    await db.billing_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": next_role, "updated_at": now}},
    )

    return {"success": True, "user_id": user["user_id"], "role": next_role}


# ============== CONTACT / GRIEVANCE ENDPOINTS ==============

@app.post("/api/contact/grievances")
async def submit_contact_grievance(
    payload: ContactGrievanceRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    user = await _get_optional_user(authorization, request)

    topic = (payload.topic or "").strip()
    message = (payload.message or "").strip()
    contact_name = (payload.contact_name or "").strip()
    contact_email = (payload.contact_email or "").strip()

    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    if len(message) < 10:
        raise HTTPException(status_code=400, detail="Message is too short")
    if not contact_name:
        raise HTTPException(status_code=400, detail="Contact name is required")
    if "@" not in contact_email or "." not in contact_email:
        raise HTTPException(status_code=400, detail="Valid contact email is required")

    grievance_id = f"grv_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    client_ip = _resolve_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    resolved = _resolve_device_and_browser(user_agent)

    grievance_doc = {
        "grievance_id": grievance_id,
        "user_id": user.get("user_id") if user else None,
        "user_email": user.get("email") if user else contact_email,
        "user_name": user.get("name") if user else contact_name,
        "topic": topic[:120],
        "message": message[:4000],
        "contact_name": contact_name[:120],
        "contact_email": contact_email[:320],
        "status": "open",
        "admin_note": "",
        "source_ip": client_ip,
        "source_device": resolved["device"],
        "source_browser": resolved["browser"],
        "is_authenticated": bool(user),
        "user_agent": user_agent[:1000],
        "created_at": now,
        "updated_at": now,
    }

    await db.grievances.insert_one(grievance_doc)

    return {
        "success": True,
        "ticket_id": grievance_id,
        "status": "open",
        "created_at": now.isoformat(),
    }


@app.get("/api/contact/grievances")
async def list_my_grievances(
    limit: int = Query(default=30, ge=1, le=100),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    user = await get_current_user(authorization, request)
    grievances = []

    async for item in db.grievances.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit):
        grievances.append(serialize_doc(item))

    return {"grievances": grievances, "limit": limit}


# ============== BILLING ENDPOINTS ==============

@app.get("/api/billing/plans")
async def get_billing_plans():
    """Public plan catalog used by pricing UI"""
    return {
        "plans": billing_service.plan_catalog(),
        "currency": "INR",
        "interval": "month",
        "stripe": {
            "enabled": bool(settings.STRIPE_SECRET_KEY),
            "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        },
    }


@app.get("/api/billing/status")
async def get_billing_status(authorization: Optional[str] = Header(None), request: Request = None):
    """Current subscription and usage counters for logged-in user"""
    user = await get_current_user(authorization, request)
    await billing_service.ensure_customer(user)
    usage = await billing_service.get_usage_snapshot(user["user_id"])
    return {
        "user_id": user["user_id"],
        "role": user.get("role", "user"),
        "plan_key": usage["plan_key"],
        "subscription_status": usage["subscription_status"],
        "current_period_start": usage["current_period_start"],
        "current_period_end": usage["current_period_end"],
        "seat_limit": usage.get("seat_limit", 1),
        "seat_used": usage.get("seat_used", 1),
        "seats_remaining": usage.get("seats_remaining", 0),
        "metrics": usage["metrics"],
    }


@app.post("/api/billing/checkout-session")
async def create_checkout_session(
    payload: CheckoutRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Create Stripe test-mode checkout session"""
    user = await get_current_user(authorization, request)
    try:
        session = await billing_service.create_checkout_session(user=user, plan_key=payload.plan_key)
        return session
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/billing/payment-status")
async def get_checkout_payment_status(
    session_id: str = Query(..., min_length=5),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Poll Stripe Checkout Session status and sync local shadow subscription state."""
    user = await get_current_user(authorization, request)
    try:
        return await billing_service.sync_checkout_payment_status(
            user=user,
            checkout_session_id=session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/billing/customer-portal")
async def create_customer_portal_session(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Create Stripe billing portal session"""
    user = await get_current_user(authorization, request)
    try:
        portal = await billing_service.create_billing_portal_session(user=user)
        return portal
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook receiver (test mode + production compatible)"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        result = await billing_service.handle_webhook(payload=payload, signature=signature)
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ============== ADMIN ENDPOINTS ==============

@app.get("/api/admin/billing/overview")
async def admin_billing_overview(authorization: Optional[str] = Header(None), request: Request = None):
    user = await get_current_user(authorization, request)
    _require_admin(user)
    return await billing_service.admin_billing_overview()


@app.get("/api/admin/billing/events")
async def admin_billing_events(
    limit: int = Query(default=100, ge=1, le=500),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    user = await get_current_user(authorization, request)
    _require_admin(user)
    return await billing_service.admin_recent_events(limit=limit)


@app.get("/api/admin/subscriptions")
async def admin_subscriptions(
    limit: int = Query(default=200, ge=1, le=500),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    user = await get_current_user(authorization, request)
    _require_admin(user)
    return await billing_service.admin_subscriptions(limit=limit)


@app.get("/api/admin/seats")
async def admin_seats(
    limit: int = Query(default=200, ge=1, le=500),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    user = await get_current_user(authorization, request)
    _require_admin(user)
    return await billing_service.admin_seat_overview(limit=limit)


@app.get("/api/admin/users")
async def admin_list_users(
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    user = await get_current_user(authorization, request)
    _require_admin(user)

    results = []
    async for item in db.users.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit):
        profile = await db.billing_profiles.find_one(
            {"user_id": item["user_id"]},
            {"_id": 0, "plan_key": 1, "subscription_status": 1, "seat_limit": 1, "seat_used": 1},
        )
        item["role"] = item.get("role", "user")
        item["plan_key"] = profile.get("plan_key", "free") if profile else "free"
        item["subscription_status"] = profile.get("subscription_status", "inactive") if profile else "inactive"
        item["seat_limit"] = profile.get("seat_limit", 1) if profile else 1
        item["seat_used"] = profile.get("seat_used", 1) if profile else 1
        results.append(serialize_doc(item))

    total = await db.users.count_documents({})
    return {"users": results, "total": total, "limit": limit, "skip": skip}


@app.put("/api/admin/users/{user_id}/role")
async def admin_update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    actor = await get_current_user(authorization, request)
    _require_admin(actor)

    if payload.role not in {"user", "admin", "superadmin"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": payload.role, "updated_at": datetime.now(timezone.utc)}}
    )
    await db.admin_audit_logs.insert_one(
        {
            "actor_user_id": actor["user_id"],
            "target_user_id": user_id,
            "action": "update_role",
            "role": payload.role,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"success": True, "user_id": user_id, "role": payload.role}


@app.put("/api/admin/users/{user_id}/subscription")
async def admin_update_user_subscription(
    user_id: str,
    payload: ManualSubscriptionUpdateRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    actor = await get_current_user(authorization, request)
    _require_admin(actor)

    if payload.plan_key not in {"free", "plus", "pro", "business"}:
        raise HTTPException(status_code=400, detail="Invalid plan key")

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await billing_service.ensure_customer(target)
    await billing_service.sync_profile_plan_for_user(
        user_id=user_id,
        plan_key=payload.plan_key,
        subscription_status=payload.subscription_status,
    )
    await db.admin_audit_logs.insert_one(
        {
            "actor_user_id": actor["user_id"],
            "target_user_id": user_id,
            "action": "update_subscription",
            "plan_key": payload.plan_key,
            "subscription_status": payload.subscription_status,
            "created_at": datetime.now(timezone.utc),
        }
    )

    return {"success": True, "user_id": user_id, "plan_key": payload.plan_key, "subscription_status": payload.subscription_status}


@app.put("/api/admin/users/{user_id}/seats")
async def admin_update_user_seats(
    user_id: str,
    payload: SeatUpdateRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    actor = await get_current_user(authorization, request)
    _require_admin(actor)

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await billing_service.ensure_customer(target)
    try:
        seat_result = await billing_service.update_user_seats(
            user_id=user_id,
            seat_limit=payload.seat_limit,
            seat_used=payload.seat_used,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await db.admin_audit_logs.insert_one(
        {
            "actor_user_id": actor["user_id"],
            "target_user_id": user_id,
            "action": "update_seats",
            "seat_limit": seat_result["seat_limit"],
            "seat_used": seat_result["seat_used"],
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"success": True, **seat_result}


@app.get("/api/admin/grievances")
async def admin_list_grievances(
    limit: int = Query(default=200, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    actor = await get_current_user(authorization, request)
    _require_admin(actor)

    query: Dict[str, Any] = {}
    if status:
        query["status"] = status

    grievances = []
    async for item in db.grievances.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit):
        grievances.append(serialize_doc(item))

    total = await db.grievances.count_documents(query)
    return {
        "grievances": grievances,
        "total": total,
        "limit": limit,
        "skip": skip,
        "status": status,
    }


@app.put("/api/admin/grievances/{grievance_id}")
async def admin_update_grievance(
    grievance_id: str,
    payload: GrievanceStatusUpdateRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    actor = await get_current_user(authorization, request)
    _require_admin(actor)

    existing = await db.grievances.find_one({"grievance_id": grievance_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Grievance not found")

    now = datetime.now(timezone.utc)
    admin_note = (payload.admin_note or "").strip()[:2000]
    await db.grievances.update_one(
        {"grievance_id": grievance_id},
        {
            "$set": {
                "status": payload.status,
                "admin_note": admin_note,
                "updated_at": now,
                "last_updated_by": actor["user_id"],
            }
        },
    )

    await db.admin_audit_logs.insert_one(
        {
            "actor_user_id": actor["user_id"],
            "target_grievance_id": grievance_id,
            "action": "update_grievance_status",
            "status": payload.status,
            "created_at": now,
        }
    )

    return {
        "success": True,
        "grievance_id": grievance_id,
        "status": payload.status,
        "admin_note": admin_note,
        "updated_at": now.isoformat(),
    }

# ============== CHAT ENDPOINTS ==============

@app.post("/api/chat")
async def chat(chat_message: ChatMessage, authorization: Optional[str] = Header(None), request: Request = None):
    """Send message to chat agent"""
    user = await get_current_user(authorization, request)
    await _enforce_feature_limit(user["user_id"], "chat_messages", units=1)
    
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
    
    # Get AI response (human-readable)
    machine_plan = None
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
    
    # Generate machine plan for automation (separate LLM call, non-blocking for chat)
    try:
        machine_plan = await chat_agent.generate_machine_plan(
            user_input=chat_message.message,
            human_response=assistant_message,
            web_context=result.get("web_context", "") if isinstance(result, dict) else ""
        )
    except Exception as e:
        print(f"Machine plan generation error (non-fatal): {e}")
        machine_plan = None
    
    # Save assistant message
    assistant_message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": assistant_message,
        "timestamp": datetime.now(timezone.utc)
    }
    if machine_plan:
        assistant_message_doc["machine_plan"] = machine_plan
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
        tokensUsed=None,
        machine_plan=machine_plan
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

# ============== AUTOMATION ENDPOINTS ==============

@app.websocket("/ws/automation")
async def automation_websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """WebSocket endpoint used by browser extension for automation sessions."""
    if not token:
        await websocket.close(code=1008, reason="Not authenticated")
        return

    try:
        user = await _get_user_by_session_token(token)
    except HTTPException:
        await websocket.close(code=1008, reason="Invalid session")
        return

    try:
        await _resolve_maybe_awaitable(
            automation_service.handle_connection(websocket, user["user_id"])
        )
    except WebSocketDisconnect:
        return


@app.post("/api/automation/start")
async def start_automation(
    payload: AutomationStartRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Start mission automation through connected extension."""
    user = await get_current_user(authorization, request)

    try:
        result = await _resolve_maybe_awaitable(
            automation_service.start_automation(
                user_id=user["user_id"],
                mission_id=payload.mission_id,
                mission_title=payload.mission_title,
                mission_description=payload.mission_description,
                portal_url=payload.portal_url,
                mission_steps=payload.mission_steps,
                machine_plan=payload.machine_plan,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if isinstance(result, dict):
        return {"success": True, **result}
    return {"success": True, "result": result}


@app.get("/api/automation/status")
async def get_automation_status(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get extension connectivity and current automation state for current user."""
    user = await get_current_user(authorization, request)
    session = await _resolve_maybe_awaitable(
        automation_service.get_session_by_user(user["user_id"])
    )

    if not session:
        return {
            "extension_connected": False,
            "automation_state": None,
        }

    extension_connected = bool(
        session.get("extension_connected")
        or session.get("is_connected")
        or session.get("connected")
    )
    automation_state = session.get("automation_state") or session.get("state")

    return {
        "extension_connected": extension_connected,
        "automation_state": automation_state,
    }

# ============== EXTENSION POLLING ENDPOINTS ==============

@app.post("/api/automation/extension/register")
async def register_extension(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Register extension as connected (HTTP polling mode)."""
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await _get_user_by_session_token(session_token)
    result = await _resolve_maybe_awaitable(
        automation_service.register_extension(user["user_id"])
    )
    return result

@app.get("/api/automation/extension/poll")
async def poll_extension_commands(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Poll for pending commands from the backend (extension calls this every 2s)."""
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await _get_user_by_session_token(session_token)
    commands = await _resolve_maybe_awaitable(
        automation_service.poll_commands(user["user_id"])
    )
    return {"commands": commands}

@app.post("/api/automation/extension/message")
async def extension_push_message(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Extension sends messages (step results, human done, etc.) via HTTP POST."""
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    elif request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await _get_user_by_session_token(session_token)
    body = await request.json()
    result = await _resolve_maybe_awaitable(
        automation_service.push_message(user["user_id"], body)
    )
    return result

# ============== VOICE ENDPOINTS ==============

@app.post("/api/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = "en",
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Transcribe audio to text"""
    user = await get_current_user(authorization, request)
    await _enforce_feature_limit(user["user_id"], "stt_requests", units=1)
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
    await _enforce_feature_limit(user["user_id"], "document_analysis", units=1)
    
    # Check file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF"
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
            detail="Unsupported file type. Allowed: JPEG, PNG, WEBP"
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

# ============== AI CALL ENDPOINTS ==============

@app.post("/api/ai-call/start")
async def start_ai_call(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Start an AI voice call session"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    conversation_id = body.get("conversation_id")
    language = body.get("language", "en")

    # Create a conversation for voice calls if not provided so voice turns are persisted.
    if conversation_id:
        existing = await db.conversations.find_one(
            {"conversation_id": conversation_id, "user_id": user["user_id"]},
            {"_id": 0, "conversation_id": 1}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        conversation_doc = {
            "conversation_id": conversation_id,
            "user_id": user["user_id"],
            "title": "Voice conversation",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.conversations.insert_one(conversation_doc)
    
    # Create call session
    call_id = ai_call_service.create_call_session(
        user_id=user["user_id"],
        conversation_id=conversation_id,
        language=language
    )
    
    return {
        "call_id": call_id,
        "conversation_id": conversation_id,
        "language": language,
        "message": "Call session started"
    }


@app.post("/api/ai-call/turn")
async def process_call_turn(
    call_id: str = None,
    include_audio: bool = True,
    audio: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Process one turn of AI call conversation"""
    user = await get_current_user(authorization, request)
    await _enforce_feature_limit(user["user_id"], "stt_requests", units=1)
    
    if not call_id:
        raise HTTPException(status_code=400, detail="call_id required")
    
    # Verify call session
    call_session = ai_call_service.get_call_session(call_id)
    if not call_session:
        raise HTTPException(status_code=404, detail="Call session not found")
    
    if call_session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Read audio data
    audio_data = await audio.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio payload")
    if len(audio_data) > settings.VOICE_MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio payload too large")
    
    # Get conversation context if available (loaded once, then cached per session)
    conversation_id = call_session.get("conversation_id")
    knowledge_context = ""
    if conversation_id and not call_session.get("context_loaded"):
        messages = []
        async for msg in db.messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(12):
            messages.append(msg)

        base_context = ""
        document_context = ""
        if messages:
            regular_messages = []
            for m in messages:
                if m.get("is_document_context"):
                    document_context = m.get("content", "")
                else:
                    regular_messages.append(f"{m['role']}: {m['content']}")
            base_context = "\n".join(regular_messages)

        ai_call_service.set_initial_context(
            call_id=call_id,
            base_context=base_context,
            document_context=document_context
        )

    base_context = call_session.get("base_context", "")
    recent_turns = call_session.get("recent_turns", [])
    turn_context = "\n".join(recent_turns[-8:])
    conversation_context = "\n".join(part for part in [base_context, turn_context] if part).strip()
    document_context = call_session.get("document_context", "")
    
    try:
        # Process audio turn
        result = await ai_call_service.process_audio_turn(
            call_id=call_id,
            audio_data=audio_data,
            conversation_context=conversation_context,
            knowledge_context=knowledge_context,
            document_context=document_context,
            include_audio=include_audio
        )

        result["conversation_id"] = conversation_id
        if result.get("no_speech"):
            return result

        # Keep rolling in-memory context to avoid DB reads each turn.
        ai_call_service.append_turn_context(
            call_id=call_id,
            user_text=result["transcribed_text"],
            assistant_text=result["response_text"]
        )
        
        # Save messages to conversation if conversation_id exists
        if conversation_id:
            # Save user message
            user_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "conversation_id": conversation_id,
                "role": "user",
                "content": result["transcribed_text"],
                "timestamp": datetime.now(timezone.utc),
                "from_call": True
            }
            await db.messages.insert_one(user_msg)
            
            # Save assistant message
            assistant_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": result["response_text"],
                "timestamp": datetime.now(timezone.utc),
                "from_call": True
            }
            await db.messages.insert_one(assistant_msg)
            
            # Update conversation
            await db.conversations.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        
        return result
        
    except Exception as e:
        print(f"AI call turn error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-call/end")
async def end_ai_call(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """End AI voice call session"""
    user = await get_current_user(authorization, request)
    
    body = await request.json()
    call_id = body.get("call_id")
    
    if not call_id:
        raise HTTPException(status_code=400, detail="call_id required")
    
    # Verify and end session
    call_session = ai_call_service.get_call_session(call_id)
    if call_session and call_session["user_id"] == user["user_id"]:
        ai_call_service.end_call_session(call_id)
    
    return {"message": "Call ended"}


# ============================================================================
# DOCUMENT GENERATION ENDPOINTS
# ============================================================================

class DocumentGenerationRequest(BaseModel):
    document_type: str
    document_content: str
    user_name: Optional[str] = "Citizen"


@app.post("/api/generate-pdf")
async def generate_pdf(
    request: DocumentGenerationRequest,
    authorization: Optional[str] = Header(None),
    http_request: Request = None
):
    """
    Generate PDF from document content
    
    Request body:
    {
        "document_type": "RTI Application",
        "document_content": "Full document text...",
        "user_name": "User Name" (optional)
    }
    
    Returns: PDF file as download
    """
    try:
        user = await get_current_user(authorization, http_request)
        await _enforce_feature_limit(user["user_id"], "pdf_exports", units=1)

        # Generate PDF
        pdf_buffer = PDFGeneratorService.generate_document_pdf(
            document_type=request.document_type,
            document_content=request.document_content,
            user_name=request.user_name
        )
        
        # Create filename
        filename = f"{request.document_type.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Return as downloadable file
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        print(f"PDF generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.post("/api/generate-docx")
async def generate_docx(
    request: DocumentGenerationRequest,
    authorization: Optional[str] = Header(None),
    http_request: Request = None
):
    """
    Generate DOCX from document content

    Request body:
    {
        "document_type": "RTI Application",
        "document_content": "Full document text...",
        "user_name": "User Name" (optional)
    }

    Returns: DOCX file as download
    """
    try:
        user = await get_current_user(authorization, http_request)
        await _enforce_feature_limit(user["user_id"], "pdf_exports", units=1)

        docx_buffer = PDFGeneratorService.generate_document_docx(
            document_type=request.document_type,
            document_content=request.document_content,
            user_name=request.user_name
        )

        filename = f"{request.document_type.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"

        return StreamingResponse(
            docx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        print(f"DOCX generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
