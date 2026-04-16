#!/usr/bin/env sh
set -e

# Determine environment
ENV=${APP_ENV:-development}

if [ "$ENV" = "production" ]; then
    echo "▶ Starting Uvicorn (production)..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
else
    echo "▶ Starting Uvicorn (development with reload)..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
