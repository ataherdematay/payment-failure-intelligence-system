"""
Test suite for the ML model training pipeline and ModelService.

Tests:
    - Feature engineering correctness
    - Model pipeline training on synthetic data
    - Prediction output format and class validity
    - Model serialization / deserialization
    - Minimum accuracy threshold (>= 0.60)
"""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

# ─── Fixtures ────────────────────────────────────────────────────────────────

TARGET_CLASSES = [
    "insufficient_funds",
    "network_error",
    "fraud_suspected",
    "expired_card",
    "invalid_credentials",
]

DEVICES = ["mobile", "desktop", "tablet"]
COUNTRIES = ["TR", "US", "DE", "UK", "BR", "IN"]
PAYMENT_METHODS = ["credit_card", "debit_card", "bank_transfer", "digital_wallet"]


def make_synthetic_df(n: int = 500, seed: int = 42) -> pd.DataFrame:
    """Create a small synthetic dataset that mimics the real training data."""
    rng = np.random.default_rng(seed)

    # Equal class distribution for reliable testing
    per_class = n // len(TARGET_CLASSES)
    records = []
    for cls in TARGET_CLASSES:
        for _ in range(per_class):
            records.append(
                {
                    "amount": float(rng.uniform(1.0, 5000.0)),
                    "device": rng.choice(DEVICES),
                    "country": rng.choice(COUNTRIES),
                    "payment_method": rng.choice(PAYMENT_METHODS),
                    "hour_of_day": int(rng.integers(0, 24)),
                    "day_of_week": int(rng.integers(0, 7)),
                    "failure_reason": cls,
                }
            )
    df = pd.DataFrame(records)
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


@pytest.fixture(scope="module")
def synthetic_df():
    return make_synthetic_df(n=500)


@pytest.fixture(scope="module")
def trained_pipeline(synthetic_df):
    """Train a pipeline on synthetic data and return it."""
    from app.train import ALL_FEATURES, TARGET, build_pipeline
    from sklearn.model_selection import train_test_split

    X = synthetic_df[ALL_FEATURES]
    y = synthetic_df[TARGET]
    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    return pipeline


# ─── Feature Engineering Tests ───────────────────────────────────────────────

class TestFeatureEngineering:
    def test_engineer_features_adds_hour_and_day(self):
        from app.train import engineer_features

        df = pd.DataFrame({
            "amount": [150.0],
            "device": ["mobile"],
            "country": ["TR"],
            "payment_method": ["credit_card"],
            "failure_reason": ["insufficient_funds"],
            "created_at": [datetime(2026, 4, 3, 14, 30, 0, tzinfo=timezone.utc)],
        })
        result = engineer_features(df)
        assert "hour_of_day" in result.columns
        assert "day_of_week" in result.columns
        assert result["hour_of_day"].iloc[0] == 14
        assert result["day_of_week"].iloc[0] == 4  # Friday

    def test_hour_of_day_range(self):
        from app.train import engineer_features

        timestamps = pd.date_range("2026-01-01", periods=24, freq="h", tz="UTC")
        df = pd.DataFrame({
            "amount": [50.0] * 24,
            "device": ["mobile"] * 24,
            "country": ["TR"] * 24,
            "payment_method": ["credit_card"] * 24,
            "failure_reason": ["network_error"] * 24,
            "created_at": timestamps,
        })
        result = engineer_features(df)
        assert result["hour_of_day"].min() == 0
        assert result["hour_of_day"].max() == 23

    def test_day_of_week_range(self):
        from app.train import engineer_features

        timestamps = pd.date_range("2026-01-01", periods=7, freq="D", tz="UTC")
        df = pd.DataFrame({
            "amount": [50.0] * 7,
            "device": ["mobile"] * 7,
            "country": ["TR"] * 7,
            "payment_method": ["credit_card"] * 7,
            "failure_reason": ["expired_card"] * 7,
            "created_at": timestamps,
        })
        result = engineer_features(df)
        assert set(result["day_of_week"].tolist()).issubset(set(range(7)))


# ─── Pipeline Build Tests ─────────────────────────────────────────────────────

class TestPipelineBuild:
    def test_build_pipeline_returns_pipeline(self):
        from app.train import build_pipeline

        pipeline = build_pipeline()
        assert isinstance(pipeline, Pipeline)

    def test_pipeline_has_preprocessor_and_classifier(self):
        from app.train import build_pipeline

        pipeline = build_pipeline()
        step_names = [name for name, _ in pipeline.steps]
        assert "preprocessor" in step_names
        assert "classifier" in step_names

    def test_classifier_is_random_forest(self):
        from app.train import build_pipeline

        pipeline = build_pipeline()
        clf = pipeline.named_steps["classifier"]
        assert isinstance(clf, RandomForestClassifier)
        assert clf.n_estimators == 200
        assert clf.class_weight == "balanced"
        assert clf.random_state == 42


