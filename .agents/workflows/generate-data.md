---
description: Generate synthetic payment data and seed the database
---

# Data Generation Workflow

Generate realistic synthetic payment transaction data and load it into PostgreSQL.

## Prerequisites
- PostgreSQL running locally with `pfis_db` database created

## Steps

// turbo-all

1. **Activate Python environment**
```bash
cd "/Users/ata/Payment Failure Intelligence System/data-generator"
source venv/bin/activate || (python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt)
```

2. **Generate 10k transactions**
```bash
cd "/Users/ata/Payment Failure Intelligence System/data-generator"
source venv/bin/activate && python generate.py --count 10000 --output csv
```

3. **Seed database**
```bash
cd "/Users/ata/Payment Failure Intelligence System/data-generator"
source venv/bin/activate && python seed_db.py
```

4. **Verify data count**
```bash
psql -U pfis -d pfis_db -c "SELECT status, COUNT(*) FROM transactions GROUP BY status;"
```

5. **Retrain ML model with new data**
```bash
cd "/Users/ata/Payment Failure Intelligence System/ml-service"
source venv/bin/activate && python -m app.train
```

## Options
- `--count N` — Number of records to generate (default: 10000)
- `--output csv|json|both` — Output format
- `--start-date YYYY-MM-DD` — Start date for timestamps
- `--end-date YYYY-MM-DD` — End date for timestamps
