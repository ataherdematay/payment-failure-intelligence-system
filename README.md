# Payment Failure Intelligence System (PFIS)

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
</p>

<p align="center">
  <strong>Analyze · Classify · Simulate · Optimize</strong><br/>
  A full-stack payment intelligence platform that turns transaction failures into actionable business decisions.<br/>
  <br/>
  🌍 <strong>Live Demo:</strong> <a href="https://frontend-phi-self-xq19jn53gh.vercel.app">frontend-phi-self-xq19jn53gh.vercel.app</a>
</p>

---

## 🎯 Why I Built This

Payment orchestration platforms like **Craftgate** route transactions across multiple virtual POS providers, banks, and payment gateways. At Craftgate's scale (1.19 billion ₺ recovered in 2025 alone), even a 1% reduction in failure rate translates to tens of millions of liras in rescued revenue.

This project simulates the **intelligence layer** that sits inside such a platform:

| Business Problem | PFIS Solution |
|---|---|
| Which gateway is underperforming? | Gateway comparison dashboard with per-provider failure rates |
| Why are payments failing? | ML-based failure reason classifier (5 categories) |
| What's a failure costing us? | Real-time revenue-at-risk calculation |
| What if we tune retry logic? | Parameter-based simulation engine with scenario comparison |
| What should we act on first? | AI-generated prioritized insight cards with recommendations |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│             PFIS — Production Architecture               │
│                                                          │
│  ┌───────────────┐   REST    ┌──────────────────────┐   │
│  │  Next.js 16   │ ────────▶ │   NestJS Backend     │   │
│  │  (Vercel)     │           │   (Railway)          │   │
│  └───────────────┘           └──────────┬───────────┘   │
│         │                               │               │
│         │ ML predict                    ▼               │
│         ▼                        ┌──────────────┐       │
│  ┌───────────────┐               │ PostgreSQL   │       │
│  │  FastAPI      │               │ (Railway)    │       │
│  │  ML Service   │               └──────────────┘       │
│  │  (Railway)    │                                      │
│  └───────────────┘                                      │
└──────────────────────────────────────────────────────────┘
```

---

## ✨ Dashboard Pages

### 📊 Overview
Real-time KPI cards + donut chart (failure by reason) + 30-day area chart + device/country breakdowns + recent transaction table.

### 📈 Analytics
- Daily volume trend (Success vs Failed, stacked area)
- Payment method failure rate comparison
- Hourly failure pattern (24h)
- Gateway performance comparison
- Paginated, filterable transaction table

### 💡 Insights
Auto-generated business intelligence cards ranked by severity:
- `CRITICAL` — Overall failure rate above 15% industry benchmark
- `WARNING` — Specific gateway or country underperforming
- `INFO` — Patterns and optimization opportunities

### 🤖 Predictions
ML-powered failure reason prediction:
- Input: device, country, amount range, hour, day of week
- Output: predicted failure reason + confidence score + probability bars
- Model metrics panel: Accuracy, Precision, Recall, F1 (per-class)

### 🔬 Simulation
What-if scenario engine for business decisions:
- Sliders: failure rate, transaction volume, avg amount, mobile share, network reliability, fraud sensitivity
- Toggle: retry logic on/off + retry success rate
- Output: simulated failure breakdown per reason + scenario comparison table
- **Craftgate use case:** Model the impact of switching a high-failure gateway (e.g. Square 39.1%) to a lower-failure alternative

### 🔐 Admin Panel & Custom Data
A built-in data management suite protected by JWT authentication:
- **CSV Data Upload:** Import your company's real payment logs
- **Dynamic Training:** Retrain the ML model instantly via the UI on your live data
- **Database Management:** Inject 5K synthetic transactions for demo or clear all data
- **Login Credentials:** `admin@pfis.com` / `pfis2026`

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TanStack Query, Recharts, TypeScript |
| Backend | NestJS, TypeORM, PostgreSQL, Swagger, Jest, Supertest |
| ML Service | FastAPI, scikit-learn (RandomForest), Pydantic, Pytest |
| Data | Python data generator (10K synthetic transactions) |
| Design | Dark glassmorphism, CSS variables, custom animations |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.9+
- PostgreSQL 14+ (`brew install postgresql@16`)

### 1. Database Setup
```bash
brew services start postgresql@16
createdb pfis_db
psql postgres -c "CREATE USER pfis WITH PASSWORD 'pfis_secret_2026';"
psql postgres -c "ALTER DATABASE pfis_db OWNER TO pfis;"
```

### 2. Seed Data (10,000 transactions)
```bash
cd data-generator
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python generate.py --count 10000 --output csv
python seed_db.py
```

### 3. Backend (Terminal 1)
```bash
cd backend
cp .env.example .env        # edit DB credentials
npm install
npm run start:dev           # → http://localhost:3001
                            # → http://localhost:3001/api/docs (Swagger)
