#!/usr/bin/env python3
"""
Payment Failure Intelligence System — Synthetic Data Generator

Generates realistic payment transaction data with configurable distributions
for failure reasons, countries, devices, and temporal patterns.
"""

import argparse
import csv
import json
import os
import uuid
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np

# ─── Distribution Configurations ──────────────────────────────────────────────

COUNTRIES = {
    'TR': 0.30, 'US': 0.25, 'DE': 0.15,
    'UK': 0.12, 'BR': 0.10, 'IN': 0.08
}

DEVICES = {'mobile': 0.55, 'desktop': 0.35, 'tablet': 0.10}

PAYMENT_METHODS = {
    'credit_card': 0.45, 'debit_card': 0.25,
    'bank_transfer': 0.15, 'digital_wallet': 0.15
}

GATEWAYS = {
    'stripe': 0.35, 'paypal': 0.25, 'adyen': 0.20,
    'square': 0.10, 'braintree': 0.10
}

FAILURE_REASONS = {
    'insufficient_funds': 0.40, 'network_error': 0.25,
    'fraud_suspected': 0.15, 'expired_card': 0.12,
    'invalid_credentials': 0.08
}

CURRENCIES_BY_COUNTRY = {
    'TR': 'TRY', 'US': 'USD', 'DE': 'EUR',
    'UK': 'GBP', 'BR': 'BRL', 'IN': 'INR'
}

# Failure rate modifiers
DEVICE_FAILURE_MODIFIER = {'mobile': 0.08, 'desktop': 0.0, 'tablet': 0.03}
METHOD_FAILURE_MODIFIER = {
    'credit_card': 0.0, 'debit_card': 0.05,
    'bank_transfer': 0.10, 'digital_wallet': -0.05
}
COUNTRY_FAILURE_MODIFIER = {
    'TR': 0.0, 'US': -0.03, 'DE': -0.02,
    'UK': -0.01, 'BR': 0.08, 'IN': 0.06
}

BASE_FAILURE_RATE = 0.30


def weighted_choice(options: dict) -> str:
    """Pick a random key from a dict weighted by its values."""
    keys = list(options.keys())
    weights = list(options.values())
    return random.choices(keys, weights=weights, k=1)[0]


def generate_amount() -> float:
    """Generate a log-normal distributed transaction amount."""
    amount = np.random.lognormal(mean=4.5, sigma=1.2)
    amount = max(1.0, min(amount, 10000.0))
    return round(amount, 2)


def calculate_failure_rate(device: str, method: str, country: str,
                           hour: int) -> float:
    """Calculate dynamic failure rate based on transaction attributes."""
    rate = BASE_FAILURE_RATE
    rate += DEVICE_FAILURE_MODIFIER.get(device, 0)
    rate += METHOD_FAILURE_MODIFIER.get(method, 0)
    rate += COUNTRY_FAILURE_MODIFIER.get(country, 0)

    # Night-time spike (2-5 AM)
    if 2 <= hour <= 5:
        rate += 0.12
    # Late night slight increase
    elif 22 <= hour or hour <= 1:
        rate += 0.05

    return max(0.05, min(rate, 0.80))


def determine_failure_reason(amount: float, device: str, country: str,
                              hour: int) -> str:
    """Determine failure reason with context-aware weighting."""
    weights = dict(FAILURE_REASONS)

    # High amounts → more insufficient_funds and fraud
    if amount > 500:
        weights['insufficient_funds'] *= 1.3
        weights['fraud_suspected'] *= 1.5
    elif amount > 200:
        weights['insufficient_funds'] *= 1.15

    # Night hours → more network errors
    if 2 <= hour <= 5:
        weights['network_error'] *= 1.8

    # Mobile → more invalid credentials
    if device == 'mobile':
        weights['invalid_credentials'] *= 1.4

    # High-risk countries → more fraud
    if country in ('BR', 'IN'):
        weights['fraud_suspected'] *= 1.4

    return weighted_choice(weights)


