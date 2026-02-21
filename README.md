# Mission-Mode Platform - India-First Government Services Navigator

## Overview

Mission-Mode Platform is an AI-powered application that helps Indian citizens navigate government services like Aadhaar, PAN card, and Driving License with step-by-step guidance, voice support, and official source verification.

## 🎯 Key Features

### Core Functionality
- **Mission-Mode UX**: Goal-oriented workflows with clear timelines
- **AI-Powered Agents**: 
  - Problem Understanding Agent (converts user input to mission intent)
  - Source Verification Agent (validates official .gov.in sources)
  - Workflow Builder Agent (creates executable step-by-step timelines)
  - Risk & Compliance Agent (detects scams and fake portals)
  - Language & Voice Agent (multilingual support)
  
### Privacy & Safety
- **Privacy-First Architecture**: Never requests or stores sensitive data (Aadhaar, PAN, OTP, passwords)
- **Official Source Verification**: All guidance from verified .gov.in domains
- **Scam Detection**: Fake portal warnings and fraud probability scoring
- **Safety Warnings**: Step-by-step security reminders

### User Experience
- **Text & Voice Input**: Describe your need in text or voice
- **Multilingual Support**: English, Hindi, and 8+ regional languages
- **Voice Guidance**: Text-to-speech narration for mission steps
- **Progress Tracking**: Visual timeline with completion estimates
- **Escalation Paths**: Fallback options if online methods fail

## 📋 Supported Services (MVP)

1. **Aadhaar Services**
   - Update address, mobile number, email
   - Download e-Aadhaar
   - Check enrollment status

2. **PAN Card Services**
   - New PAN application
   - PAN corrections
   - Status tracking
   - Reprint requests

3. **Driving License Services**
   - Learner's license application
   - Permanent DL application
   - License renewal
   - Duplicate license

## 🚀 Quick Start

### Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

### Running Services
```bash
# Restart all services
sudo supervisorctl restart all

# Check service status
sudo supervisorctl status
```

## 🔧 Technology Stack

- **Backend**: FastAPI + Python, MongoDB, Claude Sonnet 4.5
- **Frontend**: React 18 + Tailwind CSS
- **Auth**: Emergent-managed Google OAuth
- **Voice**: OpenAI Whisper (STT) + TTS
- **AI**: Model-agnostic architecture via emergentintegrations

## 📡 Key API Endpoints

- `POST /api/missions/create` - Create new mission with AI workflow
- `GET /api/missions` - Get user's missions
- `GET /api/missions/{mission_id}` - Get mission details
- `POST /api/voice/transcribe` - Speech-to-text
- `POST /api/voice/synthesize` - Text-to-speech

See full API documentation at http://localhost:8001/docs

---

**Built for India 🇮🇳** | Privacy-first • Official sources only • Multilingual support
