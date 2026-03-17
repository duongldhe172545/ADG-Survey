#!/bin/bash
# D2Com Survey System — Startup Script
echo "🔄 Running migrations..."
alembic upgrade head

echo "🌱 Running seed..."
python -m backend.db.seed

echo "🚀 Starting server..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000
