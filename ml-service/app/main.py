"""
FastAPI application — Payment Failure Intelligence ML Service.

Endpoints:
    GET  /health           → Service health + model status
    POST /predict          → Failure reason prediction
    GET  /model/metrics    → Latest training metrics
    POST /model/retrain    → Trigger model retraining
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.model import model_service
from app.schemas import (
    ErrorResponse,
    HealthResponse,
    ModelMetricsResponse,
    PerClassMetrics,
    PredictRequest,
    PredictResponse,
    RetrainResponse,
)

logger = logging.getLogger("main")

# ─── Startup / Shutdown ───────────────────────────────────────────────────────

_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup; clean up on shutdown."""
    logger.info("PFIS ML Service starting up…")
    try:
        model_service.load()
        logger.info("✅ Model loaded successfully. Version: %s", model_service.model_version)
    except FileNotFoundError as exc:
        logger.warning(
            "⚠️  Model not found on startup: %s. "
            "Service will start but /predict will return 503 until model is trained.",
            exc,
        )
    yield
    logger.info("PFIS ML Service shutting down.")


# ─── App Initialization ───────────────────────────────────────────────────────

app = FastAPI(
    title="PFIS ML Service",
    description="Payment Failure Intelligence System — ML Microservice for failure reason classification",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check service logs."},
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    tags=["System"],
)
async def health() -> HealthResponse:
    """Return service health status and model availability."""
    uptime = round(time.time() - _start_time, 2)
    return HealthResponse(
        status="healthy",
        model_loaded=model_service.is_loaded,
        model_version=model_service.model_version,
        uptime_seconds=uptime,
    )


@app.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict failure reason",
    tags=["Prediction"],
    responses={
        503: {"model": ErrorResponse, "description": "Model not loaded"},
        422: {"description": "Validation error"},
    },
)
async def predict(body: PredictRequest) -> PredictResponse:
    """
    Predict the failure reason for a payment transaction given its features.

    Returns the predicted class, confidence score, and per-class probabilities.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Run 'python -m app.train' first.",
        )

    try:
        result = model_service.predict(
            amount=body.amount,
            device=body.device,
            country=body.country,
            payment_method=body.payment_method,
            hour_of_day=body.hour_of_day,
            day_of_week=body.day_of_week,
        )
    except Exception as exc:
        logger.error("Prediction failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    return PredictResponse(**result)


@app.get(
    "/model/metrics",
    response_model=ModelMetricsResponse,
    summary="Get latest model metrics",
    tags=["Model"],
    responses={
        404: {"model": ErrorResponse, "description": "No training history found"},
    },
)
async def get_metrics() -> ModelMetricsResponse:
    """Return performance metrics from the most recent training run."""
    metrics = model_service.get_metrics()
    if metrics is None:
        raise HTTPException(
            status_code=404,
            detail="No training history found. Run 'python -m app.train' first.",
        )

    try:
        per_class = {
            cls: PerClassMetrics(**vals)
            for cls, vals in metrics.get("per_class", {}).items()
        }
        return ModelMetricsResponse(
            accuracy=metrics["accuracy"],
            precision_weighted=metrics["precision_weighted"],
            recall_weighted=metrics["recall_weighted"],
            f1_weighted=metrics["f1_weighted"],
            per_class=per_class,
            training_samples=metrics["training_samples"],
            test_samples=metrics["test_samples"],
            trained_at=metrics["trained_at"],
        )
    except (KeyError, TypeError) as exc:
        logger.error("Malformed metrics in history: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Training history is malformed. Retrain the model.",
        )


@app.post(
    "/model/retrain",
    response_model=RetrainResponse,
    summary="Retrain the model",
    tags=["Model"],
    responses={
        500: {"model": ErrorResponse, "description": "Training failed"},
    },
)
async def retrain(background_tasks: BackgroundTasks) -> RetrainResponse:
    """
    Trigger a full model retraining pipeline synchronously.
    Loads data from PostgreSQL, trains, evaluates, and reloads the model.
    """
    logger.info("Retrain requested via API.")
    try:
        from app.train import train as run_training  # Late import to avoid circular
        result = run_training()
    except Exception as exc:
        logger.error("Retraining failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}")

    # Reload the newly trained model into the service
    try:
        model_service.reload()
    except Exception as exc:
        logger.error("Model reload after retraining failed: %s", exc)
        return RetrainResponse(
            success=False,
            message=f"Training succeeded but model reload failed: {exc}",
            model_version=result.get("version"),
        )

    per_class = {
        cls: PerClassMetrics(**vals)
        for cls, vals in result.get("per_class", {}).items()
    }
    metrics_response = ModelMetricsResponse(
        accuracy=result["accuracy"],
        precision_weighted=result["precision_weighted"],
        recall_weighted=result["recall_weighted"],
        f1_weighted=result["f1_weighted"],
        per_class=per_class,
        training_samples=result["training_samples"],
        test_samples=result["test_samples"],
        trained_at=result["trained_at"],
    )

    return RetrainResponse(
        success=True,
        message=f"Model retrained and reloaded. Version: {result['version']}",
        model_version=result["version"],
        metrics=metrics_response,
    )
