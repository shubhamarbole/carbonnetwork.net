"""
Feature Engineering Engine for Predictive Risk Intelligence
Phase 9: Reproducible, time-aware feature extraction with strict data leakage prevention.
"""

from typing import Dict, Any, List, Optional
import math
from datetime import datetime, timezone

FEATURE_VERSION = "risk-features-v1"

FEATURE_NAMES = [
    "current_score",
    "probability",
    "impact",
    "exposure",
    "urgency",
    "score_change_7d",
    "score_change_30d",
    "score_change_90d",
    "alerts_7d",
    "alerts_30d",
    "escalations_30d",
    "overdue_mitigations",
    "completed_mitigations",
    "open_mitigations",
    "compliance_failures",
    "missing_data_events",
    "esg_metric_trend",
    "carbon_trend",
    "supplier_trend",
    "project_delays",
    "time_since_last_update_days"
]


def _parse_iso_timestamp(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        # Replace trailing Z with +00:00 for timezone-aware parsing
        clean_ts = ts.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


class FeatureExtractor:
    """Extracts standardized numerical feature vectors from risk entities and historical snapshots."""

    def __init__(self, version: str = FEATURE_VERSION):
        self.version = version

    def extract_features(
        self,
        risk_data: Dict[str, Any],
        history_snapshots: Optional[List[Dict[str, Any]]] = None,
        as_of_time: Optional[datetime] = None,
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> List[float]:
        """
        Extracts feature vector from risk record and prior history.
        DATA LEAKAGE PREVENTION: Any snapshot or event after as_of_time is ignored.
        """
        now = as_of_time or datetime.now(timezone.utc)
        history = history_snapshots or []
        metrics = additional_metrics or {}

        # 1. Base deterministic scoring components
        current_score = float(risk_data.get("risk_score", risk_data.get("score", 50.0)))
        prob = float(risk_data.get("probability", 50.0))
        imp = float(risk_data.get("impact", 50.0))
        exp = float(risk_data.get("exposure", 50.0))
        urg = float(risk_data.get("urgency", 50.0))

        # 2. Time-aware historical delta calculation (prevent data leakage by filtering future snapshots)
        valid_snapshots = []
        for s in history:
            ts_dt = _parse_iso_timestamp(s.get("timestamp") or s.get("created_at"))
            if ts_dt and ts_dt <= now:
                valid_snapshots.append((ts_dt, s))

        # Sort chronologically
        valid_snapshots.sort(key=lambda x: x[0])

        score_change_7d = 0.0
        score_change_30d = 0.0
        score_change_90d = 0.0

        for ts_dt, snap in valid_snapshots:
            days_ago = (now - ts_dt).total_seconds() / 86400.0
            old_score = float(snap.get("old_score", snap.get("score", snap.get("risk_score", current_score))))

            if days_ago <= 7.5 and score_change_7d == 0.0:
                score_change_7d = current_score - old_score
            if days_ago <= 30.5 and score_change_30d == 0.0:
                score_change_30d = current_score - old_score
            if days_ago <= 90.5 and score_change_90d == 0.0:
                score_change_90d = current_score - old_score

        # If no explicit snapshot found, check if risk was updated recently with a previous score
        if score_change_30d == 0.0 and "previous_score" in risk_data:
            score_change_30d = current_score - float(risk_data["previous_score"])

        # 3. Alerts and escalations
        alerts_7d = float(metrics.get("alerts_7d", metrics.get("alerts_count_7d", 0)))
        alerts_30d = float(metrics.get("alerts_30d", metrics.get("alerts_count_30d", 0)))
        escalations_30d = float(metrics.get("escalations_30d", metrics.get("escalation_count_30d", 0)))

        # 4. Mitigations
        overdue_mit = float(metrics.get("overdue_mitigations", risk_data.get("overdue_mitigations", 0)))
        completed_mit = float(metrics.get("completed_mitigations", risk_data.get("completed_mitigations", 0)))
        open_mit = float(metrics.get("open_mitigations", risk_data.get("open_mitigations", 1)))

        # 5. Operational and ESG trends
        comp_failures = float(metrics.get("compliance_failures", 0))
        missing_data = float(metrics.get("missing_data_events", 0))
        esg_trend = float(metrics.get("esg_metric_trend", 0.0))  # -1 (worsening) to +1 (improving)
        carbon_trend = float(metrics.get("carbon_trend", 0.0))
        supplier_trend = float(metrics.get("supplier_trend", 0.0))
        project_delays = float(metrics.get("project_delays", 0))

        # 6. Recency / Staleness
        last_updated_dt = _parse_iso_timestamp(risk_data.get("updatedAt") or risk_data.get("updated_at"))
        if last_updated_dt:
            time_since_last_update_days = max(0.0, (now - last_updated_dt).total_seconds() / 86400.0)
        else:
            time_since_last_update_days = 5.0

        features = [
            current_score,
            prob,
            imp,
            exp,
            urg,
            score_change_7d,
            score_change_30d,
            score_change_90d,
            alerts_7d,
            alerts_30d,
            escalations_30d,
            overdue_mit,
            completed_mit,
            open_mit,
            comp_failures,
            missing_data,
            esg_trend,
            carbon_trend,
            supplier_trend,
            project_delays,
            time_since_last_update_days
        ]

        return features

    def to_dict(self, feature_vector: List[float]) -> Dict[str, float]:
        """Maps vector back to named dictionary for explainability."""
        return {name: val for name, val in zip(FEATURE_NAMES, feature_vector)}


default_feature_extractor = FeatureExtractor()
