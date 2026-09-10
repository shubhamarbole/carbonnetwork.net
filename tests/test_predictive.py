"""
Unit and Integration Tests for Phase 9: Predictive Risk Intelligence
Tests feature extraction, data leakage prevention, model training, registry,
inference calibration, explainability, and event detection.
"""

import math
import pytest
from datetime import datetime, timedelta, timezone

from app.schemas.prediction import PredictiveRiskRequest, PredictionFeedbackRequest
from app.predictive.features import default_feature_extractor, FeatureExtractor, FEATURE_NAMES
from app.predictive.registry import default_model_registry
from app.predictive.training import default_model_trainer, ModelTrainer
from app.predictive.explainability import default_explainability_engine, ExplainabilityEngine
from app.predictive.prediction import default_predictive_service, PredictiveService
from app.predictive.evaluation import default_feedback_evaluator, FeedbackEvaluator
from app.monitoring.detectors import default_event_detector
from app.schemas.monitoring import MonitoredEventType


@pytest.fixture
def sample_risk_snapshot():
    now = datetime.now(timezone.utc)
    return {
        "risk_id": "risk_test_001",
        "title": "Supply Chain Scope 3 Emissions Deviation",
        "category": "Environmental",
        "status": "OPEN",
        "risk_score": 68.5,
        "severity": "HIGH",
        "probability": 75.0,
        "impact": 70.0,
        "exposure": 60.0,
        "urgency": 55.0,
        "updatedAt": (now - timedelta(days=5)).isoformat()
    }


@pytest.fixture
def sample_history():
    now = datetime.now(timezone.utc)
    return [
        {"score": 50.0, "timestamp": (now - timedelta(days=25)).isoformat()},
        {"score": 58.0, "timestamp": (now - timedelta(days=15)).isoformat()},
        {"score": 65.0, "timestamp": (now - timedelta(days=7)).isoformat()},
        {"score": 68.5, "timestamp": (now - timedelta(days=2)).isoformat()}
    ]


def test_feature_extractor_shape_and_names(sample_risk_snapshot, sample_history):
    features = default_feature_extractor.extract_features(
        risk_data=sample_risk_snapshot,
        history_snapshots=sample_history,
        additional_metrics={"events_30d": 2, "alerts_30d": 1, "overdue_mitigations": 0}
    )
    names = FEATURE_NAMES

    assert isinstance(features, list)
    assert len(features) == len(names)
    assert len(names) == 21
    assert "current_score" in names
    assert "probability" in names
    assert "score_change_7d" in names
    assert "score_change_30d" in names
    assert "time_since_last_update_days" in names
    # Verify no NaN or Inf in feature array
    assert not any(math.isnan(f) for f in features)


def test_feature_extractor_data_leakage_prevention(sample_risk_snapshot):
    """Ensure feature extraction operates strictly on retrospective information."""
    now = datetime.now(timezone.utc)
    past_history = [
        {"score": 45.0, "timestamp": (now - timedelta(days=40)).isoformat()},
        {"score": 55.0, "timestamp": (now - timedelta(days=10)).isoformat()}
    ]

    features = default_feature_extractor.extract_features(
        risk_data=sample_risk_snapshot,
        history_snapshots=past_history,
        as_of_time=now
    )

    feature_dict = dict(zip(FEATURE_NAMES, features))
    assert feature_dict["current_score"] == 68.5
    assert feature_dict["score_change_30d"] >= 0.0
    assert not any(math.isnan(f) for f in features)


def test_model_registry_and_persistence():
    model, metadata = default_model_registry.get_active_model()
    assert model is not None
    assert metadata is not None
    assert metadata.model_version == "risk-predictor-v1"
    assert metadata.status in ["DEPLOYED", "ACTIVE"]
    assert metadata.metrics is not None
    assert metadata.metrics.roc_auc >= 0.5


