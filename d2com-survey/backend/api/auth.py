"""
D2Com Survey System — Auth API
Handles Google OAuth login and current user info.
Includes dev-login for local development without Google OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.database import get_db
from backend.db.models import User
from backend.schemas import GoogleLoginRequest, TokenResponse, UserOut
from backend.services.auth_service import (
    verify_google_token, authenticate_user, create_jwt_token
)
from backend.middleware.auth_guard import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login/google", response_model=TokenResponse)
async def login_google(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with Google OAuth ID token. Only whitelisted emails allowed."""
    google_info = await verify_google_token(body.token)
    if not google_info:
        raise HTTPException(status_code=401, detail="Google token không hợp lệ")

    user = await authenticate_user(db, google_info)
    if not user:
        raise HTTPException(
            status_code=403,
            detail="Bạn chưa được cấp quyền truy cập. Liên hệ admin."
        )

    jwt_token = create_jwt_token(user)
    return TokenResponse(
        access_token=jwt_token,
        user=UserOut(
            id=user.id, email=user.email, name=user.name,
            role=user.role.value, is_active=user.is_active,
        ),
    )


@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(db: AsyncSession = Depends(get_db)):
    """
    Dev-only login: auto-login as first admin user.
    Blocked in production (RAILWAY_ENVIRONMENT set), allowed in local dev.
    """
    import os
    if os.getenv("RAILWAY_ENVIRONMENT"):
        raise HTTPException(status_code=403, detail="Dev login bị tắt trong production")

    result = await db.execute(select(User).where(User.is_active == True).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Chưa có user nào. Hãy chạy seed trước.")

    jwt_token = create_jwt_token(user)
    return TokenResponse(
        access_token=jwt_token,
        user=UserOut(
            id=user.id, email=user.email, name=user.name,
            role=user.role.value, is_active=user.is_active,
        ),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get currently authenticated user info."""
    return UserOut(
        id=current_user.id, email=current_user.email,
        name=current_user.name, role=current_user.role.value,
        is_active=current_user.is_active,
    )
