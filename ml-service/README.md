# ML Service

FastAPI microservice for payment failure reason classification.

## Setup

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Train the Model

The model requires seeded data in PostgreSQL. Run the data generator first:

```bash
# From project root
cd data-generator && source venv/bin/activate
python generate.py --count 10000
python seed_db.py
```

Then train:

```bash
# From ml-service/
source venv/bin/activate
python -m app.train
```

A model file will be saved to `models/model_YYYYMMDD_HHMMSS.joblib` and `models/latest_model.joblib` will be updated.

## Start the Service

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + model status |
| POST | `/predict` | Predict failure reason |
| GET | `/model/metrics` | Latest training metrics |
| POST | `/model/retrain` | Trigger retraining from PostgreSQL |
| GET | `/docs` | Swagger UI |

## Example Prediction

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "device": "mobile",
    "country": "TR",
    "payment_method": "credit_card",
    "hour_of_day": 14,
    "day_of_week": 3
  }'
```

Response:

```json
{
  "prediction": "insufficient_funds",
  "confidence": 0.82,
  "probabilities": {
    "insufficient_funds": 0.82,
    "network_error": 0.10,
    "fraud_suspected": 0.05,
    "expired_card": 0.02,
    "invalid_credentials": 0.01
  }
}
```

## Run Tests

```bash
source venv/bin/activate
pytest -v tests/
```

## Environment Variables

See `.env` for configuration. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_PORT` | `8000` | Service port |
| `ML_MODEL_PATH` | `models/latest_model.joblib` | Model file path |
| `ML_LOG_LEVEL` | `INFO` | Logging level |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_DB` | `pfis_db` | Database name |

## Model Versioning

```
models/
├── model_20260403_120000.joblib    # Timestamped version
├── model_20260402_090000.joblib    # Previous version
└── latest_model.joblib             # Symlink → latest
```

Training history and metrics are stored in `logs/training_history.json`.
