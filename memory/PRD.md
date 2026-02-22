# RakshaAI — Product Requirements Document

## Original Problem Statement
Build and enhance "RakshaAI" — an AI assistant for Indian civic and legal matters.
- Web chat + voice interface with document generation and PDF download
- Telegram bot with reminders and RTI follow-up notifications
- Browser extension to automate tasks on government portals

## Target Audience
Indian citizens needing guidance on government services, legal processes (RTI, FIR, PAN, Aadhaar, etc.)

## Core Architecture
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI + MongoDB (motor)
- **Auth:** Emergent-managed Google OAuth (session_token cookie)
- **AI:** Emergent LLM key → Claude Sonnet 4.5 (chat + voice)
- **STT/TTS:** OpenAI Whisper + TTS
- **Browser Extension:** Chrome MV3, HTTP polling to backend
- **Telegram Bot:** python-telegram-bot + APScheduler (separate process)

## What's Been Implemented

### Session: Feb 22, 2026
- Fixed backend crash (SyntaxError in server.py automation endpoints)
- Fixed malformed backend/.env (WEBRTC_TURN_CREDENTIAL + TELEGRAM_BOT_TOKEN on same line)
- Fixed N+1 query in admin_list_users → MongoDB $lookup aggregation
- Fixed chat completely broken: `web_context` NameError in chat_agent.py process() method
- Fixed web search: installed `ddgs` package, corrected import from `duckduckgo_search`
- Fixed `.trim is not a function` TypeError in ChatInterface.js handleSendMessage (SyntheticEvent passed as messageOverride from bare onClick handlers)
- Completed browser extension: created manifest.json, content.js, popup.html, popup.js, icons
- Fixed background.js: updated BACKEND_URL, added missing missionSteps/currentStepIndex/setAutomationState/adjustPollingSpeed declarations
- .gitignore: .env files correctly excluded (user manages them manually)
- Deployment health check: all 3 blockers resolved

## Pending / Backlog

### P1 — In Progress
- Telegram bot ConversationHandler bug (reminder flow doesn't ask for days)
- RTI First Appeal auto-prompt system (Telegram bot)

### P2
- PDF formatting improvement (more "official" look with reportlab)
- AI document context memory verification

### P3 / Future
- WebSocket proxy for production (browser extension WS on emergent.host)
- Refactor ChatInterface.js into smaller components/hooks
- Git history cleanup (node_modules in old commits)
- Migrate DB from MongoDB to PostgreSQL (user request)
- Re-introduce "Mission" concept (goal-oriented multi-step conversations)

## Key API Endpoints
- POST /api/auth/session — OAuth callback, sets session_token cookie
- GET /api/auth/me — check current user
- POST /api/chat — main chat endpoint
- POST /api/voice/transcribe — STT
- POST /api/voice/speak — TTS
- POST /api/generate_pdf — PDF generation
- POST /api/upload_document — document analysis
- GET/POST /api/automation/* — browser extension polling
- WS /ws/automation — WebSocket for browser extension

## Protected .env Variables
- frontend/.env: REACT_APP_BACKEND_URL (never delete)
- backend/.env: MONGO_URL, JWT_SECRET, EMERGENT_LLM_KEY (never delete)
- Both files are gitignored (user manages manually)
