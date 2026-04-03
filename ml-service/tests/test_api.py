"""
API integration tests for the FastAPI ML service.

Uses httpx.AsyncClient with the FastAPI TestClient pattern.
Model is mocked so tests don't require a trained .joblib file.
"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import joblib
import pytest
from fastapi.testclient import TestClient


# ─── Helpers ─────────────────────────────────────────────────────────────────

TARGET_CLASSES = [
    "insufficient_funds",
    "network_error",
    "fraud_suspected",
    "expired_card",
    "invalid_credentials",
]

VALID_PREDICT_BODY = {
    "amount": 250.00,
    "device": "mobile",
    "country": "TR",
    "payment_method": "credit_card",
    "hour_of_day": 14,
    "day_of_week": 3,
}

MOCK_PREDICT_RESULT = {
    "prediction": "insufficient_funds",
    "confidence": 0.82,
    "probabilities": {
        "insufficient_funds": 0.82,
        "network_error": 0.10,
        "fraud_suspected": 0.05,
        "expired_card": 0.02,
        "invalid_credentials": 0.01,
    },
}

MOCK_METRICS = {
    "accuracy": 0.78,
    "precision_weighted": 0.77,
    "recall_weighted": 0.78,
    "f1_weighted": 0.77,
    "per_class": {
        "insufficient_funds": {"precision": 0.85, "recall": 0.88, "f1": 0.86},
        "network_error": {"precision": 0.72, "recall": 0.70, "f1": 0.71},
        "fraud_suspected": {"precision": 0.80, "recall": 0.75, "f1": 0.77},
        "expired_card": {"precision": 0.68, "recall": 0.65, "f1": 0.66},
        "invalid_credentials": {"precision": 0.60, "recall": 0.55, "f1": 0.57},
    },
    "training_samples": 8000,
    "test_samples": 2000,
    "trained_at": "2026-04-03T12:00:00Z",
}


@pytest.fixture
def mock_model_loaded():
    """Patch model_service so tests don't need a real .joblib file."""
    with patch("app.main.model_service") as mock_svc:
        mock_svc.is_loaded = True
        mock_svc.model_version = "20260403_120000"
        mock_svc.predict.return_value = MOCK_PREDICT_RESULT
        mock_svc.get_metrics.return_value = MOCK_METRICS
        yield mock_svc


@pytest.fixture
def mock_model_not_loaded():
    """Patch model_service as if model file is missing."""
    with patch("app.main.model_service") as mock_svc:
        mock_svc.is_loaded = False
        mock_svc.model_version = None
        yield mock_svc


@pytest.fixture
def client(mock_model_loaded):
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def client_no_model(mock_model_not_loaded):
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ─── Health Tests ─────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_schema(self, client):
        data = client.get("/health").json()
        assert "status" in data
        assert "model_loaded" in data
        assert "uptime_seconds" in data
        assert data["status"] == "healthy"
        assert data["model_loaded"] is True

    def test_health_when_model_not_loaded(self, client_no_model):
        response = client_no_model.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["model_loaded"] is False


# ─── Predict Tests ────────────────────────────────────────────────────────────

class TestPredictEndpoint:
    def test_predict_returns_200(self, client):
        response = client.post("/predict", json=VALID_PREDICT_BODY)
        assert response.status_code == 200

    def test_predict_response_schema(self, client):
        data = client.post("/predict", json=VALID_PREDICT_BODY).json()
        assert "prediction" in data
        assert "confidence" in data
        assert "probabilities" in data

    def test_predict_returns_valid_class(self, client):
        data = client.post("/predict", json=VALID_PREDICT_BODY).json()
        assert data["prediction"] in TARGET_CLASSES

    def test_predict_confidence_in_range(self, client):
        data = client.post("/predict", json=VALID_PREDICT_BODY).json()
        assert 0.0 <= data["confidence"] <= 1.0

    def test_predict_probabilities_has_all_classes(self, client):
        data = client.post("/predict", json=VALID_PREDICT_BODY).json()
        for cls in TARGET_CLASSES:
            assert cls in data["probabilities"]

    def test_predict_invalid_device_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "device": "smartwatch"}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_invalid_country_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "country": "XX"}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_invalid_payment_method_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "payment_method": "bitcoin"}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_negative_amount_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "amount": -10.0}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_hour_out_of_range_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "hour_of_day": 25}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_day_of_week_out_of_range_returns_422(self, client):
        body = {**VALID_PREDICT_BODY, "day_of_week": 7}
        response = client.post("/predict", json=body)
        assert response.status_code == 422

    def test_predict_missing_fields_returns_422(self, client):
        response = client.post("/predict", json={"amount": 100.0})
        assert response.status_code == 422

    def test_predict_returns_503_when_model_not_loaded(self, client_no_model):
        response = client_no_model.post("/predict", json=VALID_PREDICT_BODY)
        assert response.status_code == 503


# ─── Metrics Tests ────────────────────────────────────────────────────────────

class TestMetricsEndpoint:
    def test_metrics_returns_200(self, client):
        response = client.get("/model/metrics")
        assert response.status_code == 200

    def test_metrics_response_schema(self, client):
        data = client.get("/model/metrics").json()
        required_keys = [
            "accuracy", "precision_weighted", "recall_weighted",
            "f1_weighted", "per_class", "training_samples",
            "test_samples", "trained_at",
        ]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"

    def test_metrics_per_class_has_all_classes(self, client):
        data = client.get("/model/metrics").json()
        for cls in TARGET_CLASSES:
            assert cls in data["per_class"]

    def test_metrics_per_class_has_prf(self, client):
        data = client.get("/model/metrics").json()
        for cls, vals in data["per_class"].items():
            assert "precision" in vals
            assert "recall" in vals
            assert "f1" in vals

    def test_metrics_returns_404_when_no_history(self, client_no_model):
        with patch("app.main.model_service") as mock_svc:
            mock_svc.is_loaded = False
            mock_svc.get_metrics.return_value = None
            from app.main import app
            with TestClient(app) as c:
                response = c.get("/model/metrics")
                assert response.status_code == 404