def calculate_risk_score(failure_reason: Optional[str], amount: float,
                          country: str, hour: int, status: str) -> float:
    """Calculate risk score based on transaction attributes."""
    if status == 'success':
        score = random.uniform(0.01, 0.25)
        return round(score, 2)

    score = 0.1

    # Failure-reason based
    if failure_reason == 'fraud_suspected':
        score += random.uniform(0.4, 0.6)
    elif failure_reason == 'insufficient_funds':
        score += random.uniform(0.05, 0.25)
    elif failure_reason == 'network_error':
        score += random.uniform(0.02, 0.15)
    elif failure_reason == 'expired_card':
        score += random.uniform(0.05, 0.15)
    elif failure_reason == 'invalid_credentials':
        score += random.uniform(0.1, 0.3)

    # Amount modifier
    if amount > 2000:
        score += 0.2
    elif amount > 500:
        score += 0.1

    # Country modifier
    if country in ('BR', 'IN'):
        score += 0.1

    # Night modifier
    if 1 <= hour <= 5:
        score += 0.1

    return round(min(score, 1.0), 2)


def generate_retry_count(failure_reason: Optional[str], status: str) -> int:
    """Generate retry count based on failure type."""
    if status == 'success':
        return random.choices([0, 1, 2], weights=[0.80, 0.15, 0.05], k=1)[0]

    retry_map = {
        'network_error': random.choices([1, 2, 3], weights=[0.4, 0.4, 0.2])[0],
        'insufficient_funds': random.choices([0, 1], weights=[0.6, 0.4])[0],
        'fraud_suspected': 0,
        'expired_card': random.choices([0, 1], weights=[0.7, 0.3])[0],
        'invalid_credentials': random.choices([0, 1, 2], weights=[0.5, 0.35, 0.15])[0],
    }
    return retry_map.get(failure_reason, 0)


def generate_timestamp(start_date: datetime, end_date: datetime) -> datetime:
    """Generate a timestamp with realistic hourly distribution."""
    day = start_date + timedelta(
        seconds=random.randint(0, int((end_date - start_date).total_seconds()))
    )
    # Bias towards business hours (10 AM - 8 PM)
    hour_weights = [
        0.5, 0.3, 0.3, 0.2, 0.2, 0.3,    # 0-5
        0.5, 0.8, 1.2, 1.5, 2.0, 2.2,     # 6-11
        2.5, 2.5, 2.3, 2.0, 2.0, 2.2,     # 12-17
        2.5, 2.3, 2.0, 1.5, 1.0, 0.7      # 18-23
    ]
    hour = random.choices(range(24), weights=hour_weights, k=1)[0]
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return day.replace(hour=hour, minute=minute, second=second)


def generate_transactions(count: int, start_date: datetime,
                           end_date: datetime) -> List[Dict]:
    """Generate a list of synthetic payment transactions."""
    # Create a pool of user IDs (~count/5 unique users)
    num_users = max(100, count // 5)
    user_ids = [f"usr_{uuid.uuid4().hex[:8]}" for _ in range(num_users)]

    transactions = []

    for _ in range(count):
        user_id = random.choice(user_ids)
        country = weighted_choice(COUNTRIES)
        device = weighted_choice(DEVICES)
        payment_method = weighted_choice(PAYMENT_METHODS)
        gateway = weighted_choice(GATEWAYS)
        amount = generate_amount()
        currency = CURRENCIES_BY_COUNTRY[country]
        timestamp = generate_timestamp(start_date, end_date)
        hour = timestamp.hour

        # Determine status
        failure_rate = calculate_failure_rate(device, payment_method,
                                               country, hour)
        is_failed = random.random() < failure_rate
        status = 'failed' if is_failed else 'success'

        # Failure details
        failure_reason = None
        if status == 'failed':
            failure_reason = determine_failure_reason(amount, device,
                                                       country, hour)

        risk_score = calculate_risk_score(failure_reason, amount, country,
                                           hour, status)
        retry_count = generate_retry_count(failure_reason, status)

        transactions.append({
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'amount': amount,
            'currency': currency,
            'country': country,
            'device': device,
            'payment_method': payment_method,
            'gateway': gateway,
            'status': status,
            'failure_reason': failure_reason,
            'retry_count': retry_count,
            'risk_score': risk_score,
            'created_at': timestamp.isoformat(),
            'updated_at': timestamp.isoformat(),
        })

    # Sort by timestamp
    transactions.sort(key=lambda t: t['created_at'])
    return transactions


def save_csv(transactions: List[Dict], filepath: str):
    """Save transactions to CSV file."""
    os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=transactions[0].keys())
        writer.writeheader()
        writer.writerows(transactions)
    print(f"✅ Saved {len(transactions)} transactions to {filepath}")


