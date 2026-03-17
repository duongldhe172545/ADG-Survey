"""
D2Com Survey System — Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/d2com_survey"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback"
    
    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24h
    
    # Google Drive
    GDRIVE_SERVICE_ACCOUNT_FILE: Optional[str] = None
    GDRIVE_ROOT_FOLDER_ID: str = ""  # D2COM_Project root folder
    
    # Google Sheets
    GSHEET_RAW_DEALER_ID: str = ""
    GSHEET_RAW_CRAFT_ID: str = ""
    
    # App
    APP_NAME: str = "D2Com Survey"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