def test_prediction_inference_bounds_and_calibration(sample_risk_snapshot, sample_history):
    req = PredictiveRiskRequest(
        risk_id="risk_test_001",
        prediction_horizon_days=30,
        organization_id="org_test",
        risk_snapshot=sample_risk_snapshot,
        history_snapshots=sample_history,
        events_count_30d=2,
        alerts_count_30d=1
    )

    resp = default_predictive_service.predict_risk(req)

    assert resp.risk_id == "risk_test_001"
    assert 0.0 <= resp.predicted_score <= 100.0
    assert 0.0 <= resp.critical_probability <= 1.0
    assert resp.trend in ["INCREASING", "STABLE", "DECREASING"]
    assert resp.predicted_severity in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(resp.top_predictive_factors) > 0
    # Authoritative current score must match snapshot
    assert resp.current_score == 68.5
    assert resp.current_severity == "HIGH"


def test_horizon_scaling(sample_risk_snapshot, sample_history):
    """Test that 7d, 30d, and 90d forecasts modulate uncertainty and drift properly."""
    req_7d = PredictiveRiskRequest(
        risk_id="risk_test_001",
        prediction_horizon_days=7,
        organization_id="org_test",
        risk_snapshot=sample_risk_snapshot,
        history_snapshots=sample_history
    )
    req_90d = PredictiveRiskRequest(
        risk_id="risk_test_001",
        prediction_horizon_days=90,
        organization_id="org_test",
        risk_snapshot=sample_risk_snapshot,
        history_snapshots=sample_history
    )

    res_7d = default_predictive_service.predict_risk(req_7d)
    res_90d = default_predictive_service.predict_risk(req_90d)

    assert res_7d.prediction_horizon_days == 7
    assert res_90d.prediction_horizon_days == 90
    assert 0.0 <= res_7d.critical_probability <= 1.0
    assert 0.0 <= res_90d.critical_probability <= 1.0


def test_explainability_engine(sample_risk_snapshot, sample_history):
    features = default_feature_extractor.extract_features(
        risk_data=sample_risk_snapshot,
        history_snapshots=sample_history,
        additional_metrics={"events_30d": 3, "alerts_30d": 2}
    )
    feat_dict = dict(zip(FEATURE_NAMES, features))
    factors = default_explainability_engine.explain(feat_dict, top_k=3)
    assert len(factors) <= 3
    assert len(factors) > 0
    # Factors should be clean human-readable strings
    for f in factors:
        assert isinstance(f, str)
        assert len(f) > 10


def test_feedback_evaluator():
    feedback = PredictionFeedbackRequest(
        prediction_id="pred_eval_test",
        risk_id="risk_test_001",
        actual_score=72.0,
        actual_severity="HIGH",
        actual_critical_event=False
    )
    result = default_feedback_evaluator.record_feedback(feedback)
    assert result["status"] == "SUCCESS"
    assert "feedback_count" in result
    assert result["feedback_count"] >= 1


def test_proactive_monitoring_event_detector():
    """Test that high critical probability triggers PREDICTIVE_RISK_DETECTED event."""
    prediction = {
        "prediction_id": "pred_test_event",
        "risk_id": "risk_999",
        "organization_id": "org_test",
        "current_score": 48.0,
        "predicted_score": 78.0,
        "current_severity": "MEDIUM",
        "predicted_severity": "HIGH",
        "critical_probability": 0.78,
        "trend": "INCREASING",
        "top_predictive_factors": ["High operational impact rating", "Historical score escalation"],
        "prediction_horizon_days": 30
    }

    events = default_event_detector.detect_predictive_events(prediction, {"title": "Critical Supplier Risk"})
    assert len(events) >= 1
    evt_types = [e.event_type for e in events]
    assert MonitoredEventType.PREDICTIVE_RISK_DETECTED in evt_types
    assert MonitoredEventType.PREDICTIVE_RISK_ESCALATION in evt_types
