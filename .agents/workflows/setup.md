---
description: Initial project setup — install all dependencies and start services
---

# Project Setup Workflow

## Prerequisites
- Node.js 20+
- Python 3.9+
- PostgreSQL 14+ (Homebrew: `brew install postgresql@16`)

## Steps

// turbo-all

1. **Start PostgreSQL**
```bash
brew services start postgresql@16
```

2. **Create Database**
```bash
psql postgres -c "CREATE USER pfis WITH PASSWORD 'pfis_secret_2026';" 2>/dev/null; psql postgres -c "CREATE DATABASE pfis_db OWNER pfis;" 2>/dev/null; echo "DB ready"
```

3. **Setup Data Generator & Generate Data**
```bash
cd "/Users/ata/Payment Failure Intelligence System/data-generator"
source venv/bin/activate || (python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt)
python generate.py --count 10000 --output csv
```

4. **Seed Database**
```bash
cd "/Users/ata/Payment Failure Intelligence System/data-generator"
source venv/bin/activate && python seed_db.py
```

5. **Setup Backend**
```bash
cd "/Users/ata/Payment Failure Intelligence System/backend"
npm install
cp .env.example .env 2>/dev/null; echo "Backend ready"
```

6. **Setup ML Service**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
python3 -m venv venv 2>/dev/null; source venv/bin/activate && pip install -r requirements.txt
```

7. **Train ML Model**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && python -m app.train
```

8. **Setup Frontend**
```bash
cd "/Users/ata/Payment Failure Intelligence System/frontend"
npm install
```

9. **Verify all services can start**
- Backend: `cd backend && npm run start:dev`
- ML: `cd ml-service && source venv/bin/activate && uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`
- Dashboard: http://localhost:3000
