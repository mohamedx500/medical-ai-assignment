"""
Chat Router
────────────
Provides conversational chat endpoints with data isolation.
Each user can only access their own chat sessions and messages.
Stores all messages in the database for history.
"""

import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, ChatSession, ChatMessage
from auth import get_current_user
from services.gemini_service import (
    call_gemini_smart,
    GeminiServiceError,
    GeminiRateLimitError,
    GeminiAuthError,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Request/Response Models ──────────────────────────────────────

from pydantic import BaseModel, ConfigDict

class ChatSendRequest(BaseModel):
    message: str
    session_id: int | None = None         # None = create new session
    history: list[dict] | None = None      # Frontend-provided context
    language: str = "en"


class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    reply: str
    model_used: str
    session_id: int


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user (data isolation)."""

    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
        .all()
    )

    return {
        "sessions": [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "message_count": len(s.messages),
            }
            for s in sessions
        ]
    }


@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages for a specific session (data isolation: user can only see their own)."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user.id,     # ← DATA ISOLATION
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return {
        "session_id": session.id,
        "title": session.title,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in session.messages
        ],
    }


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session and all its messages (data isolation)."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    db.delete(session)
    db.commit()
    return {"ok": True}


@router.post("/send", response_model=ChatResponse)
async def chat_send(
    request: ChatSendRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message and get an AI response.
    - Creates a new session if session_id is None
    - Stores both user message and AI reply in the database
    - Data isolation: sessions are scoped to the authenticated user
    """
    try:
        # ── Create or retrieve session ──
        session = None
        if request.session_id:
            session = db.query(ChatSession).filter(
                ChatSession.id == request.session_id,
                ChatSession.user_id == user.id,
            ).first()

        if not session:
            # Create new session
            title = request.message[:50] + ("..." if len(request.message) > 50 else "")
            session = ChatSession(user_id=user.id, title=title)
            db.add(session)
            db.commit()
            db.refresh(session)

        # ── Store user message ──
        if session:
            user_msg = ChatMessage(
                session_id=session.id,
                role="user",
                content=request.message,
            )
            db.add(user_msg)
            db.commit()

        # ── Build AI prompt ──
        lang_hint = ""
        if request.language == "ar":
            lang_hint = "IMPORTANT: You MUST respond entirely in Arabic (العربية). "

        system_prompt = (
            f"{lang_hint}"
            "You are MedAI, a friendly and knowledgeable medical AI assistant. "
            "Help users with medical questions, symptom analysis, and general health guidance. "
            "Be conversational, empathetic, and clear. "
            "Always remind users to consult a real doctor for serious concerns. "
            "If the user sends a casual greeting, respond warmly and briefly. "
            "Respond in plain text (no JSON, no code fences)."
        )

        parts = [system_prompt + "\n\n"]

        # Use DB history if session exists, otherwise use frontend-provided history
        if session:
            recent = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session.id)
                .order_by(ChatMessage.created_at.desc())
                .limit(12)
                .all()
            )
            for msg in reversed(recent):
                role_label = "User" if msg.role == "user" else "Assistant"
                parts.append(f"{role_label}: {msg.content}\n")
        elif request.history:
            for msg in request.history[-6:]:
                role_label = "User" if msg.get("role") == "user" else "Assistant"
                parts.append(f"{role_label}: {msg.get('content', '')}\n")

        parts.append(f"User: {request.message}\nAssistant:")
        prompt = "".join(parts)

        # ── Call Gemini ──
        result = await call_gemini_smart(prompt)

        # ── Store AI reply ──
        if session:
            ai_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=result.text,
                model_used=result.model_used,
            )
            db.add(ai_msg)
            db.commit()

        logger.info(f"[Chat] Success — model={result.model_used}, user={user.id}")

        return ChatResponse(
            reply=result.text,
            model_used=result.model_used,
            session_id=session.id if session else 0,
        )

    except GeminiRateLimitError as e:
        logger.warning(f"[Chat] Rate limited: {e.details}")
        raise HTTPException(status_code=429, detail={
            "error": "rate_limit",
            "message": "AI servers are busy. Please try again in a few moments.",
            "retry_after": 30,
        })

    except GeminiAuthError as e:
        logger.error(f"[Chat] Auth error: {e.message}")
        raise HTTPException(status_code=503, detail={
            "error": "api_key_invalid",
            "message": "AI service configuration error. Contact the administrator.",
        })

    except GeminiServiceError as e:
        logger.error(f"[Chat] Service error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail={
            "error": "chat_error",
            "message": e.message,
        })

    except Exception as e:
        logger.error(f"[Chat] Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail={
            "error": "internal_error",
            "message": f"An unexpected error occurred: {str(e)[:200]}",
        })
