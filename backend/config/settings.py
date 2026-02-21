import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/mission_platform")
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    # Model configuration
    PRIMARY_MODEL = "claude-sonnet-4-5-20250929"
    PRIMARY_PROVIDER = "anthropic"
    
    # Voice configuration
    STT_MODEL = "whisper-1"
    TTS_MODEL = "tts-1"
    TTS_VOICE = "nova"
    
    # Session configuration
    SESSION_EXPIRY_DAYS = 7
    
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