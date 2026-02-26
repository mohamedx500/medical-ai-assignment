"""
Database Models
───────────────
SQLAlchemy ORM models for the Medical AI Expert System.
Roles: PATIENT, DOCTOR, DEVELOPER (admin).
"""

import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, DateTime, Enum, ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    DEVELOPER = "DEVELOPER"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, default="")
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    created_at = Column(DateTime, default=_utcnow)

    # Relationships
    consultations = relationship("Consultation", back_populates="user", cascade="all,delete")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all,delete")
    image_scans = relationship("ImageScan", back_populates="user", cascade="all,delete")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    patient_name = Column(String, default="")
    age = Column(Integer)
    gender = Column(String, default="")
    symptoms = Column(Text, default="")
    severity = Column(String, default="moderate")
    gemini_result = Column(Text, default="")
    clips_result = Column(Text, default="")
    model_used = Column(String, default="")
    language = Column(String, default="en")
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="consultations")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all,delete",
                            order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    model_used = Column(String, default="")
    created_at = Column(DateTime, default=_utcnow)

    session = relationship("ChatSession", back_populates="messages")


class ImageScan(Base):
    __tablename__ = "image_scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, default="")
    prompt = Column(Text, default="")
    result = Column(Text, default="")
    model_used = Column(String, default="")
    language = Column(String, default="en")
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", back_populates="image_scans")
