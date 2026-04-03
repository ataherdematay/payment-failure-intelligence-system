---
description: Train or retrain the ML model for failure reason prediction
---

# ML Model Training Workflow

Train the RandomForestClassifier model on current transaction data.

## Prerequisites
- PostgreSQL running with seeded data

## Steps

// turbo-all

1. **Check PostgreSQL is running**
```bash
pg_isready -h localhost -p 5432
```

2. **Activate ML environment**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate || (python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt)
```

3. **Run training script**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && python -m app.train
```

4. **Verify model metrics**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && python -c "
import joblib
model = joblib.load('models/latest_model.joblib')
print('Model loaded successfully')
print(f'N estimators: {model.named_steps[\"classifier\"].n_estimators}')
"
```

5. **Test prediction endpoint**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"amount": 250, "device": "mobile", "country": "TR", "payment_method": "credit_card", "hour_of_day": 14, "day_of_week": 3}'
```

## Expected Output
- Model file saved to `ml-service/models/model_YYYYMMDD_HHMMSS.joblib`
- Symlink `ml-service/models/latest_model.joblib` updated
- Classification report printed with precision/recall/F1 per class
- Confusion matrix logged
