#!/bin/bash
# D2Com Survey System — Startup Script

echo "🔄 Running migrations..."
alembic upgrade head

echo "🌱 Running seed..."
python -m backend.db.seed

echo "📦 Building frontend..."
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  cd frontend
  npm install
  npm run build
  cd ..
fi

echo "🚀 Starting server on port ${PORT:-8000}..."
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
