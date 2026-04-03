# Insight Engine Specification

## Overview

The Insight Engine is a **rule-based analytical system** that generates natural language insights from payment transaction data. It provides actionable intelligence that helps payment operations teams reduce failure rates.

## Insight Categories

### 1. Device Analysis
**Rule**: Compare failure rates across device types.

```
IF mobile_failure_rate > desktop_failure_rate * 1.15 THEN
  severity = HIGH
  insight = "Mobile users have {diff}% higher failure rate ({mobile_rate}%) compared to desktop ({desktop_rate}%)"
  recommendation = "Audit mobile SDK payment flow. Check for connection timeout settings and 3DS challenge rendering."
```

### 2. Country Analysis
**Rule**: Identify countries with above-average failure rates.

```
IF country_failure_rate > global_failure_rate * 1.20 THEN
  severity = HIGH if diff > 15% else MEDIUM
  insight = "Transactions from {country} have {rate}% failure rate, {diff}% above average"
  recommendation = "Review local payment provider integration. Consider adding local acquirer for {country}."
```

### 3. Amount Segmentation
**Rule**: Analyze failure rates by transaction amount brackets.

```
Brackets: [0-50, 50-200, 200-500, 500-2000, 2000+]

IF bracket_failure_rate > avg_failure_rate * 1.25 THEN
  severity = MEDIUM
  insight = "Transactions between ${min}-${max} have {rate}% failure rate"
  recommendation = "High-value transactions may trigger additional verification. Consider pre-auth for amounts > ${threshold}."
```

### 4. Temporal Analysis
**Rule**: Detect time-based failure patterns.

```
IF hourly_failure_rate[hour] > daily_avg * 1.30 THEN
  severity = HIGH if hour is peak_business_hour else MEDIUM
  insight = "Failure rates spike by {diff}% between {start_hour}:00 and {end_hour}:00"
  recommendation = "Potential gateway capacity issues during off-peak hours. Coordinate with payment provider."

IF weekend_failure_rate > weekday_failure_rate * 1.15 THEN
  insight = "Weekend transactions fail {diff}% more often"
  recommendation = "Weekend support coverage from payment providers may be reduced."
```

### 5. Payment Method Analysis
**Rule**: Compare failure rates across payment methods.

```
IF method_failure_rate > lowest_method_rate * 1.30 THEN
  severity = MEDIUM
  insight = "{method} has {rate}% failure rate, {diff}% higher than {best_method}"
  recommendation = "Promote {best_method} as preferred payment option. Review {method} integration."
```

### 6. Gateway Analysis
**Rule**: Monitor gateway performance.

```
IF gateway_failure_rate > avg_gateway_rate * 1.25 THEN
  severity = HIGH
  insight = "Gateway '{gateway}' has {rate}% failure rate, significantly above average ({avg}%)"
  recommendation = "Contact {gateway} support. Consider routing traffic to backup gateway."
```

## Retry Suggestion Engine

### Logic
```python
def should_retry(transaction):
    # Never retry fraud
    if transaction.failure_reason == 'fraud_suspected':
        return RetryDecision(recommended=False, probability=0, reason="Fraud-flagged transactions should not be retried")
    
    # Never retry expired cards
    if transaction.failure_reason == 'expired_card':
        return RetryDecision(recommended=False, probability=0, reason="Card is expired — customer must update payment method")
    
    # Retry limit check
    if transaction.retry_count >= 3:
        return RetryDecision(recommended=False, probability=0.1, reason="Maximum retry attempts reached")
    
    # Network errors have high retry success
    if transaction.failure_reason == 'network_error':
        base_prob = 0.75 - (transaction.retry_count * 0.15)
        return RetryDecision(
            recommended=True,
            probability=base_prob,
            reason=f"Network errors are typically transient. Historical retry success rate: {base_prob*100:.0f}%",
            delay=calculate_backoff(transaction.retry_count)
        )
    
    # Insufficient funds — depends on amount and timing
    if transaction.failure_reason == 'insufficient_funds':
        # Lower amounts have higher retry success
        amount_factor = max(0.3, 1 - (transaction.amount / 1000))
        # Time factor — waiting longer increases chances
        prob = 0.35 * amount_factor
        return RetryDecision(
            recommended=prob > 0.25,
            probability=prob,
            reason="Customer may deposit funds. Schedule retry during business hours.",
            delay=3600  # 1 hour minimum
        )
    
    # Invalid credentials
    if transaction.failure_reason == 'invalid_credentials':
        return RetryDecision(
            recommended=False,
            probability=0.05,
            reason="Payment credentials are incorrect. Prompt customer to re-enter details."
        )

def calculate_backoff(retry_count):
    """Exponential backoff with jitter"""
    base_delay = 60  # 1 minute
    return min(base_delay * (2 ** retry_count) + random.randint(0, 30), 3600)
```

