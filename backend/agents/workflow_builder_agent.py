from agents.base_agent import BaseAgent
from models.schemas import MissionStep, StepType, StepStatus, SourceCitation
from typing import Dict, Any, List
import json
import uuid

class WorkflowBuilderAgent(BaseAgent):
    """Agent to build executable mission workflows with timeline"""
    
    def __init__(self):
        system_message = """You are a Workflow Builder Agent for government services in India.

Your role is to:
1. Create step-by-step workflows for government service missions
2. Define dependencies between steps
3. Estimate time for each step
4. Identify which steps require sensitive data entry
5. Add safety warnings and common mistakes
6. Define alternate/fallback paths

For each step, provide:
- Title: Clear, action-oriented
- Description: Detailed instructions
- Step type: inform, collect, submit, wait, decision
- Dependencies: Which steps must complete first
- Platform: online/offline/phone
- Sensitive required: true if step involves entering Aadhaar/PAN/OTP/password
- Estimated time: in minutes
- Success indicator: How to know step is complete
- Safety warnings: Important privacy/security warnings
- Common mistakes: What users typically get wrong
- Alternate path: Fallback if this step fails

IMPORTANT:
- Steps requiring sensitive data must have sensitive_required: true
- Always include safety warnings for sensitive steps
- Provide realistic time estimates
- Include offline fallback paths

Return JSON array of steps."""
        super().__init__(system_message)
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build workflow for a mission
        
        Args:
            input_data: {
                "domain": "mission domain",
                "objective": "specific objective",
                "state": "Indian state",
                "sources": ["verified source URLs"]
            }
        
        Returns:
            List of mission steps with dependencies
        """
        domain = input_data.get("domain", "")
        objective = input_data.get("objective", "")
        state = input_data.get("state", "")
        sources = input_data.get("sources", [])
        
        # Build prompt
        prompt = f"""Create a detailed workflow for:
Domain: {domain}
Objective: {objective}
State: {state}
Official sources: {', '.join(sources)}

Break down into clear, actionable steps. Return ONLY a valid JSON array of steps.

Example format:
[
  {{
    "title": "Check eligibility",
    "description": "Visit official portal and check eligibility criteria",
    "step_type": "inform",
    "dependencies": [],
    "platform": "online",
    "sensitive_required": false,
    "estimated_time_minutes": 5,
    "success_indicator": "You understand the requirements",
    "safety_warnings": [],
    "common_mistakes": ["Not checking state-specific requirements"],
    "alternate_path": null
  }}
]"""
        
        try:
            response = await self._call_llm(prompt)
            
            # Extract JSON
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            steps_data = json.loads(response)
            
            # Convert to MissionStep objects
            steps = []
            for idx, step_data in enumerate(steps_data):
                step_id = f"step_{uuid.uuid4().hex[:8]}"
                
                # Map step_type string to enum
                step_type_map = {
                    "inform": StepType.INFORM,
                    "collect": StepType.COLLECT,
                    "submit": StepType.SUBMIT,
                    "wait": StepType.WAIT,
                    "decision": StepType.DECISION,
                    "escalate": StepType.ESCALATE,
                    "close": StepType.CLOSE
                }
                
                step_type = step_type_map.get(step_data.get("step_type", "inform"), StepType.INFORM)
                
                step = MissionStep(
                    step_id=step_id,
                    sequence=idx,
                    title=step_data.get("title", ""),
                    description=step_data.get("description", ""),
                    step_type=step_type,
                    dependencies=step_data.get("dependencies", []),
                    platform=step_data.get("platform", "online"),
                    sensitive_required=step_data.get("sensitive_required", False),
                    success_indicator=step_data.get("success_indicator", ""),
                    estimated_time_minutes=step_data.get("estimated_time_minutes", 10),
                    citations=[],
                    status=StepStatus.PENDING,
                    safety_warnings=step_data.get("safety_warnings", []),
                    common_mistakes=step_data.get("common_mistakes", []),
                    alternate_path=step_data.get("alternate_path")
                )
                
                steps.append(step)
            
            # Calculate total estimated time
            total_time_minutes = sum(step.estimated_time_minutes for step in steps)
            
            return {
                "steps": [step.model_dump() for step in steps],
                "total_steps": len(steps),
                "estimated_completion_time": self._format_time(total_time_minutes),
                "has_sensitive_steps": any(step.sensitive_required for step in steps)
            }
            
        except Exception as e:
            # Return fallback workflow
            return self._get_fallback_workflow(domain, objective)
    
    def _format_time(self, minutes: int) -> str:
        """Format minutes into human-readable time"""
        if minutes < 60:
            return f"{minutes} minutes"
        hours = minutes // 60
        mins = minutes % 60
        if mins == 0:
            return f"{hours} hour{'s' if hours > 1 else ''}"
        return f"{hours} hour{'s' if hours > 1 else ''} {mins} minutes"
    
    def _get_fallback_workflow(self, domain: str, objective: str) -> Dict[str, Any]:
        """Return a basic fallback workflow"""
        fallback_steps = [
            {
                "step_id": "step_fallback_1",
                "sequence": 0,
                "title": "Visit Official Portal",
                "description": f"Navigate to the official government portal for {domain} services",
                "step_type": "inform",
                "dependencies": [],
                "platform": "online",
                "sensitive_required": False,
                "estimated_time_minutes": 5,
                "success_indicator": "Portal loaded successfully",
                "citations": [],
                "status": "pending",
                "safety_warnings": ["Verify you're on official .gov.in domain"],
                "common_mistakes": ["Using fake/phishing websites"],
                "alternate_path": None
            },
            {
                "step_id": "step_fallback_2",
                "sequence": 1,
                "title": "Complete the Process",
                "description": f"Follow on-screen instructions to {objective}",
                "step_type": "submit",
                "dependencies": ["step_fallback_1"],
                "platform": "online",
                "sensitive_required": True,
                "estimated_time_minutes": 20,
                "success_indicator": "Confirmation received",
                "citations": [],
                "status": "pending",
                "safety_warnings": [
                    "Enter sensitive data only on official portal",
                    "Never share OTP with anyone"
                ],
                "common_mistakes": ["Entering incorrect information"],
                "alternate_path": None
            }
        ]
        
        return {
            "steps": fallback_steps,
            "total_steps": len(fallback_steps),
            "estimated_completion_time": "25 minutes",
            "has_sensitive_steps": True
        }
