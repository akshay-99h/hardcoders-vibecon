from agents.base_agent import BaseAgent
from services.source_verification_service import SourceVerificationService
from models.schemas import SourceCitation
from typing import Dict, Any, List
import json

class SourceVerificationAgent(BaseAgent):
    """Agent to verify and rank official sources for missions"""
    
    def __init__(self):
        system_message = """You are a Source Verification Agent for government services in India.

Your role is to:
1. Identify official government sources for specific services
2. Provide verified URLs from official portals (.gov.in domains)
3. Rank sources by authority and reliability

OFFICIAL SOURCES DATABASE:

Aadhaar Services:
- Main portal: https://uidai.gov.in
- MyAadhaar: https://myaadhaar.uidai.gov.in
- Aadhaar update: https://ssup.uidai.gov.in
- Status check: https://resident.uidai.gov.in

PAN Card Services:
- Main portal: https://www.incometax.gov.in
- NSDL PAN: https://www.onlineservices.nsdl.com/paam/
- PAN status: https://www.tin-nsdl.com

Driving License:
- Parivahan: https://parivahan.gov.in
- Sarathi: https://sarathi.parivahan.gov.in
- State RTO portals: Various state-specific URLs

Return ONLY official .gov.in sources. Never suggest third-party services.

Output JSON with:
{
  "sources": [
    {"url": "official URL", "purpose": "what it's for", "freshness_days": 0}
  ],
  "primary_source": "main official URL",
  "warnings": ["any warnings about fake portals"]
}"""
        super().__init__(system_message)
        self.verification_service = SourceVerificationService()
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verify and rank sources for a mission
        
        Args:
            input_data: {
                "domain": "mission domain",
                "objective": "specific objective",
                "state": "Indian state"
            }
        
        Returns:
            Verified sources with rankings
        """
        domain = input_data.get("domain", "")
        objective = input_data.get("objective", "")
        state = input_data.get("state", "")
        
        # Build prompt
        prompt = f"""Domain: {domain}
Objective: {objective}
State: {state}

Provide official government sources for this task. Return ONLY valid JSON."""
        
        try:
            response = await self._call_llm(prompt)
            
            # Extract JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            sources_data = json.loads(response)
            
            # Verify each source
            verified_sources = []
            warnings = []
            
            for source in sources_data.get("sources", []):
                url = source.get("url", "")
                
                # Verify domain
                if not self.verification_service.is_official_domain(url):
                    warnings.append(f"Warning: {url} is not an official .gov.in domain")
                    continue
                
                # Create citation
                citation = self.verification_service.create_citation(
                    url=url,
                    freshness_days=source.get("freshness_days", 0)
                )
                
                verified_sources.append({
                    "url": url,
                    "purpose": source.get("purpose", ""),
                    "authority_tier": citation.authority_tier,
                    "confidence": citation.confidence
                })
            
            # Sort by confidence
            verified_sources.sort(key=lambda x: x["confidence"], reverse=True)
            
            return {
                "sources": verified_sources,
                "primary_source": verified_sources[0] if verified_sources else None,
                "warnings": warnings + sources_data.get("warnings", [])
            }
            
        except Exception as e:
            # Fallback to hardcoded official sources
            return self._get_fallback_sources(domain)
    
    def _get_fallback_sources(self, domain: str) -> Dict[str, Any]:
        """Return hardcoded official sources as fallback"""
        sources_map = {
            "aadhaar": [
                {"url": "https://uidai.gov.in", "purpose": "Official UIDAI portal", 
                 "authority_tier": "official_primary", "confidence": 1.0},
                {"url": "https://myaadhaar.uidai.gov.in", "purpose": "MyAadhaar services",
                 "authority_tier": "official_primary", "confidence": 1.0}
            ],
            "pan": [
                {"url": "https://www.incometax.gov.in", "purpose": "Income Tax Department",
                 "authority_tier": "official_primary", "confidence": 1.0},
                {"url": "https://www.onlineservices.nsdl.com/paam/", "purpose": "PAN application",
                 "authority_tier": "official_primary", "confidence": 0.95}
            ],
            "driving_license": [
                {"url": "https://parivahan.gov.in", "purpose": "Parivahan portal",
                 "authority_tier": "official_primary", "confidence": 1.0},
                {"url": "https://sarathi.parivahan.gov.in", "purpose": "Sarathi DL services",
                 "authority_tier": "official_primary", "confidence": 1.0}
            ]
        }
        
        sources = sources_map.get(domain, [])
        return {
            "sources": sources,
            "primary_source": sources[0] if sources else None,
            "warnings": []
        }