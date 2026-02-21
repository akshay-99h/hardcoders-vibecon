"""
Portal Adapter Interface
All adapters must implement this interface
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class AdapterInput:
    """Standardized input for adapters"""
    payload: Dict[str, Any]
    context: Dict[str, Any]
    resume_token: Optional[str] = None


@dataclass
class InterventionRequired:
    """Details when human intervention is needed"""
    action_type: str  # "click", "captcha", "confirm", "input"
    instruction: str
    target: Optional[Dict[str, Any]] = None  # selector, coordinates, etc.
    screenshots: Optional[Dict[str, str]] = None  # raw, annotated URLs
    resume_token: str = None


@dataclass
class AdapterResult:
    """Standardized output from adapters"""
    success: bool
    state: str  # completed, waiting_for_human, failed
    data: Optional[Dict[str, Any]] = None
    intervention: Optional[InterventionRequired] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    checked_at: Optional[datetime] = None


class PortalAdapter(ABC):
    """
    Base class for all portal adapters
    Each adapter implements logic for a specific portal/flow
    """
    
    @property
    @abstractmethod
    def adapter_key(self) -> str:
        """Unique identifier for this adapter"""
        pass
    
    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """What this adapter does"""
        pass
    
    @property
    @abstractmethod
    def required_fields(self) -> list[str]:
        """List of required input fields"""
        pass
    
    @property
    def domain_allowlist(self) -> list[str]:
        """Domains this adapter is allowed to access"""
        return []
    
    @abstractmethod
    def validate_input(self, payload: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate input payload
        Returns: (is_valid, error_message)
        """
        pass
    
    @abstractmethod
    async def run(self, adapter_input: AdapterInput) -> AdapterResult:
        """
        Execute the automation flow
        Must handle:
        - Navigation
        - Form filling
        - CAPTCHA detection (don't bypass, request intervention)
        - Result extraction
        - Error handling
        """
        pass
    
    def mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask sensitive fields for logging
        Override to customize for specific adapter
        """
        masked = data.copy()
        sensitive_keys = ['password', 'otp', 'pin', 'token']
        
        for key in masked:
            if any(s in key.lower() for s in sensitive_keys):
                masked[key] = '***MASKED***'
        
        return masked
