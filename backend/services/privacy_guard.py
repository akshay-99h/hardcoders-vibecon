import re
from typing import List, Tuple

class PrivacyGuard:
    """Privacy guard to detect and block sensitive information requests"""
    
    # Sensitive patterns that should never be requested by AI
    SENSITIVE_PATTERNS = [
        # Aadhaar numbers only (12 digits) - BUT NOT enrollment IDs (14 digits)
        # Match 12 digits that are NOT part of a 14-digit enrollment ID
        (r'\b\d{4}\s*\d{4}\s*\d{4}(?!\d)\b', "aadhaar_number"),
        (r'\b(?<!\d)\d{12}(?!\d)\b', "aadhaar_number"),
        (r'(your|my|enter|provide|share|give|tell)\s+(aadhaar|aadhar)\s+number(?!\s*(is|:|=|\w{12}))', "aadhaar_number_request"),
        
        # PAN numbers only
        (r'\b[A-Z]{5}\d{4}[A-Z]\b', "pan_number"),
        (r'(your|my|enter|provide|share|give|tell)\s+pan\s+number', "pan_number_request"),
        
        # OTP patterns
        (r'\b\d{4,6}\s*otp\b', "otp"),
        (r'(enter|provide|share|give|tell)\s+otp', "otp_request"),
        (r'(your|my)\s+otp', "otp_request"),
        
        # Password patterns
        (r'(enter|provide|share|give|tell)\s+password', "password_request"),
        (r'(your|my)\s+password', "password_request"),
        
        # Bank details
        (r'(your|my|enter|provide|share)\s+(bank|account)\s+number', "bank_account_request"),
        (r'(enter|provide|share)\s+ifsc', "bank_details_request"),
        
        # CVV/PIN
        (r'(enter|provide|share|give|tell)\s+(cvv|pin)', "cvv_pin_request"),
    ]
    
    # Note: Removed general keywords like "aadhaar", "pan" etc. 
    # We only block if someone is asking to share/enter actual sensitive data
    
    @staticmethod
    def detect_sensitive_content(text: str) -> Tuple[bool, List[str]]:
        """Detect if text contains actual sensitive information or requests to share it"""
        text_lower = text.lower()
        detected = []
        
        # Check patterns for actual sensitive data requests
        for pattern, label in PrivacyGuard.SENSITIVE_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                detected.append(label)
        
        return len(detected) > 0, detected
    
    @staticmethod
    def sanitize_response(response: str) -> str:
        """Sanitize AI response to ensure no sensitive data requests"""
        is_sensitive, detected = PrivacyGuard.detect_sensitive_content(response)
        
        if is_sensitive:
            # Replace with safe message
            safe_message = (
                "⚠️ PRIVACY PROTECTION: This information should be entered directly on the official portal/app. "
                "Never share Aadhaar, PAN, OTP, passwords, or bank details with AI assistants. "
                "I'll guide you to the official screen where you can enter this securely."
            )
            return safe_message
        
        return response
    
    @staticmethod
    def add_safety_warnings(step_description: str, sensitive_required: bool) -> str:
        """Add safety warnings to step descriptions"""
        if sensitive_required:
            warning = (
                "\n\n⚠️ SAFETY REMINDER:\n"
                "• Enter sensitive information ONLY on official government portals\n"
                "• Never share OTP or screenshots with anyone\n"
                "• Verify the URL shows .gov.in domain\n"
                "• Beware of fake websites and phishing attempts"
            )
            return step_description + warning
        return step_description