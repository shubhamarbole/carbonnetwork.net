"""
Decision Quality Evaluator
Phase 13: Mathematical Expected vs. Actual Validation
Strictly non-LLM, objective variance calculations.
"""

from datetime import datetime, timezone
from app.schemas.decision import (
    DecisionOutcomeEvaluationRequest,
    DecisionOutcomeEvaluationResponse,
)


class DecisionQualityEvaluator:
    """Evaluates the post-implementation fidelity of decision options."""

    @classmethod
    def evaluate_outcome(cls, request: DecisionOutcomeEvaluationRequest) -> DecisionOutcomeEvaluationResponse:
        """
        Computes forecast error, actual vs expected risk reduction, and cost variances.
        """
        # 1. Risk forecast error (|Expected - Actual|)
        forecast_error = round(abs(request.expected_risk - request.actual_risk), 2)

        # 2. Risk reduction calculations
        baseline = request.baseline_risk if request.baseline_risk is not None else max(request.expected_risk, request.actual_risk)
        expected_risk_red = round(max(0.0, baseline - request.expected_risk), 2)
        actual_risk_red = round(max(0.0, baseline - request.actual_risk), 2)

        # 3. Cost variance
        cost_variance = round(request.actual_cost - request.expected_cost, 2)
        if request.expected_cost > 0:
            cost_var_pct = round((cost_variance / request.expected_cost) * 100.0, 2)
        else:
            cost_var_pct = 0.0 if cost_variance == 0 else 100.0

        # 4. Impact deltas
        esg_delta = round(request.actual_esg - request.expected_esg, 2)
        carbon_delta = round(request.actual_carbon - request.expected_carbon, 2)
        compliance_delta = round(request.expected_compliance - request.actual_compliance, 2)

        # 5. Determine qualitative accuracy classification
        if forecast_error <= 3.0 and abs(cost_var_pct) <= 10.0:
            rating = "EXEMPLARY_ACCURACY"
            notes = "Outcome matched projected risk within ±3 points and budget within ±10%."
        elif forecast_error <= 8.0 and abs(cost_var_pct) <= 25.0:
            rating = "HIGH_ACCURACY"
            notes = "Outcome closely aligned with model predictions across key metrics."
        elif forecast_error <= 15.0 and abs(cost_var_pct) <= 50.0:
            rating = "ACCEPTABLE_VARIANCE"
            notes = "Outcome met strategic intent with moderate operational friction."
        else:
            rating = "VARIANCE_EXCEEDED"
            notes = "Actual outcome diverged significantly from projected baseline. Model recalibration suggested."

        return DecisionOutcomeEvaluationResponse(
            outcome_id=request.outcome_id,
            decision_id=request.decision_id,
            option_id=request.option_id,
            forecast_error=forecast_error,
            expected_risk_reduction=expected_risk_red,
            actual_risk_reduction=actual_risk_red,
            cost_variance=cost_variance,
            cost_variance_percentage=cost_var_pct,
            esg_delta=esg_delta,
            carbon_delta=carbon_delta,
            compliance_delta=compliance_delta,
            evaluation_rating=rating,
            accuracy_notes=notes,
            evaluated_at=datetime.now(timezone.utc).isoformat()
        )
