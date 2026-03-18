# ==============================================================================
# D2Com Survey System — Production Dockerfile
# Based on KMS pattern: Python startup, .dockerignore, slim image
# ==============================================================================

FROM python:3.12-slim

# System dependencies + cleanup in same layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc \
    || true

# Copy backend + config files
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Copy and build frontend
COPY frontend/ ./frontend/
ARG VITE_GOOGLE_CLIENT_ID=571791954536-btfi3vccrc59q2svf6cj9lo3kiuosbid.apps.googleusercontent.com
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN cd frontend && npm install --legacy-peer-deps && npm run build

ENV PYTHONPATH=/app
ENV PORT=8000
EXPOSE 8000

# Use Python startup script (avoids CRLF issues)
CMD ["python", "-m", "backend.startup"]
