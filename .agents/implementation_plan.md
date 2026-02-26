# Medical AI Expert System — v3.0 Implementation Plan

## Architecture Overview
- **Backend**: FastAPI (Python) + SQLAlchemy + SQLite
- **Frontend**: Next.js 16 (TypeScript) + shadcn/ui + Framer Motion
- **Auth**: Supabase Auth (already wired in login/register)
- **AI Engine**: Google Gemini 2.5 Flash (primary) with fallback chain
- **Database**: SQLite via SQLAlchemy for consultation/chat tracking

## Phase 1: Database Schema & Models
Add SQLAlchemy models to the FastAPI backend:

### Models:
1. **User** — synced from Supabase auth (id, email, role: PATIENT|DOCTOR|DEVELOPER)
2. **Consultation** — tracks diagnosis requests (user_id, symptoms, result, created_at)
3. **ChatSession** — groups chat messages (user_id, title, created_at)
4. **ChatMessage** — individual messages (session_id, role, content, created_at)
5. **ImageScan** — tracks image analysis (user_id, filename, result, created_at)

### Files to create:
- `backend/database.py` — SQLAlchemy engine + session
- `backend/models.py` — All ORM models
- `backend/routers/auth.py` — JWT validation middleware
- `backend/routers/stats.py` — Real statistics endpoints

## Phase 2: RBAC & Auth Integration
- Validate Supabase JWT on protected FastAPI routes
- Role extraction from JWT claims
- Middleware: `get_current_user(token)` → User with role
- Role-based endpoint access decorators

## Phase 3: Dashboard Routing & Real Stats
- Remove "Admin" from common sidebar nav
- Backend: `/api/stats/dashboard` — returns real counts from DB
- Frontend: Role-conditional dashboard rendering
  - PATIENT: personal history, recent scans
  - DOCTOR: patient cases, consultations
  - DEVELOPER: system-wide metrics

## Phase 4: Chat Data Isolation
- Backend: Chat CRUD scoped to user_id
- Store all messages in ChatMessage table
- API: GET /api/chat/sessions (user's only)
- API: GET /api/chat/sessions/{id}/messages
- API: POST /api/chat/send (creates message + AI reply)

## Phase 5: Multimodal Scanner
- Add text prompt field to scanner UI
- Backend: Accept both image + text in analyze-image endpoint
- Combine in Gemini multimodal prompt

## Phase 6: Arabic RTL (already partially done)
- Already have i18n context + translations
- Already passing language to Gemini prompts
- Ensure all new UI uses translation keys
