# Payment Failure Intelligence System (PFIS)

<p align="center">
  <strong>Analyze • Classify • Optimize</strong>
</p>

> A full-stack fintech intelligence system that analyzes failed payment transactions, classifies failure reasons using ML, and provides actionable insights to reduce failure rates.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Local Development                         │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │ Frontend │───▶│ Backend  │───▶│ML Service│               │
│  │ Next.js  │    │ NestJS   │    │ FastAPI  │               │
│  │ :3000    │    │ :3001    │    │ :8000    │               │
│  └──────────┘    └────┬─────┘    └──────────┘               │
│                       │                                      │
│                  ┌────▼─────┐                                │
│                  │PostgreSQL│                                │
│                  │  :5432   │                                │
│                  └──────────┘                                │
│                                                              │
│  ┌──────────────┐                                           │
│  │Data Generator│── Seed ──▶ PostgreSQL                     │
│  │   Python     │                                           │
│  └──────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core
- 📊 **Analytics Dashboard** — Real-time KPIs, failure distributions, time series
- 🤖 **ML Predictions** — RandomForest-based failure reason classification
- 💡 **Insight Engine** — Auto-generated natural language insights
- 🔄 **Retry Suggestions** — Smart retry probability scoring
- 🚨 **Fraud Flagging** — Risk score-based transaction flagging
- 📡 **Live Simulation** — Real-time transaction stream simulation

### Technical
- Clean Architecture (NestJS modules, SOLID principles)
- Type-safe end-to-end (TypeScript + Pydantic)
- Comprehensive test coverage (Jest, pytest, Vitest)
- API documentation (Swagger/OpenAPI)

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **Python** 3.9+
- **PostgreSQL** 14+ (via Homebrew: `brew install postgresql@16`)

### Setup
```bash
# Clone the repository
git clone <repo-url>
cd "Payment Failure Intelligence System"

# 1. Start PostgreSQL (if using Homebrew)
brew services start postgresql@16
createdb pfis_db
psql postgres -c "CREATE USER pfis WITH PASSWORD 'pfis_secret_2026';"
psql postgres -c "ALTER DATABASE pfis_db OWNER TO pfis;"

# 2. Generate & seed data
cd data-generator && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python generate.py --count 10000 --output csv && python seed_db.py

# 3. Setup & start backend (terminal 1)
cd backend && npm install && npm run start:dev

# 4. Setup & start ML service (terminal 2)
cd ml-service && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.train
uvicorn app.main:app --reload --port 8000

# 5. Setup & start frontend (terminal 3)
cd frontend && npm install && npm run dev

# Open dashboard
open http://localhost:3000
```

## 📁 Project Structure

```
.
├── backend/                 # NestJS REST API
│   ├── src/
│   │   ├── common/          # Shared filters, interceptors, pipes
│   │   ├── config/          # App & DB configuration
│   │   └── modules/
│   │       ├── transactions/  # Transaction CRUD
│   │       ├── analytics/     # Aggregation & KPIs
│   │       ├── insights/      # Insight engine & fraud flags
│   │       └── ml/            # ML service integration
│   └── test/
├── frontend/                # Next.js Dashboard
│   ├── src/
│   │   ├── app/(dashboard)/ # Dashboard routes
│   │   ├── components/      # UI components
│   │   └── lib/             # API client & utilities
│   └── public/
├── ml-service/              # FastAPI ML Microservice
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── model.py         # Model loading & prediction
│   │   ├── train.py         # Training pipeline
│   │   └── schemas.py       # Pydantic models
│   └── models/              # Serialized models (.joblib)
├── data-generator/          # Synthetic data generator
│   ├── generate.py          # Data generation script
│   └── seed_db.py           # Database seeder
├── docs/                    # Documentation
└── .agents/                 # Workflow definitions
```

## 🔌 API Overview

### Backend API (`:3001`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/transactions` | POST | Create transaction |
| `/api/v1/transactions` | GET | List with filters |
| `/api/v1/analytics/overview` | GET | KPI summary |
| `/api/v1/analytics/failure-distribution` | GET | Failure breakdown |
| `/api/v1/analytics/time-series` | GET | Temporal trends |
| `/api/v1/insights` | GET | Auto-generated insights |
| `/api/v1/insights/retry-suggestion/:id` | GET | Retry probability |
| `/api/v1/insights/fraud-flags` | GET | Fraud flagged items |

### ML Service (`:8000`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Predict failure reason |
| `/model/metrics` | GET | Model performance |
| `/model/retrain` | POST | Retrain model |

## 🧪 Testing

```bash
# Backend
cd backend && npm run test && npm run test:e2e

# ML Service
cd ml-service && pytest -v

# Frontend
cd frontend && npm run test
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
