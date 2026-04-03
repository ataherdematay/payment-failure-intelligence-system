# Project: Payment Failure Intelligence System (PFIS)

## Goal
Analyze failed payment transactions and classify failure reasons to reduce failure rates.
This is NOT a simple dashboard — it is an **Analysis System**, **Decision Support Tool**, and **Fintech Insight Engine**.

## Features
- Ingest payment transaction logs (10k+ records)
- Classify failure reasons: `insufficient_funds`, `fraud_suspected`, `network_error`, `expired_card`, `invalid_credentials`
- Provide rich analytics dashboard with drill-down capabilities
- Generate actionable optimization insights (Insight Engine)
- Retry suggestion engine ("Will a retry succeed?")
- Fraud flagging with risk scoring
- Real-time transaction simulation stream

## Architecture
```
[Data Generator] → [Backend API] → [ML Service] → [PostgreSQL]
                                     ↓
                               [Frontend Dashboard]
```

## Tech Stack
| Layer      | Technology                                |
|------------|-------------------------------------------|
| Backend    | Node.js + NestJS (TypeScript)             |
| Frontend   | Next.js 14+ (App Router) + TailwindCSS    |
| Charts     | Recharts                                  |
| Database   | PostgreSQL (TypeORM)                      |
| ML Service | Python 3.11+ / FastAPI / scikit-learn     |
| DevOps     | Local dev (npm/uvicorn/venv)               |
| Testing    | Jest (BE), Vitest (FE), pytest (ML)       |

## Code Style & Conventions

### General
- **Language**: TypeScript (strict mode) for backend & frontend; Python 3.11+ for ML
- **Architecture**: Clean Architecture with clear separation of concerns
- **Modules**: Feature-based module organization (not layer-based)
- **Naming**: camelCase for variables/functions, PascalCase for classes/components, SCREAMING_SNAKE for constants
- **Files**: kebab-case for filenames (e.g., `payment-transaction.service.ts`)

### Backend (NestJS)
- Use NestJS decorators consistently (`@Controller`, `@Injectable`, `@Module`)
- DTOs with `class-validator` for all request validation
- Repository pattern for database access
- Global exception filters and interceptors for logging
- Environment config via `@nestjs/config` with schema validation (Joi)
- API versioning: `/api/v1/...`
- Response format: `{ success: boolean, data: T, message?: string, error?: string }`

### Frontend (Next.js)
- App Router with route groups: `(dashboard)`, `(auth)`
- Server Components by default; `"use client"` only when necessary (charts, interactivity)
- Recharts wrapped in `ResponsiveContainer` within client components
- TailwindCSS for all styling (no inline styles, no CSS modules)
- Custom hooks in `/hooks` directory
- API calls via dedicated service layer in `/lib/api`

### ML Service (Python)
- FastAPI with Pydantic models for request/response validation
- Model versioning: each trained model saved with timestamp
- Scikit-learn pipelines for preprocessing + prediction
- Feature engineering documented in code comments
- Health check endpoint: `GET /health`
- Prediction endpoint: `POST /predict`

### Database
- PostgreSQL with TypeORM entities
- Migrations for all schema changes (never auto-sync in production)
- Indexes on frequently queried columns (`status`, `failure_reason`, `created_at`)
- Soft deletes where applicable

### Testing
- Minimum 80% coverage target
- Unit tests for business logic (services, use-cases)
- Integration tests for API endpoints
- ML model tests for accuracy thresholds

## Expectations
- Production-level code quality
- Scalable, horizontally distributable structure  
- Clear separation of concerns across all layers
- Comprehensive error handling and logging
- Local development with separate terminal processes
- All secrets via environment variables (never committed)
- README.md with setup instructions in each service directory

## Directory Structure
```
/
├── backend/              # NestJS REST API
├── frontend/             # Next.js Dashboard
├── ml-service/           # Python ML microservice
├── data-generator/       # Python script for synthetic data
├── docs/                 # Project documentation
└── .agents/              # Agent definitions & workflows
```
