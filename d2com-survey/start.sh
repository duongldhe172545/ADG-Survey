#!/bin/bash
# D2Com Survey System — Startup Script

# Ensure backend module is importable
export PYTHONPATH=/app:$PYTHONPATH

echo "🔄 Running migrations..."
alembic upgrade head

echo "🌱 Running seed..."
python -m backend.db.seed

echo "📦 Building frontend..."
if command -v npm &> /dev/null; then
  cd frontend
  npm install
  npm run build
  cd ..
else
  echo "⚠️  npm not found, skipping frontend build"
fi

echo "🚀 Starting server on port ${PORT:-8000}..."
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
