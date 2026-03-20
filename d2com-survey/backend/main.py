"""
D2Com Survey System — FastAPI Main Application
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.api.router import api_router
from backend.db.database import engine, Base
# Import all models so Base.metadata knows about them
import backend.db.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"🚀 {settings.APP_NAME} starting...")
    # Auto-create any new tables (safe: checkfirst=True)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        print("✅ Database tables synced")
    except Exception as e:
        print(f"⚠️ Table sync failed (non-fatal): {e}")

    # Migrate enum columns to varchar (one-time, safe to re-run)
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            # Check if column is still enum type
            result = await conn.execute(text(
                "SELECT data_type FROM information_schema.columns "
                "WHERE table_name = 'survey_forms' AND column_name = 'type'"
            ))
            row = result.first()
            if row and row[0] == 'USER-DEFINED':
                print("🔄 Migrating type columns from enum to varchar...")
                await conn.execute(text(
                    "ALTER TABLE survey_forms ALTER COLUMN type TYPE varchar(50) USING type::text"
                ))
                await conn.execute(text(
                    "ALTER TABLE customers ALTER COLUMN type TYPE varchar(50) USING type::text"
                ))
                # Drop old enum type
                await conn.execute(text("DROP TYPE IF EXISTS formtype"))
                print("✅ Type columns migrated to varchar")
    except Exception as e:
        print(f"⚠️ Enum migration failed (non-fatal): {e}")
    yield
    print(f"👋 {settings.APP_NAME} shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Hệ thống khảo sát D2Com - ADG",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# ── Serve frontend static files (production) ──
# After `npm run build`, files are in frontend/dist/
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    from fastapi.responses import FileResponse

    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Catch-all: serve index.html for SPA routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
