#!/bin/bash
# Railway startup script for ML service
# Model training is NOT done on startup — use POST /model/retrain endpoint instead
# The service starts and serves /health immediately; /predict returns 503 until trained.

echo "🚀 PFIS ML Service startup..."
echo "ℹ️  No model pre-training on startup."
echo "   → Use POST /model/retrain after seeding the database."
echo ""
echo "🌐 Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
