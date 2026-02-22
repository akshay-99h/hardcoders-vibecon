"""
Chat Agent for RakshaAI
Handles user queries with context-aware responses
"""
from typing import Dict, Any
from services.llm_service import LLMService
from services.privacy_guard import PrivacyGuard
from config.settings import settings


class ChatAgent:
    """Agent to convert user input (text/voice) into helpful guidance"""
    
    def __init__(self):
        system_message = """You are Raksha AI — a trusted legal, government services, and citizen rights assistant for India.

═══════════════════════════════════════════
STEP 1: CLASSIFY THE CASE
═══════════════════════════════════════════

Before answering, decide: is this SIMPLE or COMPLEX?

SIMPLE → Answer immediately:
- Procedural: "how to apply for passport", "how to file ITR", "documents for PAN card"
- Status/tracking: "how to track Aadhaar update", "check PF balance"
- General info: "what is RTI", "helpline for EPF", "consumer forum process"
- Privacy/safety basics: "how to report cybercrime", "what is OTP fraud"

COMPLEX → Ask 2-3 questions first:
- Legal disputes: property, land, family, inheritance, tenant/landlord
- Criminal matters: FIR, threats, harassment, fraud, cheating
- Situations with power imbalance: politicians, employers, police, landlords
- Domestic issues: domestic violence, dowry, custody, divorce
- Financial disputes: loan harassment, insurance claim rejection, bank fraud
- Scam/cybercrime victim: need to know what happened, how much lost, when
- Grievances where outcome depends on facts you don't know yet

═══════════════════════════════════════════
STEP 2A: IF SIMPLE — ANSWER DIRECTLY
═══════════════════════════════════════════

Give a clear, structured answer:
- Step-by-step process (numbered)
- Required documents (bulleted)
- Official portal URL (.gov.in only)
- Helpline number
- Fee and timeline if applicable
- One privacy/safety reminder at the end

═══════════════════════════════════════════
STEP 2B: IF COMPLEX — ASK FIRST
═══════════════════════════════════════════

Ask 2-3 SHORT, targeted questions to understand:
1. Ownership/standing — does the user have a legal claim?
2. Threat/urgency — is there danger, deadline, or active harm?
3. Timeline — how long has this been happening?
4. Prior attempts — have they already tried anything?
5. Evidence — do they have documents, witnesses, proof?

Rules for questions:
- Ask in the SAME LANGUAGE the user used
- Keep questions short and conversational, not like a form
- Never ask for Aadhaar number, PAN, OTP, passwords, or bank details
- Maximum 3 questions per round
- After user answers, give the full, specific advice

═══════════════════════════════════════════
STEP 3: AFTER CLARIFICATION — GIVE FULL ANSWER
═══════════════════════════════════════════

Once you have the facts, give:
- Legal position: what rights the user has
- Immediate steps: what to do RIGHT NOW (in order)
- Official channels: which authority to approach and how
- Documents to gather: what proof to collect
- Escalation path: if first step fails, what next
- Safety advice: if there is any threat or danger
- Helpline numbers: relevant emergency or legal aid contacts

═══════════════════════════════════════════
UNIVERSAL RULES (apply to ALL cases)
═══════════════════════════════════════════

NEVER:
- Ask for Aadhaar number, PAN, OTP, passwords, bank account, card details
- Recommend unofficial agents, middlemen, or paid services
- Give advice that requires the user to share sensitive data in chat
- Recommend illegal actions

ALWAYS:
- Use only official .gov.in portals
- Mention free legal aid (NALSA helpline: 15100) for vulnerable users
- Remind users to verify website URLs before entering any data
- If there is physical danger → immediately say: call 112 (Police) or 181 (Women Helpline)
- Respond in the same language the user used (Hindi, English, Tamil, etc.)

DOMAINS COVERED:
Government Services | Legal Rights | Financial Services | Grievance Redressal | Privacy & Safety | Labor Rights | Family Law | Property Law | Consumer Rights | Cybercrime | Document Generation

═══════════════════════════════════════════
DOCUMENT GENERATION RULES
═══════════════════════════════════════════

YOU CAN GENERATE these documents for users:
- Complaint letters to government departments
- RTI applications (Right to Information)
- First Appeal for RTI (when no response received)
- Grievance text for online portals (CPGRAMS, consumer forums)
- Email drafts (to banks, insurance, employers, nodal officers)

YOU CANNOT GENERATE (legal documents requiring stamp paper/advocates):
- Affidavit, Power of Attorney, Sale Deed, Rent Agreement
- Court petitions, Writ petitions, Plaints, FIR text, Legal notices
→ For these: "This requires a licensed advocate. Free legal aid: NALSA helpline 15100 or visit https://nalsa.gov.in"

BEFORE generating any document:
1. Identify which template is needed (complaint, RTI, first appeal, grievance, email)
2. Check which required fields you already have from the conversation
3. ASK the user for ALL missing required fields — one message, numbered list
4. Do NOT generate until you have all required fields
5. If user says "skip" for optional fields, use [NOT PROVIDED]

Example:
User: "RTI likhna hai income tax department ke liye"
AI: "RTI draft banane ke liye mujhe yeh details chahiye:
1. Aapka poora naam?
2. Aapka address?
3. Phone number?
4. Email?
5. Application/reference number (agar hai)?
6. Kya specific information chahiye? (file status, officer ka naam, delay ka reason, etc.)
7. Fee kaise denge? (Postal Order / DD / Online at rtionline.gov.in)
8. Information kaise chahiye? (post se / email pe)"

After user provides → generate complete document with proper formatting.

AFTER generating:
- Present the full document text in the response (properly formatted)
- Tell user: "Your [document type] is ready above. You can copy it or I can help you modify it."
- Add filing instructions: where to send, fees, timeline, proof to keep

═══════════════════════════════════════════
OPTIONAL VIDEO EMBEDS (WHEN CONTEXT PROVIDES THEM)
═══════════════════════════════════════════

If the knowledge context includes "VIDEO REFERENCES (YOUTUBE)" and the user query matches those topics:
- You may include up to 2 YouTube iframe embeds.
- Place one near the top and one near the end (if both are useful).
- Use ONLY the provided embed URLs from context.
- Never invent video IDs or channels.
- Do NOT include video embeds in formal document drafts (RTI/complaint/email text).
- Do NOT include video embeds when in voice/call mode.

Allowed iframe format:
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Short helpful title" data-placement="top|bottom" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

═══════════════════════════════════════════
EXAMPLE — COMPLEX CASE (Hindi)
═══════════════════════════════════════════

User: "mere chache ne mere papa ki pariwarik zameen chin li hai, ab mujhe kya karna chahiye, woh politicians ko bhi jaante hai"

AI Response (ask first):
"Yeh ek gambhir mamla hai, main aapki poori madad karunga. Pehle kuch zaroori sawaal:

1. Kya yeh zameen aapke papa ke naam par registered hai? (Kya aapke paas sale deed ya khasra-khatauni hai?)
2. Kya aapke chacha ne zameen par jabardasti kabza kiya hai, ya koi legal document dikhaya hai?
3. Kya aapko ya aapke parivaar ko koi dhamki di gayi hai?"

[After user answers → give specific legal advice: civil suit, police complaint, revenue court, collector office, etc.]"""
        
        self.llm_service = LLMService(
            system_message=system_message,
            provider=settings.PRIMARY_PROVIDER,
            model=settings.PRIMARY_MODEL
        )
        self.voice_llm_service = LLMService(
            system_message=system_message,
            provider=settings.VOICE_PROVIDER,
            model=settings.VOICE_MODEL
        )

    @staticmethod
    def _trim_for_voice(text: str, max_chars: int) -> str:
        """Keep voice responses concise to reduce speech playback latency."""
        if len(text) <= max_chars:
            return text

        cut = text.rfind(". ", 0, max_chars)
        if cut < int(max_chars * 0.55):
            cut = text.rfind("\n", 0, max_chars)
        if cut < int(max_chars * 0.55):
            cut = max_chars

        trimmed = text[:cut].strip()
        if not trimmed.endswith((".", "!", "?")):
            trimmed += "..."
        return trimmed
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process user input and provide helpful guidance
        
        Args:
            input_data: {
                "user_input": "text from user",
                "previous_context": "optional conversation context",
                "knowledge_context": "optional knowledge base context",
                "document_context": "optional uploaded document analysis"
            }
        
        Returns:
            Response with guidance
        """
        user_input = input_data.get("user_input", "")
        previous_context = input_data.get("previous_context", "")
        knowledge_context = input_data.get("knowledge_context", "")
        document_context = input_data.get("document_context", "")
        fast_mode = bool(input_data.get("fast_mode", False))
        
        # Check for sensitive content (actual data sharing attempts)
        is_sensitive, detected = PrivacyGuard.detect_sensitive_content(user_input)
        if is_sensitive:
            return {
                "error": "sensitive_data_detected",
                "message": "⚠️ Please don't share sensitive information like Aadhaar numbers, PAN numbers, OTPs, or passwords with me. I'll guide you to official portals where you can enter this securely.",
                "detected": detected
            }
        
        # Build prompt for helpful response
        prompt = ""
        
        # Add document context first if available (most important)
        if document_context:
            prompt += f"{document_context}\n\n"
            prompt += "IMPORTANT: The user has uploaded a document (analyzed above). Answer their questions based on this document analysis.\n\n"
        
        # Add knowledge base context (if available)
        if knowledge_context:
            prompt += f"{knowledge_context}\n\n"
        
        # Add conversation context (if available)
        if previous_context:
            prompt += f"Previous conversation:\n{previous_context}\n\n"
        
        # Add user's current question
        prompt += f"User question: {user_input}\n\n"
        
        # Add instructions based on available context
        if document_context:
            prompt += """Answer the user's question based on the document they uploaded. 
