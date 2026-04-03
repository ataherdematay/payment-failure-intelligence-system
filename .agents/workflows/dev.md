---
description: Start all development services (backend, frontend, ML, database)
---

# Development Workflow

Start all services for local development.

## Prerequisites
- PostgreSQL running locally (`pg_isready` to check)
- Database created and seeded

## Steps

// turbo-all

1. **Check PostgreSQL is running**
```bash
pg_isready -h localhost -p 5432
```

2. **Start Backend API** (runs in background)
```bash
cd "/Users/ata/Payment Failure Intelligence System/backend"
npm run start:dev
```

3. **Start ML Service** (runs in background)
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

4. **Start Frontend** (runs in foreground)
```bash
cd "/Users/ata/Payment Failure Intelligence System/frontend"
npm run dev
```

## Service URLs
| Service    | URL                                  |
|------------|--------------------------------------|
| Frontend   | http://localhost:3000                 |
| Backend    | http://localhost:3001/api/v1         |
| ML Service | http://localhost:8000                 |
| Swagger    | http://localhost:3001/api/docs       |
| PostgreSQL | localhost:5432                        |
