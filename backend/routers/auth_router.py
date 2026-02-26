"""
Auth Router
────────────
Real authentication with JWT tokens.
Endpoints: POST /register, POST /login, GET /me
"""

import os
import logging
from datetime import datetime, timezone, timedelta

import jwt
import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole

router = APIRouter()
logger = logging.getLogger(__name__)

# ── JWT config ──
JWT_SECRET = os.getenv("JWT_SECRET", "medai_secret_key_2026_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72  # 3 days


def hash_password(password: str) -> str:
    # bcrypt expects bytes
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role.value,
        "name": user.full_name or "",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── Request/Response schemas ──

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""
    role: str = "PATIENT"  # PATIENT or DOCTOR


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


# ── Endpoints ──

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email + password."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Map role
    role_map = {"PATIENT": UserRole.PATIENT, "DOCTOR": UserRole.DOCTOR, "client": UserRole.PATIENT, "doctor": UserRole.DOCTOR}
    role = role_map.get(req.role.upper(), role_map.get(req.role, UserRole.PATIENT))

    user = User(
        email=req.email,
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user)
    logger.info(f"[Auth] Registered: {user.email} ({user.role.value})")

    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password, returns JWT token."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(user)
    logger.info(f"[Auth] Login: {user.email} ({user.role.value})")

    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    )


@router.get("/me")
def get_me(token: str = "", db: Session = Depends(get_db)):
    """Get current user info from JWT token (passed as query param)."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def seed_admin(db: Session):
    """Create the admin user if it doesn't exist."""
    admin_email = "admin@medai.com"
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            full_name="Admin",
            password_hash=hash_password("medo8000"),
            role=UserRole.DEVELOPER,
        )
        db.add(admin)
        db.commit()
        logger.info(f"[Auth] Admin user seeded: {admin_email}")
    else:
        logger.info(f"[Auth] Admin user already exists: {admin_email}")
