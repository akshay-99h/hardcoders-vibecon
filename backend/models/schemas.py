from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class MissionDomain(str, Enum):
    AADHAAR = "aadhaar"
    PAN = "pan"
    DRIVING_LICENSE = "driving_license"
    PASSPORT = "passport"

class MissionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    ESCALATED = "escalated"

class StepType(str, Enum):
    INFORM = "inform"
    COLLECT = "collect"
    SUBMIT = "submit"
    WAIT = "wait"
    DECISION = "decision"
    ESCALATE = "escalate"
    CLOSE = "close"

class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    preferred_language: str = "english"
    voice_enabled: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SourceCitation(BaseModel):
    url: str
    authority_tier: str  # "official_primary", "approved_institutional", "secondary"
    verified_at: datetime
    confidence: float  # 0.0 to 1.0
    freshness_days: int

class MissionStep(BaseModel):
    step_id: str
    sequence: int
    title: str
    description: str
    step_type: StepType
    dependencies: List[str] = []  # List of step_ids
    platform: str  # "online", "offline", "phone"
    sensitive_required: bool = False
    success_indicator: str
    estimated_time_minutes: int
    citations: List[SourceCitation] = []
    status: StepStatus = StepStatus.PENDING
    safety_warnings: List[str] = []
    common_mistakes: List[str] = []
    alternate_path: Optional[str] = None  # step_id for fallback
    
class Mission(BaseModel):
    mission_id: str
    user_id: str
    domain: MissionDomain
    title: str
    objective: str
    briefing: str
    state: str  # Indian state
    urgency: UrgencyLevel
    status: MissionStatus
    steps: List[MissionStep] = []
    current_step_index: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    estimated_completion_time: str = ""
    documents_required: List[str] = []
    escalation_contacts: List[Dict[str, str]] = []

class MissionRun(BaseModel):
    run_id: str
    mission_id: str
    user_id: str
    current_step_id: Optional[str] = None
    retries: int = 0
    branch_taken: str = "primary"
    eta: Optional[datetime] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class ConsentReceipt(BaseModel):
    consent_id: str
    user_id: str
    mission_id: str
    scope: str
    purpose: str
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

class ExecutionEvent(BaseModel):
    event_id: str
    mission_id: str
    step_id: str
    connector: str
    result: str  # "success", "failure", "retry"
    reference_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = {}

class EscalationCase(BaseModel):
    case_id: str
    mission_id: str
    user_id: str
    trigger_reason: str
    route: str  # "grievance", "helpline", "office_visit"
    expected_response_time: str
    status: str = "open"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class AuditLog(BaseModel):
    log_id: str
    actor: str  # user_id or "system"
    action: str
    mission_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = {}
    event_hash: str  # For immutability verification