# Environment Configuration

## All Services

### PostgreSQL (local)
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pfis_db
POSTGRES_USER=pfis
POSTGRES_PASSWORD=pfis_secret_2026
```

### Backend (NestJS) — `backend/.env`
```env
NODE_ENV=development
BACKEND_PORT=3001
BACKEND_API_PREFIX=api/v1
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pfis_db
POSTGRES_USER=pfis
POSTGRES_PASSWORD=pfis_secret_2026
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
```

### ML Service (FastAPI) — `ml-service/.env`
```env
ML_PORT=8000
ML_MODEL_PATH=models/latest_model.joblib
ML_LOG_LEVEL=INFO
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pfis_db
POSTGRES_USER=pfis
POSTGRES_PASSWORD=pfis_secret_2026
```

### Frontend (Next.js) — `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=PFIS Dashboard
```

## Service URLs (Local Development)
| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000         |
| Backend    | http://localhost:3001/api/v1  |
| ML Service | http://localhost:8000         |
| Swagger    | http://localhost:3001/api/docs|
| PostgreSQL | localhost:5432               |
