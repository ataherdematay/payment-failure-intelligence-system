# Data Schema & Generation Specification

## Transaction Entity Schema

```sql
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(50) NOT NULL,
    amount          DECIMAL(12, 2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    country         VARCHAR(2) NOT NULL,
    device          VARCHAR(10) NOT NULL CHECK (device IN ('mobile', 'desktop', 'tablet')),
    payment_method  VARCHAR(20) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet')),
    gateway         VARCHAR(30) NOT NULL,
    status          VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    failure_reason  VARCHAR(25) CHECK (failure_reason IN ('insufficient_funds', 'fraud_suspected', 'network_error', 'expired_card', 'invalid_credentials')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    risk_score      DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_failure_reason ON transactions(failure_reason);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_country ON transactions(country);
CREATE INDEX idx_transactions_device ON transactions(device);
CREATE INDEX idx_transactions_status_created ON transactions(status, created_at);
```

## Data Generation Rules

### Volume
- Default: **10,000 transactions**
- Date range: last 90 days
- Unique users: ~2,000 (multiple transactions per user)

### Status Distribution
| Status | Percentage |
|--------|-----------|
| success | 70% |
| failed | 30% |

### Failure Reason Distribution (within failed transactions)
| Reason | Percentage | Conditions |
|--------|-----------|------------|
| insufficient_funds | 40% | Higher for amounts > $200, mobile |
| network_error | 25% | Higher at night (2-5 AM), weekends |
| fraud_suspected | 15% | Higher for amounts > $500, unusual countries |
| expired_card | 12% | Random across all |
| invalid_credentials | 8% | Higher on mobile, new users |

### Country Distribution
| Country | Code | Percentage | Notes |
|---------|------|-----------|-------|
| Turkey | TR | 30% | Primary market |
| United States | US | 25% | |
| Germany | DE | 15% | |
| United Kingdom | UK | 12% | |
| Brazil | BR | 10% | Higher failure rate |
| India | IN | 8% | Higher failure rate |

### Device Distribution
| Device | Percentage | Failure Rate Modifier |
|--------|-----------|----------------------|
| mobile | 55% | +8% failure rate |
| desktop | 35% | baseline |
| tablet | 10% | +3% failure rate |

### Payment Method Distribution
| Method | Percentage | Failure Rate Modifier |
|--------|-----------|----------------------|
| credit_card | 45% | baseline |
| debit_card | 25% | +5% failure rate |
| bank_transfer | 15% | +10% failure rate |
| digital_wallet | 15% | -5% failure rate |

### Gateway Distribution
| Gateway | Percentage |
|---------|-----------|
| stripe | 35% |
| paypal | 25% |
| adyen | 20% |
| square | 10% |
| braintree | 10% |

### Amount Distribution
- Range: $1.00 - $10,000.00
- Distribution: Log-normal (mean ~$150, long tail)
- Buckets:
  - $1 - $50: 30%
  - $50 - $200: 35%
  - $200 - $500: 20%
  - $500 - $2000: 10%
  - $2000+: 5%

### Temporal Patterns
- **Hour of day**: Transactions peak between 10 AM - 8 PM; failures spike 2-5 AM
- **Day of week**: Lower volume on weekends; slightly higher failure rate
- **Monthly**: Random within the 90-day window

### Risk Score Generation
| Scenario | Risk Score Range |
|----------|-----------------|
| Normal transaction | 0.01 - 0.30 |
| Slightly elevated | 0.30 - 0.60 |
| High risk (fraud likely) | 0.60 - 0.85 |
| Critical risk | 0.85 - 1.00 |

Rules:
- `fraud_suspected` failures: risk_score > 0.6
- `insufficient_funds`: risk_score 0.1 - 0.4
- `network_error`: risk_score 0.05 - 0.25
- High amounts (>$1000) in unusual countries: risk_score + 0.2

### Retry Count Generation
| Status | Retry Count |
|--------|-------------|
| success | 0-2 (weighted: 80% zero, 15% one, 5% two) |
| failed (network_error) | 1-3 |
| failed (insufficient_funds) | 0-1 |
| failed (fraud_suspected) | 0 (never retry fraud) |
| failed (expired_card) | 0-1 |
| failed (invalid_credentials) | 0-2 |

## Sample Records

```json
[
  {
    "user_id": "usr_a1b2c3",
    "amount": 250.00,
    "currency": "USD",
    "country": "TR",
    "device": "mobile",
    "payment_method": "credit_card",
    "gateway": "stripe",
    "status": "failed",
    "failure_reason": "insufficient_funds",
    "retry_count": 1,
    "risk_score": 0.25,
    "created_at": "2026-03-15T14:32:00Z"
  },
  {
    "user_id": "usr_d4e5f6",
    "amount": 1500.00,
    "currency": "USD",
    "country": "BR",
    "device": "desktop",
    "payment_method": "bank_transfer",
    "gateway": "adyen",
    "status": "failed",
    "failure_reason": "fraud_suspected",
    "retry_count": 0,
    "risk_score": 0.82,
    "created_at": "2026-03-20T03:15:00Z"
  },
  {
    "user_id": "usr_g7h8i9",
    "amount": 45.99,
    "currency": "EUR",
    "country": "DE",
    "device": "tablet",
    "payment_method": "digital_wallet",
    "gateway": "paypal",
    "status": "success",
    "failure_reason": null,
    "retry_count": 0,
    "risk_score": 0.05,
    "created_at": "2026-04-01T11:45:00Z"
  }
]
```
