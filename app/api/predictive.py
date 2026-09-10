"""
FastAPI Predictive Risk Intelligence Router
Phase 9: Endpoints for generating trajectory forecasts, batch inference,
model registry management, training triggers, and feedback evaluation.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.prediction import (
    PredictiveRiskRequest,
    PredictiveRiskResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    ModelMetadata,
    PredictionFeedbackRequest
)
from app.predictive.prediction import default_predictive_service
from app.predictive.registry import default_model_registry
from app.predictive.evaluation import default_feedback_evaluator

logger = logging.getLogger("predictive_api")
router = APIRouter()


def verify_internal_auth(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> None:
    """Verifies internal service key between Express gateway and Python service."""
    if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
        logger.warning("Unauthorized access attempt to internal predictive endpoint.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing or invalid internal service key."
        )


@router.post(
    "/predict",
    response_model=PredictiveRiskResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Predictive Risk Forecast"
)
def predict_risk(
    req: PredictiveRiskRequest,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> PredictiveRiskResponse:
    verify_internal_auth(x_internal_service_key)
    try:
        return default_predictive_service.predict_risk(req)
    except Exception as err:
        logger.error(f"Prediction failed for risk {req.risk_id}: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(err)}"
        )


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Risk Trajectory Predictions"
)
def batch_predict(
    batch_req: BatchPredictionRequest,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> BatchPredictionResponse:
    verify_internal_auth(x_internal_service_key)
    try:
        return default_predictive_service.batch_predict(batch_req)
    except Exception as err:
        logger.error(f"Batch prediction failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(err)}"
        )


@router.get(
    "/models",
    response_model=List[ModelMetadata],
    status_code=status.HTTP_200_OK,
    summary="List Registered Predictive Models"
)
def list_models(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> List[ModelMetadata]:
    verify_internal_auth(x_internal_service_key)
    return default_model_registry.list_models()


@router.post(
    "/train",
    response_model=ModelMetadata,
    status_code=status.HTTP_200_OK,
    summary="Train and Register Predictive Model Version"
)
def train_model(
    payload: Dict[str, Any],
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> ModelMetadata:
    verify_internal_auth(x_internal_service_key)
    model_version = payload.get("model_version", f"risk-predictor-{int(datetime.now().timestamp())}")
    dataset_version = payload.get("dataset_version", "dataset-esg-v1")
    force_type = payload.get("force_type")

    try:
        return default_model_registry.train_and_register(
            model_version=model_version,
            dataset_version=dataset_version,
            force_type=force_type
        )
    except Exception as err:
        logger.error(f"Model training failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training error: {str(err)}"
        )


@router.post(
    "/feedback",
    status_code=status.HTTP_200_OK,
    summary="Submit Prediction Feedback Evaluation"
)
def record_feedback(
    feedback: PredictionFeedbackRequest,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> Dict[str, Any]:
    verify_internal_auth(x_internal_service_key)
    try:
        return default_feedback_evaluator.evaluate_prediction(
            prediction_record={
                "prediction_id": feedback.prediction_id,
                "risk_id": feedback.risk_id
            },
            actual_score=feedback.actual_score,
            actual_severity=feedback.actual_severity,
            evaluation_timestamp=feedback.evaluation_timestamp
        )
    except Exception as err:
        logger.error(f"Feedback recording failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feedback error: {str(err)}"
        )


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Predictive Service Health & Drift Summary"
)
def predictive_health(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> Dict[str, Any]:
    verify_internal_auth(x_internal_service_key)
    active_version = default_model_registry.get_active_version()
    drift_metrics = default_feedback_evaluator.get_summary_metrics()

    return {
        "status": "HEALTHY",
        "service": "predictive-risk-intelligence",
        "active_model_version": active_version,
        "feature_version": "risk-features-v1",
        "drift_status": drift_metrics["drift_status"],
        "total_feedback_evaluated": drift_metrics["total_evaluated"]
    }
