#!/bin/bash
# Railway startup script for ML service
# Trains the model if not already present, then starts the server

set -e

MODEL_PATH="models/latest_model.joblib"

echo "🚀 PFIS ML Service startup..."

# Check if a real model exists (not just a placeholder)
if [ ! -f "$MODEL_PATH" ] || [ $(wc -c < "$MODEL_PATH") -lt 1000 ]; then
    echo "⚠️  No trained model found. Starting initial training..."
    python -m app.train
    echo "✅ Model training complete."
else
    echo "✅ Model found, skipping training."
fi

echo "🌐 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