# ─── Training & Accuracy Tests ────────────────────────────────────────────────

class TestModelTraining:
    def test_pipeline_fits_without_error(self, synthetic_df):
        from app.train import ALL_FEATURES, TARGET, build_pipeline

        X = synthetic_df[ALL_FEATURES]
        y = synthetic_df[TARGET]
        pipeline = build_pipeline()
        pipeline.fit(X, y)  # Should not raise

    def test_model_accuracy_above_threshold(self, trained_pipeline, synthetic_df):
        from app.train import ALL_FEATURES, TARGET
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score

        X = synthetic_df[ALL_FEATURES]
        y = synthetic_df[TARGET]
        _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        y_pred = trained_pipeline.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        assert acc >= 0.60, f"Accuracy {acc:.4f} is below the 0.60 threshold"

    def test_pipeline_predicts_valid_classes(self, trained_pipeline, synthetic_df):
        from app.train import ALL_FEATURES

        predictions = trained_pipeline.predict(synthetic_df[ALL_FEATURES])
        for pred in predictions:
            assert pred in TARGET_CLASSES, f"Unexpected class: {pred}"

    def test_predict_proba_sums_to_one(self, trained_pipeline, synthetic_df):
        from app.train import ALL_FEATURES

        proba = trained_pipeline.predict_proba(synthetic_df[ALL_FEATURES[:5]])
        sums = proba.sum(axis=1)
        np.testing.assert_allclose(sums, np.ones(len(sums)), atol=1e-6)


# ─── Serialization Tests ──────────────────────────────────────────────────────

class TestModelSerialization:
    def test_save_and_load_model(self, trained_pipeline, synthetic_df, tmp_path):
        from app.train import ALL_FEATURES

        # Save
        model_file = tmp_path / "test_model.joblib"
        joblib.dump(trained_pipeline, model_file)
        assert model_file.exists()

        # Load
        loaded = joblib.load(model_file)
        assert isinstance(loaded, Pipeline)

        # Predictions should be identical
        X = synthetic_df[ALL_FEATURES]
        orig_preds = trained_pipeline.predict(X)
        loaded_preds = loaded.predict(X)
        np.testing.assert_array_equal(orig_preds, loaded_preds)


# ─── ModelService Tests ───────────────────────────────────────────────────────

class TestModelService:
    def test_service_not_loaded_initially(self, tmp_path, monkeypatch):
        from app.model import ModelService

        svc = ModelService()
        svc._model_path = tmp_path / "nonexistent.joblib"
        assert not svc.is_loaded

    def test_service_load_raises_if_missing(self, tmp_path):
        from app.model import ModelService

        svc = ModelService()
        svc._model_path = tmp_path / "nonexistent.joblib"
        with pytest.raises(FileNotFoundError):
            svc.load()

    def test_service_predict_after_loading(self, trained_pipeline, tmp_path):
        from app.model import ModelService

        # Save pipeline to temp
        model_file = tmp_path / "model_20260403_120000.joblib"
        joblib.dump(trained_pipeline, model_file)

        svc = ModelService()
        svc._model_path = model_file
        svc.load()

        assert svc.is_loaded
        result = svc.predict(
            amount=250.0,
            device="mobile",
            country="TR",
            payment_method="credit_card",
            hour_of_day=14,
            day_of_week=3,
        )

        assert "prediction" in result
        assert "confidence" in result
        assert "probabilities" in result
        assert result["prediction"] in TARGET_CLASSES
        assert 0.0 <= result["confidence"] <= 1.0
        assert len(result["probabilities"]) == len(TARGET_CLASSES)

    def test_service_get_metrics_returns_none_when_no_history(self, tmp_path):
        from app.model import ModelService

        svc = ModelService()
        svc._history_path = tmp_path / "training_history.json"
        assert svc.get_metrics() is None

    def test_service_get_metrics_reads_last_record(self, tmp_path):
        from app.model import ModelService

        history = [
            {"version": "20260401_000000", "accuracy": 0.70, "f1_weighted": 0.69,
             "training_samples": 500, "test_samples": 100, "trained_at": "2026-04-01T00:00:00Z",
             "precision_weighted": 0.70, "recall_weighted": 0.70, "per_class": {}},
            {"version": "20260403_120000", "accuracy": 0.78, "f1_weighted": 0.77,
             "training_samples": 800, "test_samples": 200, "trained_at": "2026-04-03T12:00:00Z",
             "precision_weighted": 0.77, "recall_weighted": 0.78, "per_class": {}},
        ]
        history_file = tmp_path / "training_history.json"
        history_file.write_text(json.dumps(history))

        svc = ModelService()
        svc._history_path = history_file
        metrics = svc.get_metrics()
        assert metrics is not None
        assert metrics["version"] == "20260403_120000"
        assert metrics["accuracy"] == 0.78
