"""
D2Com Survey System — API Router
"""
from fastapi import APIRouter

from backend.api import auth, users, forms, surveys, dashboard

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(forms.router)
api_router.include_router(surveys.router)
api_router.include_router(dashboard.router)
