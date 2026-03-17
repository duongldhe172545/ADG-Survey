"""
D2Com Survey System — Auth service (Google OAuth + JWT)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.models import User


async def verify_google_token(token: str) -> Optional[dict]:
    """Verify Google OAuth ID token and return user info."""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=60  # tolerate up to 60s clock difference
        )
        return {
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
        }
    except Exception as e:
        import logging
        logging.error(f"Google token verification failed: {type(e).__name__}: {e}")
        return None


async def authenticate_user(db: AsyncSession, google_info: dict) -> Optional[User]:
    """Check if user email exists in whitelist and is active."""
    result = await db.execute(
        select(User).where(User.email == google_info["email"])
    )
    user = result.scalar_one_or_none()

    if user and user.is_active:
        return user
    return None


def create_jwt_token(user: User) -> str:
    """Create JWT with user id, email, role."""
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
