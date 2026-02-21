from agents.base_agent import BaseAgent
from services.source_verification_service import SourceVerificationService
from tools.calculator_tools import CalculatorTools
from typing import Dict, Any
import json

class RiskComplianceAgent(BaseAgent):
    """Agent to detect scams, risks, and compliance issues"""
    
    def __init__(self):
        system_message = """You are a Risk & Compliance Guard Agent for government services in India.

Your role is to:
1. Detect potential scams and phishing attempts
2. Identify risky steps in missions
3. Flag compliance issues
4. Provide safety recommendations

Risk indicators:
- Requests for sensitive data (Aadhaar, PAN, OTP, passwords)
- Unofficial URLs or domains
- Urgency/pressure tactics
- Requests for payment outside official portals
- Spelling/grammar errors
- Unusual contact methods

Return JSON with:
{
  "risk_level": "low|medium|high|critical",
  "risk_factors": ["list of identified risks"],
  "is_scam_likely": true|false,
  "recommendations": ["safety recommendations"],
  "allow_proceed": true|false
}"""
        super().__init__(system_message)
        self.verification_service = SourceVerificationService()
        self.calculator = CalculatorTools()
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze mission for risks and compliance
        
        Args:
            input_data: {
                "mission_steps": "list of steps",
                "sources": "list of source URLs",
                "user_input": "original user input",
                "context": "additional context"
            }
        
        Returns:
            Risk assessment with recommendations
        """
        mission_steps = input_data.get("mission_steps", [])
        sources = input_data.get("sources", [])
        user_input = input_data.get("user_input", "")
        context = input_data.get("context", "")
        
        # Check sources for fake portals
        source_risks = []
        for source in sources:
            if isinstance(source, str):
                url = source
            else:
                url = source.get("url", "")
            
            fake_check = self.verification_service.detect_fake_portal(url)
            if fake_check["is_suspicious"]:
                source_risks.extend(fake_check["warnings"])
        
        # Build fraud indicators
        fraud_indicators = {
            "suspicious_url": len(source_risks) > 0,
            "requests_sensitive_data": any(
                step.get("sensitive_required", False) for step in mission_steps
            ),
            "urgency_pressure": "urgent" in user_input.lower() or "immediately" in user_input.lower(),
            "unofficial_contact": False,  # Would need more context
            "spelling_errors": False,  # Would need language analysis
            "asks_for_payment": "payment" in user_input.lower() or "pay" in user_input.lower()
        }
        
        # Calculate fraud probability
        fraud_analysis = self.calculator.calculate_fraud_probability(fraud_indicators)
        
        # Build prompt for additional analysis
        prompt = f"""Analyze this government service mission for risks:

User request: {user_input}
Sources: {', '.join([s if isinstance(s, str) else s.get('url', '') for s in sources])}
Steps count: {len(mission_steps)}
Context: {context}

Identify risks and provide recommendations. Return ONLY valid JSON."""
        
        try:
            response = await self._call_llm(prompt)
            
            # Extract JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            risk_assessment = json.loads(response)
            
            # Combine with fraud analysis
            risk_assessment["fraud_analysis"] = fraud_analysis
            risk_assessment["source_warnings"] = source_risks
            
            # Determine final allow_proceed
            if fraud_analysis["risk_level"] in ["high", "very_high"]:
                risk_assessment["allow_proceed"] = False
                risk_assessment["risk_level"] = "critical"
            
            return risk_assessment
            
        except Exception as e:
            # Fallback to fraud analysis only
            return {
                "risk_level": fraud_analysis["risk_level"],
                "risk_factors": fraud_analysis["triggered_indicators"],
                "is_scam_likely": fraud_analysis["risk_level"] in ["high", "very_high"],
                "recommendations": [fraud_analysis["recommendation"]],
                "allow_proceed": fraud_analysis["risk_level"] not in ["high", "very_high"],
                "fraud_analysis": fraud_analysis,
                "source_warnings": source_risks
            }