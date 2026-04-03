"""
ModelService — Singleton that manages model loading and inference.

Responsibilities:
  - Load the trained pipeline from disk (latest_model.joblib)
  - Serve predictions with confidence scores and per-class probabilities
  - Surface last training metrics from training_history.json
  - Track model version and load state
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("model")

TARGET_CLASSES = [
    "insufficient_funds",
    "network_error",
    "fraud_suspected",
    "expired_card",
    "invalid_credentials",
]

FEATURE_COLUMNS = [
    "amount",
    "device",
    "country",
    "payment_method",
    "hour_of_day",
    "day_of_week",
]


class ModelService:
    """
    Singleton service that encapsulates pipeline loading and prediction.
    Loaded once at application startup via lifespan event.
    """

    def __init__(self) -> None:
        self._pipeline = None
        self._model_version: Optional[str] = None
        self._loaded_at: Optional[datetime] = None
        self._model_path: Path = BASE_DIR / os.getenv(
            "ML_MODEL_PATH", "models/latest_model.joblib"
        )
        self._history_path: Path = BASE_DIR / "logs" / "training_history.json"

    # ── Properties ──────────────────────────────────────────────────────────

    @property
    def is_loaded(self) -> bool:
        return self._pipeline is not None

    @property
    def model_version(self) -> Optional[str]:
        return self._model_version

    # ── Loading ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load the model pipeline from disk. Raises if file not found."""
        if not self._model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {self._model_path}. "
                "Run 'python -m app.train' first to train the model."
            )

        logger.info("Loading model from %s", self._model_path)
        self._pipeline = joblib.load(self._model_path)
        self._loaded_at = datetime.now(timezone.utc)

        # Derive version from the symlink target filename
        resolved = self._model_path.resolve()
        stem = resolved.stem  # e.g. "model_20260403_120000"
        self._model_version = stem.replace("model_", "") if stem.startswith("model_") else stem
        logger.info("Model loaded. Version: %s", self._model_version)

    def reload(self) -> None:
        """Force reload — called after retraining."""
        self._pipeline = None
        self._model_version = None
        self.load()

    # ── Inference ────────────────────────────────────────────────────────────

    def predict(
        self,
        amount: float,
        device: str,
        country: str,
        payment_method: str,
        hour_of_day: int,
        day_of_week: int,
    ) -> Dict:
        """
        Run prediction on a single transaction's features.

        Returns:
            {
                "prediction": str,
                "confidence": float,
                "probabilities": {class: probability, ...}
            }
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Call load() first.")

        # Build a single-row DataFrame matching training feature order
        row = pd.DataFrame(
            [
                {
                    "amount": float(amount),
                    "device": device,
                    "country": country,
                    "payment_method": payment_method,
                    "hour_of_day": int(hour_of_day),
                    "day_of_week": int(day_of_week),
                }
            ],
            columns=FEATURE_COLUMNS,
        )

        # Get class probabilities
        proba = self._pipeline.predict_proba(row)[0]
        classes = self._pipeline.classes_

        # Build probabilities dict — ensure all target classes are present
        prob_dict: Dict[str, float] = {}
        for cls, p in zip(classes, proba):
            prob_dict[cls] = round(float(p), 4)

        # Fill missing classes with 0.0 (can happen if class absent in training)
        for cls in TARGET_CLASSES:
            if cls not in prob_dict:
                prob_dict[cls] = 0.0

        # Top prediction
        prediction = max(prob_dict, key=prob_dict.get)
        confidence = prob_dict[prediction]

        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
        }

    # ── Metrics ──────────────────────────────────────────────────────────────

    def get_metrics(self) -> Optional[Dict]:
        """
        Return the latest training run metrics from training_history.json.
        Returns None if no training history exists.
        """
        if not self._history_path.exists():
            return None

        try:
            with open(self._history_path, "r") as f:
                history = json.load(f)
            if not history:
                return None
            return history[-1]  # Most recent run
        except (json.JSONDecodeError, IndexError, KeyError):
            logger.warning("Could not read training history from %s", self._history_path)
            return None


# Singleton instance — imported and shared across the app
model_service = ModelService()
