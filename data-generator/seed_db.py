#!/usr/bin/env python3
"""
Database Seeder — Loads generated CSV data into PostgreSQL.
"""

import csv
import os
import sys
import argparse
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', '5432')),
    'database': os.getenv('POSTGRES_DB', 'pfis_db'),
    'user': os.getenv('POSTGRES_USER', 'pfis'),
    'password': os.getenv('POSTGRES_PASSWORD', 'pfis_secret_2026'),
}

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    country VARCHAR(2) NOT NULL,
    device VARCHAR(10) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    gateway VARCHAR(30) NOT NULL,
    status VARCHAR(10) NOT NULL,
    failure_reason VARCHAR(25),
    retry_count INTEGER NOT NULL DEFAULT 0,
    risk_score DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_failure_reason ON transactions(failure_reason);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_country ON transactions(country);
CREATE INDEX IF NOT EXISTS idx_transactions_device ON transactions(device);
CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
"""

INSERT_SQL = """
INSERT INTO transactions (
    id, user_id, amount, currency, country, device, payment_method,
    gateway, status, failure_reason, retry_count, risk_score,
    created_at, updated_at
) VALUES %s
ON CONFLICT (id) DO NOTHING
"""

COLUMNS = [
    'id', 'user_id', 'amount', 'currency', 'country', 'device',
    'payment_method', 'gateway', 'status', 'failure_reason',
    'retry_count', 'risk_score', 'created_at', 'updated_at'
]


def seed_database(csv_path: str, batch_size: int = 1000):
    """Read CSV and bulk insert into PostgreSQL."""
    print(f"📂 Reading: {csv_path}")

    rows = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle empty failure_reason
            if row['failure_reason'] == '' or row['failure_reason'] == 'None':
                row['failure_reason'] = None
            rows.append(tuple(row[col] for col in COLUMNS))

    print(f"📊 Loaded {len(rows):,} records")
    print(f"🔌 Connecting to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Create table
        print("📋 Creating table (if not exists)...")
        cur.execute(CREATE_TABLE_SQL)
        conn.commit()

        # Clear existing data
        cur.execute("DELETE FROM transactions")
        conn.commit()
        print("🗑️  Cleared existing data")

        # Bulk insert in batches
        total_inserted = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            execute_values(cur, INSERT_SQL, batch, page_size=batch_size)
            conn.commit()
            total_inserted += len(batch)
            pct = total_inserted / len(rows) * 100
            print(f"  ⏳ Inserted {total_inserted:,}/{len(rows):,} ({pct:.0f}%)")

        # Verify
        cur.execute("SELECT COUNT(*) FROM transactions")
        count = cur.fetchone()[0]
        cur.execute(
            "SELECT status, COUNT(*) FROM transactions GROUP BY status"
        )
        status_counts = dict(cur.fetchall())

        print(f"\n{'='*50}")
        print(f"✅ DATABASE SEEDED SUCCESSFULLY")
        print(f"{'='*50}")
        print(f"Total records: {count:,}")
        for status, cnt in status_counts.items():
            print(f"  {status}: {cnt:,}")
        print(f"{'='*50}\n")

        cur.close()
        conn.close()

    except psycopg2.OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        print("   Make sure PostgreSQL is running (brew services start postgresql@16)")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Seed PostgreSQL with transaction data')
    parser.add_argument('--file', type=str,
                        default=os.path.join(os.path.dirname(__file__),
                                             'output', 'transactions.csv'),
                        help='Path to CSV file')
    parser.add_argument('--batch-size', type=int, default=1000,
                        help='Batch size for inserts (default: 1000)')
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        print("   Run 'python generate.py' first to generate data")
        sys.exit(1)

    seed_database(args.file, args.batch_size)


if __name__ == '__main__':
    main()
