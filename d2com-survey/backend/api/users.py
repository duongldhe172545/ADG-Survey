"""
D2Com Survey System — User Management API (Admin only)
CRUD operations for managing surveyor and admin accounts.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import User, UserRole
from backend.schemas import UserOut, UserCreate, UserUpdate
from backend.middleware.auth_guard import require_admin

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users. Admin only."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [
        UserOut(id=u.id, email=u.email, name=u.name, role=u.role.value, is_active=u.is_active)
        for u in result.scalars().all()
    ]


@router.post("/", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Add a new user to the whitelist. Admin only."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email đã tồn tại")

    user = User(email=body.email, name=body.name, role=UserRole(body.role))
    db.add(user)
    await db.flush()
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role.value, is_active=user.is_active)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update user name, role, or active status. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = UserRole(body.role)
    if body.is_active is not None:
        user.is_active = body.is_active

    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role.value, is_active=user.is_active)
