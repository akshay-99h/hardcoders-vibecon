import re
from typing import List, Tuple

class PrivacyGuard:
    """Privacy guard to detect and block sensitive information requests"""
    
    # Sensitive patterns that should never be requested by AI
    SENSITIVE_PATTERNS = [
        # Aadhaar patterns
        (r'\b\d{4}\s*\d{4}\s*\d{4}\b', "aadhaar_number"),
        (r'\b\d{12}\b', "aadhaar_number"),
        (r'aadhaar\s*number', "aadhaar_request"),
        (r'enter\s*aadhaar', "aadhaar_request"),
        
        # PAN patterns
        (r'\b[A-Z]{5}\d{4}[A-Z]\b', "pan_number"),
        (r'pan\s*number', "pan_request"),
        (r'enter\s*pan', "pan_request"),
        
        # OTP patterns
        (r'\b\d{4,6}\s*otp\b', "otp"),
        (r'enter\s*otp', "otp_request"),
        (r'provide\s*otp', "otp_request"),
        (r'share\s*otp', "otp_request"),
        
        # Password patterns
        (r'password', "password_request"),
        (r'enter\s*password', "password_request"),
        (r'provide\s*password', "password_request"),
        
        # Bank details
        (r'bank\s*account\s*number', "bank_account_request"),
        (r'ifsc\s*code', "bank_details_request"),
        (r'account\s*number', "account_request"),
        
        # Phone number patterns
        (r'\b\d{10}\b', "phone_number"),
        (r'mobile\s*number', "phone_request"),
        (r'phone\s*number', "phone_request"),
    ]
    
    # Sensitive keywords that indicate requests for sensitive data
    SENSITIVE_KEYWORDS = [
        "aadhaar", "aadhar", "pan card", "password", "otp",
        "bank account", "credit card", "debit card", "cvv",
        "pin", "secret", "private key"
    ]
    
    @staticmethod
    def detect_sensitive_content(text: str) -> Tuple[bool, List[str]]:
        """Detect if text contains sensitive information or requests"""
        text_lower = text.lower()
        detected = []
        
        # Check patterns
        for pattern, label in PrivacyGuard.SENSITIVE_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                detected.append(label)
        
        # Check keywords
        for keyword in PrivacyGuard.SENSITIVE_KEYWORDS:
            if keyword in text_lower:
                detected.append(keyword)
        
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