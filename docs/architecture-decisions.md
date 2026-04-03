# Architecture Decision Records (ADR)

## ADR-001: Microservice Architecture

**Status**: Accepted  
**Date**: 2026-04-03

### Context
The system requires ML processing, a REST API, a database, and a frontend dashboard. We need to decide between monolithic and microservice approaches.

### Decision
Use a **microservice architecture** with 4 distinct services:
1. Backend API (NestJS/Node.js)
2. ML Service (FastAPI/Python)
3. Frontend (Next.js)
4. Data Generator (Python script)

### Rationale
- **Language diversity**: ML requires Python (scikit-learn), backend benefits from TypeScript
- **Independent scaling**: ML service can be scaled independently if prediction load increases
- **Separation of concerns**: Each service has a clear boundary
- **Deployment flexibility**: Services can be deployed independently

### Consequences
- Need to manage 3 terminal processes locally (backend, ML, frontend)
- Network latency between backend and ML service (~5-20ms, acceptable)
- Need for health checks and circuit breakers on ML integration

---

## ADR-002: RandomForest for Failure Classification

**Status**: Accepted  
**Date**: 2026-04-03

### Context
Need to classify payment failure reasons from transaction features.

### Decision
Use **RandomForestClassifier** from scikit-learn.

### Rationale
- Handles mixed feature types (numerical + categorical) well
- Robust to overfitting with proper hyperparameter tuning
- Provides feature importance scores (useful for insights)
- `class_weight='balanced'` handles class imbalance
- Interpretable — important for fintech explainability requirements
- Fast inference time (< 100ms per prediction)

### Alternatives Considered
- **XGBoost/LightGBM**: Better accuracy potential, but adds dependency complexity for marginal gain on this dataset
- **Neural Networks**: Overkill for structured tabular data with 6 features
- **Logistic Regression**: Too simple for non-linear boundary classification

---

## ADR-003: TypeORM over Prisma

**Status**: Accepted  
**Date**: 2026-04-03

### Context
Need an ORM for PostgreSQL integration in NestJS.

### Decision
Use **TypeORM** with decorator-based entities.

### Rationale
- First-class NestJS integration (`@nestjs/typeorm`)
- Mature migration system
- QueryBuilder for complex aggregation queries (analytics module)
- Active Record + Data Mapper patterns supported
- Decorator-based entity definition matches NestJS philosophy

### Alternatives Considered
- **Prisma**: Better developer experience and type safety, but QueryBuilder for raw aggregations is less flexible
- **Drizzle**: Lightweight and performant, but less mature NestJS integration

---

## ADR-004: Rule-Based Insight Engine

**Status**: Accepted  
**Date**: 2026-04-03

### Context
Need to generate actionable business insights from transaction data.

### Decision
Use a **rule-based insight engine** with statistical comparisons, not ML.

### Rationale
- Deterministic and explainable outputs
- Easy to add/modify rules
- No training data required
- Insights are always relevant to current data
- Lower computational cost

### Rules Framework
1. Compare failure rates across dimensions (device, country, payment_method)
2. Detect anomalies using simple statistical thresholds (> 2σ from mean)
3. Temporal pattern detection (time-of-day, day-of-week)
4. Amount-based segmentation analysis

---

## ADR-005: Next.js App Router for Frontend

**Status**: Accepted  
**Date**: 2026-04-03

### Context
Need a React-based dashboard framework.

### Decision
Use **Next.js 14+ with App Router**.

### Rationale
- Server Components for data-heavy pages (reduced client JS)
- Route groups for dashboard layout
- Built-in API routes if needed
- Excellent TypeScript support
- TailwindCSS integrates seamlessly
- Vercel deployment support (future)

---

## ADR-006: Recharts for Data Visualization

**Status**: Accepted  
**Date**: 2026-04-03

### Context
Need a charting library for the analytics dashboard.

### Decision
Use **Recharts**.

### Rationale
- React-native (composable components)
- Responsive containers built-in
- Supports all required chart types: Pie, Area, Bar, Line, Scatter
- Active maintenance
- Lightweight compared to D3-based alternatives
- Good TypeScript support

### Alternatives Considered
- **Chart.js / react-chartjs-2**: Canvas-based (less React-idiomatic)
- **Nivo**: Beautiful but heavier bundle size
- **D3**: Too low-level for dashboard use case
