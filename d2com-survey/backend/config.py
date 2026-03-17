"""
D2Com Survey System — Configuration
"""
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/d2com_survey"

    # Railway
    RAILWAY_ENVIRONMENT: Optional[str] = None
    PORT: int = 8000
    
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
    GDRIVE_SERVICE_ACCOUNT_JSON: Optional[str] = None  # Raw JSON for Railway
    GDRIVE_ROOT_FOLDER_ID: str = ""  # D2COM_Project root folder
    
    # Google Sheets
    GSHEET_RAW_DEALER_ID: str = ""
    GSHEET_RAW_CRAFT_ID: str = ""
    
    # App
    APP_NAME: str = "D2Com Survey"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def fix_database_url(self):
        """Convert Railway's postgres:// to postgresql+asyncpg://"""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            self.DATABASE_URL = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            self.DATABASE_URL = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self


settings = Settings()
