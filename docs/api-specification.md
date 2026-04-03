# API Specification

## Base URL
- **Backend**: `http://localhost:3001/api/v1`
- **ML Service**: `http://localhost:8000`

## Response Format (Backend)
All backend responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-04-03T12:00:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description",
  "statusCode": 400,
  "timestamp": "2026-04-03T12:00:00Z"
}
```

---

## Transactions

### POST `/api/v1/transactions`
Create a new transaction record.

**Request Body:**
```json
{
  "userId": "user_123",
  "amount": 250.00,
  "currency": "USD",
  "country": "TR",
  "device": "mobile",
  "paymentMethod": "credit_card",
  "gateway": "stripe",
  "status": "failed",
  "failureReason": "insufficient_funds",
  "riskScore": 0.35
}
```

**Validation Rules:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| userId | string | ✅ | min: 1 |
| amount | number | ✅ | min: 0.01, max: 1,000,000 |
| currency | string | ✅ | ISO 4217 (3 chars) |
| country | string | ✅ | ISO 3166-1 alpha-2 |
| device | enum | ✅ | mobile, desktop, tablet |
| paymentMethod | enum | ✅ | credit_card, debit_card, bank_transfer, digital_wallet |
| gateway | string | ✅ | min: 1 |
| status | enum | ✅ | success, failed, pending |
| failureReason | enum | ❌ | insufficient_funds, fraud_suspected, network_error, expired_card, invalid_credentials |
| riskScore | number | ❌ | 0.0 - 1.0 |

---

### GET `/api/v1/transactions`
List transactions with filtering and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max: 100) |
| status | enum | - | Filter by status |
| failureReason | enum | - | Filter by failure reason |
| country | string | - | Filter by country code |
| device | enum | - | Filter by device type |
| startDate | ISO date | - | Filter from date |
| endDate | ISO date | - | Filter to date |
| minAmount | number | - | Minimum amount |
| maxAmount | number | - | Maximum amount |
| sortBy | string | createdAt | Sort field |
| sortOrder | enum | DESC | ASC or DESC |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 10432,
    "page": 1,
    "limit": 20,
    "totalPages": 522
  }
}
```

---

## Analytics

### GET `/api/v1/analytics/overview`
Get high-level KPI summary.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| startDate | ISO date | Period start |
| endDate | ISO date | Period end |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 10432,
    "failedTransactions": 3130,
    "successfulTransactions": 7302,
    "failureRate": 30.0,
    "revenueAtRisk": 785250.00,
    "avgTransactionAmount": 245.50,
    "retrySuccessRate": 42.5,
    "periodComparison": {
      "failureRateChange": -2.3,
      "transactionVolumeChange": 15.0
    }
  }
}
```

### GET `/api/v1/analytics/failure-distribution`
Breakdown of failure reasons.

**Response:**
```json
{
  "success": true,
  "data": [
    { "reason": "insufficient_funds", "count": 1252, "percentage": 40.0 },
    { "reason": "network_error", "count": 783, "percentage": 25.0 },
    { "reason": "fraud_suspected", "count": 470, "percentage": 15.0 },
    { "reason": "expired_card", "count": 376, "percentage": 12.0 },
    { "reason": "invalid_credentials", "count": 249, "percentage": 8.0 }
  ]
}
```

### GET `/api/v1/analytics/time-series`
Failure trends over time.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| granularity | enum | daily | hourly, daily, weekly, monthly |
| startDate | ISO date | 30 days ago | Start |
| endDate | ISO date | now | End |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-01",
      "total": 342,
      "failed": 103,
      "failureRate": 30.1,
      "byReason": {
        "insufficient_funds": 41,
        "network_error": 26,
        "fraud_suspected": 15,
        "expired_card": 12,
        "invalid_credentials": 9
      }
    }
  ]
}
```

### GET `/api/v1/analytics/by-country`
### GET `/api/v1/analytics/by-device`
### GET `/api/v1/analytics/by-payment-method`

Same response pattern, grouped by respective dimension.

---

## Insights

### GET `/api/v1/insights`
Auto-generated insights from the insight engine.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "insight_001",
      "type": "device_analysis",
      "severity": "high",
      "title": "Mobile Failure Rate Alert",
      "description": "Mobile users have a 23% higher failure rate compared to desktop users",
      "metric": {
        "mobile": 38.5,
        "desktop": 15.2,
        "difference": 23.3
      },
      "recommendation": "Investigate mobile payment gateway SDKs for timeout and connection issues",
      "generatedAt": "2026-04-03T12:00:00Z"
    }
  ]
}
```

### GET `/api/v1/insights/retry-suggestion/:transactionId`
Get retry probability for a specific transaction.

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "retryRecommended": true,
    "successProbability": 0.73,
    "reasoning": "Network error with low retry count — historical success rate for retries is 72%",
    "optimalRetryDelay": 300,
    "maxRetries": 3
  }
}
```

### GET `/api/v1/insights/fraud-flags`
List fraud-flagged transactions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "uuid",
      "riskScore": 0.87,
      "flags": ["high_amount", "unusual_country", "high_velocity"],
      "recommendation": "Manual review required"
    }
  ]
}
```

---

## ML Service

### GET `/health`
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "20260403_120000",
  "uptime_seconds": 3600
}
```

### POST `/predict`
**Request:**
```json
{
  "amount": 250.00,
  "device": "mobile",
  "country": "TR",
  "payment_method": "credit_card",
  "hour_of_day": 14,
  "day_of_week": 3
}
```

**Response:**
```json
{
  "prediction": "insufficient_funds",
  "confidence": 0.82,
  "probabilities": {
    "insufficient_funds": 0.82,
    "network_error": 0.10,
    "fraud_suspected": 0.05,
    "expired_card": 0.02,
    "invalid_credentials": 0.01
  }
}
```

### GET `/model/metrics`
```json
{
  "accuracy": 0.78,
  "precision_weighted": 0.77,
  "recall_weighted": 0.78,
  "f1_weighted": 0.77,
  "per_class": {
    "insufficient_funds": { "precision": 0.85, "recall": 0.88, "f1": 0.86 },
    "network_error": { "precision": 0.72, "recall": 0.70, "f1": 0.71 },
    "fraud_suspected": { "precision": 0.80, "recall": 0.75, "f1": 0.77 },
    "expired_card": { "precision": 0.68, "recall": 0.65, "f1": 0.66 },
    "invalid_credentials": { "precision": 0.60, "recall": 0.55, "f1": 0.57 }
  },
  "training_samples": 8000,
  "test_samples": 2000,
  "trained_at": "2026-04-03T12:00:00Z"
}
```
