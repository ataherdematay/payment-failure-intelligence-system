# Testing Strategy

## Overview

Three-tier testing approach across all services:
1. **Unit Tests** — Business logic isolation
2. **Integration Tests** — Service interaction and API testing
3. **E2E Tests** — Full flow verification

## Backend (NestJS / Jest)

### Unit Tests
- **Services**: Mock repository, test business logic
- **Insight Engine**: Verify rule-based insight generation
- **Retry Logic**: Test retry suggestion algorithm
- **Fraud Scoring**: Test risk score calculation
- Coverage target: **80%+**

### Integration Tests (E2E)
- **API Endpoints**: Supertest with test database
- **Database**: Test migrations, queries
- **ML Client**: Mock ML service HTTP responses

### Test Files
```
backend/
├── src/modules/transactions/
│   ├── transactions.service.spec.ts
│   └── transactions.controller.spec.ts
├── src/modules/analytics/
│   └── analytics.service.spec.ts
├── src/modules/insights/
│   ├── insights.service.spec.ts
│   ├── retry-engine.spec.ts
│   └── fraud-scorer.spec.ts
└── test/
    ├── app.e2e-spec.ts
    ├── transactions.e2e-spec.ts
    └── analytics.e2e-spec.ts
```

## ML Service (Python / pytest)

### Model Tests
- Train on subset, verify accuracy > 0.60
- Test prediction output format
- Test feature engineering pipeline
- Test model serialization/deserialization

### API Tests
- Health endpoint returns correct format
- Predict endpoint validates input
- Batch prediction works
- Error handling for invalid features

## Frontend (Next.js / Vitest)

### Component Tests
- KPICard renders with correct values
- Charts render without errors
- DataTable pagination works
- StatusBadge shows correct colors

## Commands
```bash
# Backend
npm run test              # Unit tests
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# ML Service
pytest -v                 # All tests
pytest --cov=app          # With coverage

# Frontend
npm run test              # Vitest
npm run test:cov          # With coverage
```
