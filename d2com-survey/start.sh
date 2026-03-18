#!/bin/bash
# D2Com Survey System — Startup Script
export PYTHONPATH=/app:$PYTHONPATH

echo "🔄 Running migrations..."
alembic upgrade head

echo "🌱 Running seed..."
python -m backend.db.seed

echo "🚀 Starting server on port ${PORT:-8000}..."
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