## Fraud Flagging System

### Risk Score Calculation
The risk score combines multiple signals:

```python
def calculate_risk_score(transaction):
    score = 0.0
    
    # Amount-based risk
    if transaction.amount > 2000:
        score += 0.25
    elif transaction.amount > 500:
        score += 0.15
    elif transaction.amount > 200:
        score += 0.05
    
    # Country risk
    high_risk_countries = ['BR', 'IN']  # Configurable
    if transaction.country in high_risk_countries:
        score += 0.15
    
    # Device risk
    if transaction.device == 'mobile':
        score += 0.05
    
    # Time risk (transactions between 1-5 AM are higher risk)
    hour = transaction.created_at.hour
    if 1 <= hour <= 5:
        score += 0.15
    
    # Velocity check (multiple failed transactions from same user)
    recent_failures = count_recent_failures(transaction.user_id, hours=24)
    if recent_failures >= 5:
        score += 0.30
    elif recent_failures >= 3:
        score += 0.15
    
    # Payment method risk
    if transaction.payment_method == 'bank_transfer' and transaction.amount > 1000:
        score += 0.10
    
    return min(score, 1.0)
```

### Fraud Flags
| Flag | Condition | Description |
|------|-----------|-------------|
| `high_amount` | amount > $2000 | Unusually large transaction |
| `unusual_country` | Country in high-risk list | Transaction from high-risk geography |
| `high_velocity` | 5+ failures in 24h from same user | Potential brute-force or testing |
| `off_hours` | Transaction between 1-5 AM local time | Unusual transaction timing |
| `method_amount_mismatch` | bank_transfer > $1000 | Large bank transfer (higher fraud risk) |

### Severity Levels
| Risk Score | Severity | Action |
|-----------|----------|--------|
| 0.00 - 0.30 | LOW | No action |
| 0.30 - 0.60 | MEDIUM | Flag for monitoring |
| 0.60 - 0.80 | HIGH | Flag for manual review |
| 0.80 - 1.00 | CRITICAL | Auto-block + notify |

## Insight Output Format

```typescript
interface Insight {
  id: string;                    // Unique insight identifier
  type: InsightType;             // Category of insight
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;                 // Short headline
  description: string;           // Natural language explanation
  metric: {                      // Supporting data
    value: number;
    comparison?: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  };
  recommendation: string;        // Actionable next step
  affectedTransactions: number;  // How many transactions affected
  generatedAt: string;           // ISO timestamp
}

enum InsightType {
  DEVICE_ANALYSIS = 'device_analysis',
  COUNTRY_ANALYSIS = 'country_analysis',
  AMOUNT_ANALYSIS = 'amount_analysis',
  TEMPORAL_ANALYSIS = 'temporal_analysis',
  PAYMENT_METHOD_ANALYSIS = 'payment_method_analysis',
  GATEWAY_ANALYSIS = 'gateway_analysis',
  RETRY_SUGGESTION = 'retry_suggestion',
  FRAUD_FLAG = 'fraud_flag'
}
```