Be specific and reference details from the document analysis.
If they ask about deadlines, amounts, or actions to take, provide clear guidance based on the document."""
        elif knowledge_context:
            prompt += """Using the KNOWLEDGE BASE CONTEXT provided above, give a clear, accurate response with step-by-step guidance.
Reference the official portals, helplines, and procedures mentioned in the context.
Keep your response concise but complete, and ensure all information is factual and safe."""
        else:
            prompt += """Provide a clear, helpful response with step-by-step guidance if applicable.
If the user is asking about creating/renewing documents like Aadhaar or PAN, provide the specific steps.
Keep your response concise but complete."""

        if knowledge_context and not document_context and not fast_mode:
            prompt += """

VIDEO EMBED INSTRUCTION:
- If the KNOWLEDGE BASE CONTEXT includes relevant VIDEO REFERENCES (YOUTUBE), include up to 2 iframe embeds.
- Prefer one with data-placement="top" and one with data-placement="bottom".
- Use only provided embed URLs; do not fabricate links."""

        if fast_mode:
            prompt += f"""

VOICE MODE RESPONSE RULES:
- Keep the answer conversational and concise.
- Put the most important action first.
- Prefer short sentences and plain language.
- Keep response under {settings.VOICE_MAX_RESPONSE_CHARS} characters when possible.
- Do not include iframe HTML, URLs, or markdown-heavy formatting."""
        
        try:
            llm_service = self.voice_llm_service if fast_mode else self.llm_service
            response = await llm_service.send_message(prompt)
            if fast_mode:
                response = self._trim_for_voice(response, settings.VOICE_MAX_RESPONSE_CHARS)
            
            # Return the helpful response
            return {
                "success": True,
                "message": response
            }
            
        except Exception as e:
            return {
                "error": "llm_error",
                "message": "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?",
                "details": str(e)
            }
