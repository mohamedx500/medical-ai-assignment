"""
Stats Router
─────────────
Real-time statistics endpoints fetched from the database.
Role-based: each role sees different data.
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, UserRole, Consultation, ChatSession, ChatMessage, ImageScan
from auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard")
def dashboard_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return dashboard statistics based on user role.
    - PATIENT: personal stats only
    - DOCTOR: their consultations + patient counts
    - DEVELOPER: system-wide metrics (no PHI)
    """
    role = user.role

    if role == UserRole.DEVELOPER:
        # ── System-wide metrics (admin view, no PHI) ──
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_doctors = db.query(func.count(User.id)).filter(User.role == UserRole.DOCTOR).scalar() or 0
        total_patients = db.query(func.count(User.id)).filter(User.role == UserRole.PATIENT).scalar() or 0
        total_consultations = db.query(func.count(Consultation.id)).scalar() or 0
        total_chats = db.query(func.count(ChatSession.id)).scalar() or 0
        total_messages = db.query(func.count(ChatMessage.id)).scalar() or 0
        total_scans = db.query(func.count(ImageScan.id)).scalar() or 0

        return {
            "role": "DEVELOPER",
            "stats": {
                "total_users": total_users,
                "total_doctors": total_doctors,
                "total_patients": total_patients,
                "total_consultations": total_consultations,
                "total_chat_sessions": total_chats,
                "total_messages": total_messages,
                "total_image_scans": total_scans,
            },
        }

    elif role == UserRole.DOCTOR:
        # ── Doctor: own consultations ──
        my_consultations = db.query(func.count(Consultation.id)).filter(
            Consultation.user_id == user.id
        ).scalar() or 0
        my_chats = db.query(func.count(ChatSession.id)).filter(
            ChatSession.user_id == user.id
        ).scalar() or 0
        my_scans = db.query(func.count(ImageScan.id)).filter(
            ImageScan.user_id == user.id
        ).scalar() or 0
        # Count of distinct patients (users they've consulted about)
        total_patients = db.query(func.count(User.id)).filter(
            User.role == UserRole.PATIENT
        ).scalar() or 0

        return {
            "role": "DOCTOR",
            "stats": {
                "my_consultations": my_consultations,
                "my_chat_sessions": my_chats,
                "my_scans": my_scans,
                "total_patients": total_patients,
            },
        }

    else:
        my_consultations = db.query(func.count(Consultation.id)).filter(
            Consultation.user_id == user.id
        ).scalar() or 0
        my_chats = db.query(func.count(ChatSession.id)).filter(
            ChatSession.user_id == user.id
        ).scalar() or 0
        my_scans = db.query(func.count(ImageScan.id)).filter(
            ImageScan.user_id == user.id
        ).scalar() or 0

        return {
            "role": "PATIENT",
            "is_guest": user.id == "guest",
            "stats": {
                "my_consultations": my_consultations,
                "my_chat_sessions": my_chats,
                "my_scans": my_scans,
            },
        }


@router.get("/recent-activity")
def recent_activity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent consultations and scans for the current user."""

    consultations = (
        db.query(Consultation)
        .filter(Consultation.user_id == user.id)
        .order_by(Consultation.created_at.desc())
        .limit(10)
        .all()
    )

    scans = (
        db.query(ImageScan)
        .filter(ImageScan.user_id == user.id)
        .order_by(ImageScan.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "consultations": [
            {
                "id": c.id,
                "patient_name": c.patient_name,
                "symptoms": c.symptoms,
                "severity": c.severity,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in consultations
        ],
        "scans": [
            {
                "id": s.id,
                "filename": s.filename,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans
        ],
    }


@router.get("/users")
def get_admin_users(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin only: list registered users."""
    if user.role != UserRole.DEVELOPER:
        return []

    users = db.query(User).order_by(User.created_at.desc()).limit(20).all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name or "Guest",
            "role": u.role.value,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.get("/analytics")
def get_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return real analytics data for charts."""
    from collections import defaultdict
    
    if user.role == UserRole.DEVELOPER:
        consultations = db.query(Consultation).all()
    else:
        # patient and doctor see their own scoped data
        consultations = db.query(Consultation).filter(Consultation.user_id == user.id).all()

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_counts = {m: {"month": m, "diagnosed": 0, "patients": 0} for m in months}
    
    severity_counts = defaultdict(int)
    
    # We want to count unique patients per month, so track IDs per month
    month_users = defaultdict(set)

    for c in consultations:
        if c.created_at:
            m_name = months[c.created_at.month - 1]
            monthly_counts[m_name]["diagnosed"] += 1
            if c.user_id:
                month_users[m_name].add(c.user_id)
            
        sev = (c.severity or "moderate").capitalize()
        severity_counts[sev] += 1

    for m_name in months:
        monthly_counts[m_name]["patients"] = len(month_users[m_name])

    area_data = list(monthly_counts.values())
    
    # Format Pie Chart data (using Severity instead of strict disease class since disease is freeform AI text)
    pie_data = [{"name": k, "value": v} for k, v in severity_counts.items()]
    
    if not pie_data:
        # Provide base structure to prevent UI crash
        pie_data = [{"name": "No Data", "value": 1}]

    return {
        "areaData": area_data,
        "pieData": pie_data,
    }