```

### 4. ML Service (Terminal 2)
```bash
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.train         # trains RandomForest model
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend (Terminal 3)
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # → http://localhost:3000
```

---

## 📡 API Reference

### Backend (`:3001/api/v1`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/login` | POST | — | Returns JWT token |
| `/transactions/upload` | POST | 🛡️ JWT | Upload CSV to DB |
| `/transactions/seed` | POST | — | Seed 5K sandbox records |
| `/transactions/clear` | DELETE | 🛡️ JWT | Wipe all transaction data |
| `/transactions` | GET | — | List with filters (status, reason, page) |
| `/transactions/summary` | GET | — | KPI summary (total, failed, rate, avg risk) |
| `/analytics/failure-by-reason` | GET | Failure count per reason |
| `/analytics/failure-by-country` | GET | Failure rate per country |
| `/analytics/failure-by-device` | GET | Failure rate per device |
| `/analytics/failure-by-payment-method` | GET | Failure rate per payment method |
| `/analytics/daily-trend` | GET | Daily tx counts (last N days) |
| `/analytics/hourly-pattern` | GET | Hourly failure pattern |
| `/analytics/gateway-performance` | GET | Per-gateway failure rate + avg amount |
| `/analytics/revenue-lost` | GET | Total vs lost revenue |
| `/insights` | GET | Auto-generated insight cards |
| `/ml/predict` | POST | Proxy to ML service |
| `/ml/metrics` | GET | Model performance metrics |

### ML Service (`:8000`)

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health + model status |
| `/predict` | POST | Predict failure reason |
| `/model/metrics` | GET | Accuracy, F1, per-class scores |

---

## 📁 Project Structure

```
.
├── backend/                 # NestJS REST API
│   └── src/
│       ├── transactions/    # CRUD, summary
│       ├── analytics/       # Aggregation queries
│       ├── insights/        # Insight engine
│       └── ml/              # FastAPI proxy
├── frontend/                # Next.js Dashboard
│   ├── app/(dashboard)/
│   │   ├── page.tsx         # Overview
│   │   ├── analytics/       # Analytics + table
│   │   ├── insights/        # Insight cards
│   │   ├── predictions/     # ML predictor
│   │   └── simulation/      # What-if simulator
│   ├── components/
│   │   ├── layout/          # Sidebar, TopBar
│   │   └── ui/              # KPICard, ChartCard, StatusBadge
│   └── lib/
│       ├── api.ts           # Typed API client (axios)
│       └── utils.ts         # Formatters, constants
├── ml-service/              # FastAPI + scikit-learn
│   └── app/
│       ├── main.py          # Routes + CORS
│       ├── model.py         # Predict + metrics
│       └── train.py         # RandomForest training pipeline
└── data-generator/          # Synthetic data
    ├── generate.py          # 10K realistic transactions
    └── seed_db.py           # PostgreSQL seeder
```

---

## 🧠 ML Model

- **Algorithm:** RandomForestClassifier (scikit-learn)
- **Features:** amount, device (encoded), country (encoded), payment_method, hour_of_day, day_of_week
- **Target:** failure_reason (5 classes)
- **Training data:** Synthetic failure transactions representing real-world distribution (with dynamic retraining endpoint to adapt to uploaded company data)

---

## 🧪 Testing

The codebase includes a comprehensive, automated test suite across all services:

### Backend (NestJS + Jest)
- **Unit Tests:** Full coverage of `TransactionsService` (pagination, filtering, aggregations) and `AuthService` (JWT generation, credentials validation).
- **E2E Tests:** End-to-end endpoint checks spanning public routes, ML proxy integration, array formatting, and parameterized protected route testing using **Supertest**.
```bash
cd backend
npm run test           # 19/19 Unit tests
npm run test:e2e       # 14/14 E2E test scenarios
```

### ML Service (FastAPI + Pytest)
- **Pipeline Tests:** Validation of Scikit-Learn logic, custom transformers, preprocessor structure.
- **Model Tests:** Assertions verifying training loop, label matching, probability scoring structure, matrix dimensionality.
- **API Tests:** Validates `/predict` validation logic, `/health` ping, `/metrics` structural returns.
```bash
cd ml-service
pytest tests/ -v       # 37/37 integration and logic tests
```

---

## 🔗 Relevance to Craftgate

Craftgate's core value proposition is **payment orchestration** — routing transactions through the best available provider, recovering failures automatically, and giving merchants visibility into their payment health. PFIS demonstrates an engineering mindset aligned with exactly these problems:

1. **Autopilot & Retry** — The simulation engine models how retry rate changes affect revenue recovery, directly analogous to Craftgate's "Ödeme Tekrar Deneme" product
2. **Smart Routing** — Gateway comparison analytics surfaces which provider to deprioritize (e.g., Square at 39.1% failure rate), which is the decision input for dynamic routing
3. **Merchant Panel** — The dashboard provides the kind of per-transaction, per-gateway, per-reason visibility that enterprise merchants need from their payment orchestration layer
4. **Data-driven operations** — The insight engine generates prioritized recommendations — the same kind of proactive intelligence Craftgate provides to 500+ merchants

---

## 📄 License

MIT
