"""
Auth Utilities
──────────────
Extracts user info from JWT tokens sent in the Authorization header.
Guests get a synthetic user object with PATIENT role.
"""

import logging
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole

logger = logging.getLogger(__name__)

# Guest fallback user (not persisted)
GUEST_USER = User(
    id="guest",
    email="guest@medai.local",
    full_name="Guest",
    password_hash="",
    role=UserRole.PATIENT,
)


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract the current user from the Authorization header.
    Expects: Authorization: Bearer <jwt_token>
    Falls back to guest user if no token provided.
    """
    if not authorization:
        return GUEST_USER

    try:
        token = authorization.replace("Bearer ", "").strip()
        if not token or token == "guest":
            return GUEST_USER

        # Decode JWT
        from routers.auth_router import decode_token
        payload = decode_token(token)
        if not payload:
            logger.warning("[Auth] Invalid or expired token")
            return GUEST_USER

        uid = payload.get("sub")
        if not uid:
            return GUEST_USER

        user = db.query(User).filter(User.id == uid).first()
        if not user:
            logger.warning(f"[Auth] User not found: {uid}")
            return GUEST_USER

        return user

    except Exception as e:
        logger.warning(f"[Auth] Token parse error: {e}")
        return GUEST_USER


def require_role(*roles: UserRole):
    """
    Dependency factory: raises 403 if user's role not in allowed roles.
    """
    from fastapi import HTTPException

    def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return user

    return checker
