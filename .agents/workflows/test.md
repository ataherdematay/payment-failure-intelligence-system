---
description: Run all tests across backend, frontend, and ML service
---

# Test Workflow

Run the full test suite for the project.

## Steps

// turbo-all

1. **Run Backend Tests**
```bash
cd "/Users/ata/Payment Failure Intelligence System/backend"
npm run test
```

2. **Run Backend E2E Tests**
```bash
cd "/Users/ata/Payment Failure Intelligence System/backend"
npm run test:e2e
```

3. **Run ML Service Tests**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && pytest -v
```

4. **Run Frontend Tests**
```bash
cd "/Users/ata/Payment Failure Intelligence System/frontend"
npm run test
```

5. **Check TypeScript types (Backend)**
```bash
cd "/Users/ata/Payment Failure Intelligence System/backend"
npx tsc --noEmit
```

6. **Check TypeScript types (Frontend)**
```bash
cd "/Users/ata/Payment Failure Intelligence System/frontend"
npx tsc --noEmit
```
