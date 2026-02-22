import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/mission_platform")
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    # Model configuration
    PRIMARY_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-5-20250929")
    PRIMARY_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")

    # Voice-call LLM routing (defaults to primary model/provider)
    VOICE_MODEL = os.getenv("VOICE_LLM_MODEL", os.getenv("LLM_MODEL", "claude-sonnet-4-5-20250929"))
    VOICE_PROVIDER = os.getenv("VOICE_LLM_PROVIDER", os.getenv("LLM_PROVIDER", "anthropic"))
    VOICE_MAX_RESPONSE_CHARS = int(os.getenv("VOICE_MAX_RESPONSE_CHARS", "420"))
    
    # Voice configuration
    STT_MODEL = os.getenv("STT_MODEL", "whisper-1")
    TTS_MODEL = os.getenv("TTS_MODEL", "tts-1-hd")
    TTS_VOICE = os.getenv("TTS_VOICE", "shimmer")
    VOICE_MIN_AUDIO_BYTES = int(os.getenv("VOICE_MIN_AUDIO_BYTES", "1200"))
    VOICE_MAX_AUDIO_BYTES = int(os.getenv("VOICE_MAX_AUDIO_BYTES", str(4 * 1024 * 1024)))

    # Billing / Stripe (test mode friendly)
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_PLUS_MONTHLY = os.getenv("STRIPE_PRICE_PLUS_MONTHLY", "")
    STRIPE_PRICE_PRO_MONTHLY = os.getenv("STRIPE_PRICE_PRO_MONTHLY", "")
    STRIPE_PRICE_BUSINESS_MONTHLY = os.getenv("STRIPE_PRICE_BUSINESS_MONTHLY", "")
    STRIPE_CHECKOUT_SUCCESS_URL = os.getenv(
        "STRIPE_CHECKOUT_SUCCESS_URL",
        "http://localhost:3000/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    )
    STRIPE_CHECKOUT_CANCEL_URL = os.getenv("STRIPE_CHECKOUT_CANCEL_URL", "http://localhost:3000/billing?checkout=cancel")
    STRIPE_BILLING_RETURN_URL = os.getenv("STRIPE_BILLING_RETURN_URL", "http://localhost:3000/billing")
    
    # Session configuration
    SESSION_EXPIRY_DAYS = 7

    # Frontend URLS
    FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    CONTACT_US_PATH = os.getenv("CONTACT_US_PATH", "/contact")

    # Email notifications (Resend)
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "rakshaai@axhost.com")
    LOGIN_ALERT_EMAIL_ENABLED = os.getenv("LOGIN_ALERT_EMAIL_ENABLED", "true").lower() == "true"
    
    # Official domains allowlist
    OFFICIAL_DOMAINS = [
        "uidai.gov.in",
        "aadhaar.gov.in",
        "incometax.gov.in",
        "parivahan.gov.in",
        "mygov.in",
        "india.gov.in",
        "digitalindia.gov.in"
    ]

settings = Settings()