def save_json(transactions: List[Dict], filepath: str):
    """Save transactions to JSON file."""
    os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(transactions, f, indent=2, default=str)
    print(f"✅ Saved {len(transactions)} transactions to {filepath}")


def print_stats(transactions: List[Dict]):
    """Print summary statistics of the generated data."""
    total = len(transactions)
    failed = sum(1 for t in transactions if t['status'] == 'failed')
    success = total - failed

    print(f"\n{'='*60}")
    print(f"📊 GENERATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total transactions:  {total:,}")
    print(f"Successful:          {success:,} ({success/total*100:.1f}%)")
    print(f"Failed:              {failed:,} ({failed/total*100:.1f}%)")

    # Failure reason breakdown
    reasons = {}
    for t in transactions:
        if t['failure_reason']:
            reasons[t['failure_reason']] = reasons.get(t['failure_reason'], 0) + 1

    print(f"\n📋 Failure Reasons:")
    for reason, count in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"  {reason:<25} {count:>5} ({count/failed*100:.1f}%)")

    # Country breakdown
    countries = {}
    for t in transactions:
        countries[t['country']] = countries.get(t['country'], 0) + 1

    print(f"\n🌍 Countries:")
    for country, count in sorted(countries.items(), key=lambda x: -x[1]):
        country_failed = sum(
            1 for t in transactions
            if t['country'] == country and t['status'] == 'failed'
        )
        print(f"  {country}: {count:>5} total, "
              f"{country_failed/count*100:.1f}% failure rate")

    # Device breakdown
    devices = {}
    for t in transactions:
        devices[t['device']] = devices.get(t['device'], 0) + 1

    print(f"\n📱 Devices:")
    for device, count in sorted(devices.items(), key=lambda x: -x[1]):
        dev_failed = sum(
            1 for t in transactions
            if t['device'] == device and t['status'] == 'failed'
        )
        print(f"  {device:<10} {count:>5} total, "
              f"{dev_failed/count*100:.1f}% failure rate")

    # Unique users
    unique_users = len(set(t['user_id'] for t in transactions))
    print(f"\n👥 Unique Users: {unique_users:,}")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Generate synthetic payment transaction data'
    )
    parser.add_argument('--count', type=int, default=10000,
                        help='Number of transactions to generate (default: 10000)')
    parser.add_argument('--output', choices=['csv', 'json', 'both'],
                        default='csv',
                        help='Output format (default: csv)')
    parser.add_argument('--start-date', type=str, default=None,
                        help='Start date YYYY-MM-DD (default: 90 days ago)')
    parser.add_argument('--end-date', type=str, default=None,
                        help='End date YYYY-MM-DD (default: today)')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed for reproducibility')

    args = parser.parse_args()

    # Set seeds
    random.seed(args.seed)
    np.random.seed(args.seed)

    # Date range
    end_date = (datetime.fromisoformat(args.end_date)
                if args.end_date else datetime.now())
    start_date = (datetime.fromisoformat(args.start_date)
                  if args.start_date else end_date - timedelta(days=90))

    print(f"🚀 Generating {args.count:,} transactions...")
    print(f"📅 Date range: {start_date.date()} → {end_date.date()}")

    transactions = generate_transactions(args.count, start_date, end_date)
    print_stats(transactions)

    output_dir = os.path.join(os.path.dirname(__file__), 'output')

    if args.output in ('csv', 'both'):
        save_csv(transactions, os.path.join(output_dir, 'transactions.csv'))

    if args.output in ('json', 'both'):
        save_json(transactions, os.path.join(output_dir, 'transactions.json'))


if __name__ == '__main__':
    main()
