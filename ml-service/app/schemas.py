"""
Pydantic schemas for ML Service request/response validation.
"""
from __future__ import annotations

from typing import Dict, Optional
from pydantic import BaseModel, Field, field_validator


# ─── Request Schemas ──────────────────────────────────────────────────────────

VALID_DEVICES = {"mobile", "desktop", "tablet"}
VALID_COUNTRIES = {"TR", "US", "DE", "UK", "BR", "IN"}
VALID_PAYMENT_METHODS = {
    "credit_card", "debit_card", "bank_transfer", "digital_wallet"
}


class PredictRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1_000_000, description="Transaction amount")
    device: str = Field(..., description="Device type: mobile | desktop | tablet")
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")
    payment_method: str = Field(..., description="Payment method type")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")

    @field_validator("device")
    @classmethod
    def validate_device(cls, v: str) -> str:
        if v not in VALID_DEVICES:
            raise ValueError(f"device must be one of {VALID_DEVICES}")
        return v

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_COUNTRIES:
            raise ValueError(f"country must be one of {VALID_COUNTRIES}")
        return v

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v not in VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of {VALID_PAYMENT_METHODS}")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "amount": 250.00,
                "device": "mobile",
                "country": "TR",
                "payment_method": "credit_card",
                "hour_of_day": 14,
                "day_of_week": 3,
            }
        }
    }


# ─── Response Schemas ─────────────────────────────────────────────────────────

class PredictResponse(BaseModel):
    prediction: str = Field(..., description="Predicted failure reason")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence of top prediction")
    probabilities: Dict[str, float] = Field(..., description="Probability per class")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    model_loaded: bool = Field(..., description="Whether the model is loaded")
    model_version: Optional[str] = Field(None, description="Loaded model timestamp version")
    uptime_seconds: float = Field(..., description="Service uptime in seconds")


class PerClassMetrics(BaseModel):
    precision: float
    recall: float
    f1: float


class ModelMetricsResponse(BaseModel):
    accuracy: float
    precision_weighted: float
    recall_weighted: float
    f1_weighted: float
    per_class: Dict[str, PerClassMetrics]
    training_samples: int
    test_samples: int
    trained_at: str


class RetrainResponse(BaseModel):
    success: bool
    message: str
    model_version: Optional[str] = None
    metrics: Optional[ModelMetricsResponse] = None


class ErrorResponse(BaseModel):
    detail: str
