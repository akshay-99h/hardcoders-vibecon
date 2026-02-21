from typing import List, Dict
import re
from urllib.parse import urlparse
from config.settings import settings
from models.schemas import SourceCitation
from datetime import datetime, timedelta

class SourceVerificationService:
    """Service to verify and rank official sources"""
    
    @staticmethod
    def is_official_domain(url: str) -> bool:
        """Check if URL is from an official government domain"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Check against official domains list
            for official_domain in settings.OFFICIAL_DOMAINS:
                if domain.endswith(official_domain):
                    return True
            
            # Additional check for .gov.in domains
            if domain.endswith(".gov.in"):
                return True
            
            return False
        except:
            return False
    
    @staticmethod
    def calculate_authority_tier(url: str) -> str:
        """Calculate authority tier of source"""
        if SourceVerificationService.is_official_domain(url):
            return "official_primary"
        
        # Check for approved institutional sources
        trusted_institutions = [
            "mygov.in", "digitalindia.gov.in", "india.gov.in"
        ]
        
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        for institution in trusted_institutions:
            if domain.endswith(institution):
                return "approved_institutional"
        
        return "secondary"
    
    @staticmethod
    def calculate_confidence(url: str, freshness_days: int) -> float:
        """Calculate confidence score based on authority and freshness"""
        confidence = 0.5  # Base confidence
        
        # Authority boost
        tier = SourceVerificationService.calculate_authority_tier(url)
        if tier == "official_primary":
            confidence += 0.4
        elif tier == "approved_institutional":
            confidence += 0.25
        
        # Freshness boost/penalty
        if freshness_days <= 30:
            confidence += 0.1
        elif freshness_days <= 90:
            confidence += 0.05
        elif freshness_days > 365:
            confidence -= 0.1
        
        return min(1.0, max(0.0, confidence))
    
    @staticmethod
    def create_citation(url: str, freshness_days: int = 0) -> SourceCitation:
        """Create a source citation with verification data"""
        authority_tier = SourceVerificationService.calculate_authority_tier(url)
        confidence = SourceVerificationService.calculate_confidence(url, freshness_days)
        
        return SourceCitation(
            url=url,
            authority_tier=authority_tier,
            verified_at=datetime.utcnow(),
            confidence=confidence,
            freshness_days=freshness_days
        )
    
    @staticmethod
    def rank_sources(sources: List[str]) -> List[SourceCitation]:
        """Rank and verify multiple sources"""
        citations = []
        
        for url in sources:
            citation = SourceVerificationService.create_citation(url)
            citations.append(citation)
        
        # Sort by confidence (highest first)
        citations.sort(key=lambda x: x.confidence, reverse=True)
        
        return citations
    
    @staticmethod
    def detect_fake_portal(url: str) -> Dict[str, any]:
        """Detect potential fake/phishing portals"""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        warnings = []
        risk_level = "low"
        
        # Check for suspicious patterns
        suspicious_patterns = [
            (r'aadhaar[^-]', "Suspicious: Official domain is aadhaar.gov.in"),
            (r'uidai[^\.]', "Suspicious: Official domain is uidai.gov.in"),
            (r'incometax[^\.]', "Suspicious: Official domain is incometax.gov.in"),
            (r'\.co$|\.in\.', "Suspicious: Unusual domain structure"),
            (r'\d+', "Suspicious: Numbers in domain name"),
        ]
        
        for pattern, warning in suspicious_patterns:
            if re.search(pattern, domain):
                warnings.append(warning)
                risk_level = "medium"
        
        # Check if it's definitely not official
        if not SourceVerificationService.is_official_domain(url):
            if any(keyword in domain for keyword in ['aadhaar', 'uidai', 'pan', 'income', 'gov']):
                warnings.append("⚠️ WARNING: This appears to be a fake government website!")
                risk_level = "high"
        
        return {
            "is_suspicious": len(warnings) > 0,
            "risk_level": risk_level,
            "warnings": warnings
        }