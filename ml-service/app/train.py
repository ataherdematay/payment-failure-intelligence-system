"""
Training pipeline for the Payment Failure Reason Classifier.

Loads failed transactions from PostgreSQL, engineers features,
trains a RandomForest pipeline, evaluates on test set, and saves
the serialized model with a timestamp. Updates latest_model.joblib symlink.

Usage:
    python -m app.train
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ─── Paths & Config ───────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MODELS_DIR = BASE_DIR / "models"
LOGS_DIR = BASE_DIR / "logs"
MODELS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

TRAINING_HISTORY_FILE = LOGS_DIR / "training_history.json"

logging.basicConfig(
    level=getattr(logging, os.getenv("ML_LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("train")

# ─── Feature Definitions ──────────────────────────────────────────────────────

NUMERIC_FEATURES = ["amount", "hour_of_day", "day_of_week"]
CATEGORICAL_FEATURES = ["device", "country", "payment_method"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "failure_reason"

TARGET_CLASSES = [
    "insufficient_funds",
    "network_error",
    "fraud_suspected",
    "expired_card",
    "invalid_credentials",
]


# ─── Data Loading ─────────────────────────────────────────────────────────────

def load_data_from_postgres() -> pd.DataFrame:
    """Query all failed transactions from PostgreSQL using SQLAlchemy."""
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "pfis_db")
    user = os.getenv("POSTGRES_USER", "pfis")
    password = os.getenv("POSTGRES_PASSWORD", "pfis_secret_2026")

    logger.info("Connecting to PostgreSQL at %s:%s/%s", host, port, dbname)
    engine = create_engine(
        f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
    )

    query = """
        SELECT
            amount,
            device,
            country,
            payment_method,
            failure_reason,
            created_at
        FROM transactions
        WHERE status = 'failed'
          AND failure_reason IS NOT NULL
        ORDER BY created_at;
    """
    with engine.connect() as conn:
        df = pd.read_sql_query(query, conn)

    logger.info("Loaded %d failed transactions from PostgreSQL", len(df))
    return df


# ─── Feature Engineering ──────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract temporal features from created_at timestamp."""
    df = df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["hour_of_day"] = df["created_at"].dt.hour
    df["day_of_week"] = df["created_at"].dt.dayofweek  # Monday=0, Sunday=6
    df["amount"] = df["amount"].astype(float)
    return df


# ─── Pipeline Builder ─────────────────────────────────────────────────────────

def build_pipeline() -> Pipeline:
    """Build the sklearn Pipeline as specified in ml-model-spec.md."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )

    classifier = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ]
    )


# ─── Evaluation ───────────────────────────────────────────────────────────────

def evaluate_model(pipeline: Pipeline, X_test: pd.DataFrame,
                   y_test: pd.Series) -> dict:
    """Run full evaluation and return structured metrics dict."""
    y_pred = pipeline.predict(X_test)

    accuracy = float(accuracy_score(y_test, y_pred))
    precision_w = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    recall_w = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1_w = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    report = classification_report(
        y_test,
        y_pred,
        labels=TARGET_CLASSES,
        output_dict=True,
        zero_division=0,
    )

    per_class = {}
    for cls in TARGET_CLASSES:
        if cls in report:
            per_class[cls] = {
                "precision": round(report[cls]["precision"], 4),
                "recall": round(report[cls]["recall"], 4),
                "f1": round(report[cls]["f1-score"], 4),
            }

    logger.info("Confusion Matrix:\n%s",
                confusion_matrix(y_test, y_pred, labels=TARGET_CLASSES))
    logger.info("Classification Report:\n%s",
                classification_report(y_test, y_pred, labels=TARGET_CLASSES,
                                      zero_division=0))

    return {
        "accuracy": round(accuracy, 4),
        "precision_weighted": round(precision_w, 4),
        "recall_weighted": round(recall_w, 4),
        "f1_weighted": round(f1_w, 4),
        "per_class": per_class,
    }


# ─── Model Persistence ────────────────────────────────────────────────────────

def save_model(pipeline: Pipeline, version: str) -> Path:
    """Save the trained pipeline and update the latest_model symlink."""
    model_filename = f"model_{version}.joblib"
    model_path = MODELS_DIR / model_filename
    joblib.dump(pipeline, model_path)
    logger.info("Model saved → %s", model_path)

    # Update symlink to latest model
    symlink_path = MODELS_DIR / "latest_model.joblib"
    if symlink_path.exists() or symlink_path.is_symlink():
        symlink_path.unlink()
    symlink_path.symlink_to(model_path)
    logger.info("Symlink updated → %s → %s", symlink_path, model_path)

    return model_path


def append_training_history(metrics: dict, version: str,
                            training_samples: int, test_samples: int) -> None:
    """Append training run metadata to training_history.json."""
    record = {
        "version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": training_samples,
        "test_samples": test_samples,
        **metrics,
    }

    history: list = []
    if TRAINING_HISTORY_FILE.exists():
        with open(TRAINING_HISTORY_FILE, "r") as f:
            try:
                history = json.load(f)
            except json.JSONDecodeError:
                history = []

    history.append(record)

    with open(TRAINING_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)

    logger.info("Training history updated → %s", TRAINING_HISTORY_FILE)


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def train() -> dict:
    """
    Full training pipeline. Returns the metrics dict.
    Called directly or via /model/retrain endpoint.
    """
    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    logger.info("═══ Starting Training Run [version=%s] ═══", version)

    # 1. Load data
    df = load_data_from_postgres()
    if len(df) < 100:
        raise ValueError(
            f"Insufficient training data: {len(df)} records. "
            "Run the data generator and seeder first."
        )

    # 2. Feature engineering
    df = engineer_features(df)

    # 3. Prepare X and y
    X = df[ALL_FEATURES]
    y = df[TARGET]

    logger.info("Class distribution:\n%s", y.value_counts().to_string())

    # 4. Stratified 80/20 split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    logger.info("Train: %d  |  Test: %d", len(X_train), len(X_test))

    # 5. Build and train pipeline
    pipeline = build_pipeline()
    logger.info("Training RandomForest pipeline…")
    pipeline.fit(X_train, y_train)
    logger.info("Training complete.")

    # 6. Evaluate
    metrics = evaluate_model(pipeline, X_test, y_test)
    logger.info(
        "F1 (weighted): %.4f  |  Accuracy: %.4f",
        metrics["f1_weighted"],
        metrics["accuracy"],
    )

    # Minimum threshold check
    if metrics["f1_weighted"] < 0.70:
        logger.warning(
            "⚠️  F1 %.4f is below the production threshold of 0.70. "
            "Model saved but review recommended.",
            metrics["f1_weighted"],
        )

    # 7. Save model + symlink + history
    save_model(pipeline, version)
    append_training_history(
        metrics, version,
        training_samples=len(X_train),
        test_samples=len(X_test),
    )

    logger.info("═══ Training Run Complete [version=%s] ═══", version)
    return {**metrics, "version": version,
            "training_samples": len(X_train), "test_samples": len(X_test),
            "trained_at": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    try:
        result = train()
        print(f"\n✅ Training complete! Model version: {result['version']}")
        print(f"   F1 (weighted):  {result['f1_weighted']:.4f}")
        print(f"   Accuracy:       {result['accuracy']:.4f}")
        print(f"   Train samples:  {result['training_samples']:,}")
        print(f"   Test samples:   {result['test_samples']:,}")
    except Exception as exc:
        logger.error("Training failed: %s", exc)
        sys.exit(1)
