"""
Model Explainability Engine
Phase 9: Generates transparent, human-readable predictive factors
derived directly from model coefficients and feature contributions without LLM hallucination.
"""

from typing import List, Dict, Any, Tuple, Optional
from app.predictive.features import FEATURE_NAMES


class ExplainabilityEngine:
    """Computes transparent, ranked explanations for model predictions."""

    def __init__(self, feature_weights: Optional[Dict[str, float]] = None):
        # Default baseline weights reflecting logistical importance
        self.default_weights = {
            "current_score": 0.04,
            "probability": 0.02,
            "impact": 0.02,
            "exposure": 0.015,
            "urgency": 0.015,
            "score_change_7d": 0.05,
            "score_change_30d": 0.06,
            "score_change_90d": 0.03,
            "alerts_7d": 0.08,
            "alerts_30d": 0.06,
            "escalations_30d": 0.12,
            "overdue_mitigations": 0.14,
            "completed_mitigations": -0.05,
            "open_mitigations": 0.02,
            "compliance_failures": 0.15,
            "missing_data_events": 0.04,
            "esg_metric_trend": -0.08,  # negative trend means worsening -> positive risk contribution
            "carbon_trend": 0.07,
            "supplier_trend": -0.06,
            "project_delays": 0.08,
            "time_since_last_update_days": 0.01
        }
        self.weights = feature_weights or self.default_weights

    def explain(
        self,
        features_dict: Dict[str, float],
        top_k: int = 4
    ) -> List[str]:
        """
        Ranks features by positive contribution to risk elevation
        and renders factual, human-readable explanatory bullet points.
        """
        contributions: List[Tuple[str, float, float]] = []

        for name, val in features_dict.items():
            weight = self.weights.get(name, 0.01)
            # Contribution is positive when the feature drives risk upwards
            if name == "esg_metric_trend" or name == "supplier_trend":
                contrib = -val * weight if val < 0 else 0.0
            elif name == "completed_mitigations":
                contrib = 0.0
            else:
                contrib = val * weight
            contributions.append((name, val, contrib))

        # Sort descending by risk contribution
        contributions.sort(key=lambda x: x[2], reverse=True)

        factors = []
        for name, val, contrib in contributions:
            if len(factors) >= top_k:
                break

            explanation = self._format_factor(name, val)
            if explanation and explanation not in factors:
                factors.append(explanation)

        if not factors:
            factors.append(f"Baseline risk trajectory consistent with current score of {features_dict.get('current_score', 50.0):.1f}")

        return factors

    def _format_factor(self, name: str, val: float) -> Optional[str]:
        """Translates numerical feature into clear executive prose."""
        if name == "score_change_30d" and abs(val) >= 1.0:
            direction = "increased" if val > 0 else "decreased"
            return f"Risk score {direction} {abs(val):.1f} points in past 30 days"

        if name == "score_change_7d" and abs(val) >= 2.0:
            direction = "jumped" if val > 0 else "dropped"
            return f"Rapid score fluctuation: {direction} {abs(val):.1f} points in 7 days"

        if name == "overdue_mitigations" and val >= 1:
            return f"{int(val)} overdue mitigation action{'s' if val > 1 else ''} pending remediation"

        if name == "escalations_30d" and val >= 1:
            return f"{int(val)} priority escalation{'s' if val > 1 else ''} triggered in past 30 days"

        if name == "alerts_30d" and val >= 1:
            return f"{int(val)} monitoring alert{'s' if val > 1 else ''} recorded in past 30 days"

        if name == "compliance_failures" and val >= 1:
            return f"{int(val)} active compliance failure or regulatory warning{'s' if val > 1 else ''}"

        if name == "probability" and val >= 65.0:
            return f"Elevated likelihood probability rating ({val:.1f}%)"

        if name == "impact" and val >= 70.0:
            return f"High operational & environmental impact rating ({val:.1f}%)"

        if name == "urgency" and val >= 75.0:
            return f"Critical response urgency rating ({val:.1f}%)"

        if name == "carbon_trend" and val >= 0.15:
            return f"Elevated carbon intensity trend (+{val * 100:.1f}%)"

        if name == "project_delays" and val >= 1:
            return f"{int(val)} project milestone delay{'s' if val > 1 else ''} affecting operational continuity"

        if name == "current_score" and val >= 70.0:
            return f"High baseline deterministic score ({val:.1f}/100)"

        return None


default_explainability_engine = ExplainabilityEngine()
