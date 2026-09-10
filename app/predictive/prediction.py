"""
Predictive Risk Inference Service
Phase 9: Generates calibrated risk forecasts, severity projections,
and explainability factors across 7-day, 30-day, and 90-day horizons.
"""

import uuid
import logging
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.schemas.prediction import (
    PredictiveRiskRequest,
    PredictiveRiskResponse,
    BatchPredictionRequest,
    BatchPredictionResponse
)
from app.predictive.features import default_feature_extractor, FEATURE_VERSION
from app.predictive.registry import default_model_registry
from app.predictive.explainability import default_explainability_engine

logger = logging.getLogger("predictive_inference")


class PredictiveService:
    """Core prediction serving engine."""

    def __init__(self):
        self.feature_extractor = default_feature_extractor
        self.model_registry = default_model_registry
        self.explainability_engine = default_explainability_engine

    def predict_risk(self, req: PredictiveRiskRequest) -> PredictiveRiskResponse:
        """
        Generates risk trajectory forecast:
        1. Extracts 21 leakage-free features
        2. Queries registered ML model for critical probability
        3. Projects score according to horizon (7d, 30d, 90d)
        4. Derives predicted severity and trajectory trend
        5. Computes top explainable factors
        """
        risk_data = req.risk_snapshot or {"risk_score": 50.0, "probability": 50.0, "impact": 50.0, "exposure": 50.0, "urgency": 50.0}
        current_score = float(risk_data.get("risk_score", risk_data.get("score", 50.0)))
        current_severity = self._classify_severity(current_score)

        # 1. Extract feature vector
        features = self.feature_extractor.extract_features(
            risk_data=risk_data,
            history_snapshots=req.history_snapshots,
            additional_metrics={
                "events_30d": req.events_count_30d,
                "alerts_30d": req.alerts_count_30d,
                "overdue_mitigations": req.overdue_mitigations
            }
        )
        features_dict = self.feature_extractor.to_dict(features)

        # 2. Model inference
        model_obj, metadata = self.model_registry.get_model()

        try:
            X = np.array([features])
            if hasattr(model_obj, "predict_proba"):
                raw_prob = float(model_obj.predict_proba(X)[0, 1])
            else:
                raw_prob = float(model_obj.predict(X)[0])
        except Exception as err:
            logger.warning(f"Inference error ({err}), utilizing calibrated heuristic projection.")
            raw_prob = self._heuristic_probability(features_dict)

        # Strictly enforce bounds [0.0, 1.0]
        critical_prob = max(0.0, min(1.0, round(raw_prob, 4)))

        # 3. Horizon projection
        # Horizon scaling factor: 7d (0.35), 30d (1.0), 90d (1.45)
        horizon = req.prediction_horizon_days
        horizon_factor = 0.35 if horizon == 7 else 1.0 if horizon == 30 else 1.45

        # Score delta drivers: historical trend (score_change_30d), overdue mitigations, escalations
        historical_momentum = features_dict.get("score_change_30d", 0.0)
        escalation_impact = features_dict.get("escalations_30d", 0.0) * 3.0
        mitigation_drag = features_dict.get("overdue_mitigations", 0.0) * 2.5
        mitigation_relief = features_dict.get("completed_mitigations", 0.0) * 1.5

        raw_delta = (historical_momentum * 0.7 + escalation_impact + mitigation_drag - mitigation_relief) * horizon_factor

        # Align delta direction with critical_probability
        if critical_prob >= 0.70 and raw_delta < 2.0:
            raw_delta = 5.0 * horizon_factor
        elif critical_prob <= 0.30 and raw_delta > -2.0:
            raw_delta = -3.5 * horizon_factor

        predicted_score = round(max(0.0, min(100.0, current_score + raw_delta)), 1)
        predicted_severity = self._classify_severity(predicted_score)

        # 4. Trend determination
        diff = predicted_score - current_score
        if diff >= 2.0:
            trend = "INCREASING"
        elif diff <= -2.0:
            trend = "DECREASING"
        else:
            trend = "STABLE"

        # 5. Explainability
        if req.include_explainability:
            top_factors = self.explainability_engine.explain(features_dict, top_k=4)
        else:
            top_factors = []

        now_iso = datetime.now(timezone.utc).isoformat()
        prediction_id = f"pred_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"

        return PredictiveRiskResponse(
            prediction_id=prediction_id,
            risk_id=req.risk_id,
            current_score=current_score,
            current_severity=current_severity,
            prediction_horizon_days=horizon,
            predicted_score=predicted_score,
            predicted_severity=predicted_severity,
            critical_probability=critical_prob,
            trend=trend,
            top_predictive_factors=top_factors,
            model_version=metadata.model_version,
            feature_version=FEATURE_VERSION,
            prediction_timestamp=now_iso,
            organization_id=req.organization_id,
            project_id=req.project_id
        )

    def batch_predict(self, batch_req: BatchPredictionRequest) -> BatchPredictionResponse:
        """Executes efficient batch inference across multiple risk requests."""
        import time
        start = time.time()
        results = [self.predict_risk(r) for r in batch_req.risks]
        elapsed = (time.time() - start) * 1000.0

        return BatchPredictionResponse(
            predictions=results,
            total_processed=len(results),
            execution_time_ms=round(elapsed, 2)
        )

    def _classify_severity(self, score: float) -> str:
        """Standard Phase 2 deterministic severity threshold."""
        if score >= 75.0:
            return "CRITICAL"
        if score >= 50.0:
            return "HIGH"
        if score >= 25.0:
            return "MEDIUM"
        return "LOW"

    def _heuristic_probability(self, feat: Dict[str, float]) -> float:
        """Fallback calibrated probability formula when model is unavailable."""
        score = feat.get("current_score", 50.0)
        chg = feat.get("score_change_30d", 0.0)
        esc = feat.get("escalations_30d", 0.0)
        overdue = feat.get("overdue_mitigations", 0.0)

        # Logistic sigmoid estimation
        z = -2.5 + (score * 0.04) + (chg * 0.06) + (esc * 0.4) + (overdue * 0.3)
        p = 1.0 / (1.0 + np.exp(-z))
        return float(p)


default_predictive_service = PredictiveService()
