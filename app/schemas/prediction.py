"""
Pydantic Schemas for Predictive Risk Intelligence
Phase 9: Machine learning risk trajectory forecasting and explainability.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator


class PredictiveRiskRequest(BaseModel):
    """Request payload for risk trajectory prediction."""
    risk_id: str = Field(..., description="Target risk identifier")
    prediction_horizon_days: int = Field(30, description="Prediction horizon in days (7, 30, or 90)")
    organization_id: str = Field(..., description="Mandatory tenant isolation identifier")
    project_id: Optional[str] = Field(None, description="Optional project scope")
    include_explainability: bool = Field(True, description="Whether to compute human-readable top factors")
    risk_snapshot: Optional[Dict[str, Any]] = Field(None, description="Current risk attributes if preloaded")
    history_snapshots: Optional[List[Dict[str, Any]]] = Field(None, description="Historical risk snapshots")
    events_count_30d: Optional[int] = Field(0, description="Number of events in past 30 days")
    alerts_count_30d: Optional[int] = Field(0, description="Number of alerts in past 30 days")
    overdue_mitigations: Optional[int] = Field(0, description="Count of overdue mitigation actions")

    @field_validator("prediction_horizon_days")
    @classmethod
    def validate_horizon(cls, v: int) -> int:
        if v not in [7, 30, 90]:
            raise ValueError("Prediction horizon must be 7, 30, or 90 days.")
        return v


class PredictiveRiskResponse(BaseModel):
    """Standardized output schema for predictive risk forecasting."""
    prediction_id: str = Field(..., description="Unique prediction identifier")
    risk_id: str = Field(..., description="Target risk identifier")
    current_score: float = Field(..., ge=0.0, le=100.0, description="Authoritative Phase 2 current score")
    current_severity: str = Field(..., description="Current severity tier (LOW, MEDIUM, HIGH, CRITICAL)")
    prediction_horizon_days: int = Field(..., description="Forecast horizon in days")
    predicted_score: float = Field(..., ge=0.0, le=100.0, description="Estimated risk score at horizon")
    predicted_severity: str = Field(..., description="Predicted severity tier at horizon")
    critical_probability: float = Field(..., ge=0.0, le=1.0, description="Probability of becoming HIGH or CRITICAL")
    trend: str = Field(..., description="Risk trajectory: INCREASING, STABLE, or DECREASING")
    top_predictive_factors: List[str] = Field(default_factory=list, description="Human-readable predictive drivers")
    model_version: str = Field("risk-predictor-v1", description="Identifier of predictive model used")
    feature_version: str = Field("risk-features-v1", description="Identifier of feature set version used")
    prediction_timestamp: str = Field(..., description="ISO 8601 prediction creation timestamp")
    organization_id: Optional[str] = Field(None, description="Tenant organization ID")
    project_id: Optional[str] = Field(None, description="Project scope ID")


class BatchPredictionRequest(BaseModel):
    """Batch prediction request for multiple risks."""
    risks: List[PredictiveRiskRequest] = Field(..., min_length=1, max_length=100)


class BatchPredictionResponse(BaseModel):
    """Batch prediction response."""
    predictions: List[PredictiveRiskResponse]
    total_processed: int
    execution_time_ms: float


class ModelEvaluationMetrics(BaseModel):
    """Quantitative performance metrics for predictive models."""
    accuracy: float = Field(..., ge=0.0, le=1.0)
    precision: float = Field(..., ge=0.0, le=1.0)
    recall: float = Field(..., ge=0.0, le=1.0)
    f1_score: float = Field(..., ge=0.0, le=1.0)
    roc_auc: float = Field(..., ge=0.0, le=1.0)
    pr_auc: Optional[float] = Field(None, ge=0.0, le=1.0)
    brier_score: Optional[float] = Field(None, description="Calibration score (lower is better)")
    sample_count: int


class ModelMetadata(BaseModel):
    """Metadata for registered predictive model versions."""
    model_version: str
    model_type: str
    feature_version: str
    training_timestamp: str
    dataset_version: str
    status: str = Field("DEPLOYED", description="REGISTERED, APPROVED, DEPLOYED, RETIRED")
    metrics: Optional[ModelEvaluationMetrics] = None


class PredictionFeedbackRequest(BaseModel):
    """Outcome feedback for verifying prediction accuracy after horizon expiration."""
    prediction_id: str
    risk_id: str
    actual_score: float = Field(..., ge=0.0, le=100.0)
    actual_severity: str
    evaluation_timestamp: Optional[str] = None
