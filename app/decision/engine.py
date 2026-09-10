"""
Decision Engine Orchestrator
Phase 13: Multi-Option Evaluation, Comparison Matrix, and Feasibility Governance
"""

from datetime import datetime, timezone
from typing import Any, Dict, List
from app.schemas.decision import (
    DecisionAnalysisRequest,
    DecisionAnalysisResponse,
    DecisionComparisonRequest,
    DecisionComparisonResponse,
    ComparisonMatrixMetric,
    EvaluatedOptionSchema,
)
from app.decision.scoring import DecisionScorer, SCORING_VERSION


class DecisionEngine:
    """Core orchestrator for deterministic decision analysis and comparison."""

    @classmethod
    def analyze(cls, request: DecisionAnalysisRequest) -> DecisionAnalysisResponse:
        """Evaluates and ranks decision options deterministically."""
        ranked_options = DecisionScorer.evaluate_options(
            options=request.options,
            baseline_risk=request.baseline_risk_score,
            objective=request.objective,
            constraints=request.constraints,
            custom_weights=request.custom_weights,
        )

        weights_used = DecisionScorer.get_weights_for_objective(
            request.objective,
            request.custom_weights
        )

        top_recommended = ranked_options[0].option_id if ranked_options else None
        feasible_count = sum(1 for opt in ranked_options if opt.is_feasible)

        return DecisionAnalysisResponse(
            decision_id=request.decision_id,
            scoring_version=SCORING_VERSION,
            objective=request.objective,
            weights_used=weights_used,
            ranked_options=ranked_options,
            top_recommended_option_id=top_recommended,
            total_options_evaluated=len(ranked_options),
            feasible_options_count=feasible_count,
        )

    @classmethod
    def compare(cls, request: DecisionComparisonRequest) -> DecisionComparisonResponse:
        """Generates side-by-side comparison matrix across options."""
        evaluated = DecisionScorer.evaluate_options(
            options=request.options,
            baseline_risk=request.baseline_risk_score,
            objective=request.objective,
            custom_weights=request.custom_weights,
        )

        metrics: List[ComparisonMatrixMetric] = []
        summary_matrix: Dict[str, Dict[str, Any]] = {}

        if not evaluated:
            return DecisionComparisonResponse(
                decision_id=request.decision_id,
                comparison_timestamp=datetime.now(timezone.utc).isoformat(),
                metrics=[],
                summary_matrix={},
                scoring_version=SCORING_VERSION,
            )

        # 1. Projected Risk
        risk_vals = {opt.option_id: opt.projected_risk for opt in evaluated}
        best_risk = min(risk_vals, key=risk_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="projected_risk",
                label="Projected Risk Score",
                unit="pts (lower is better)",
                values_by_option=risk_vals,
                best_option_id=best_risk,
            )
        )

        # 2. Risk Reduction Delta
        red_vals = {opt.option_id: opt.risk_reduction_delta for opt in evaluated}
        best_red = max(red_vals, key=red_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="risk_reduction_delta",
                label="Expected Risk Reduction",
                unit="pts (higher is better)",
                values_by_option=red_vals,
                best_option_id=best_red,
            )
        )

        # 3. Projected Cost
        cost_vals = {opt.option_id: opt.projected_cost for opt in evaluated}
        best_cost = min(cost_vals, key=cost_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="projected_cost",
                label="Projected Implementation Cost",
                unit="USD (lower is better)",
                values_by_option=cost_vals,
                best_option_id=best_cost,
            )
        )

        # 4. ESG Impact
        esg_vals = {opt.option_id: opt.projected_esg_impact for opt in evaluated}
        best_esg = max(esg_vals, key=esg_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="projected_esg_impact",
                label="Projected ESG Score",
                unit="pts (higher is better)",
                values_by_option=esg_vals,
                best_option_id=best_esg,
            )
        )

        # 5. Carbon Impact
        carb_vals = {opt.option_id: opt.projected_carbon_impact for opt in evaluated}
        best_carb = max(carb_vals, key=carb_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="projected_carbon_impact",
                label="Carbon Abatement",
                unit="tCO2e (higher is better)",
                values_by_option=carb_vals,
                best_option_id=best_carb,
            )
        )

        # 6. Compliance Exposure
        comp_vals = {opt.option_id: opt.projected_compliance_exposure for opt in evaluated}
        best_comp = min(comp_vals, key=comp_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="projected_compliance_exposure",
                label="Residual Compliance Exposure",
                unit="penalty/risk pts (lower is better)",
                values_by_option=comp_vals,
                best_option_id=best_comp,
            )
        )

        # 7. Implementation Time
        time_vals = {opt.option_id: opt.implementation_time for opt in evaluated}
        best_time = min(time_vals, key=time_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="implementation_time",
                label="Time to Deploy",
                unit="days (lower is better)",
                values_by_option=time_vals,
                best_option_id=best_time,
            )
        )

        # 8. Operational Impact
        ops_vals = {opt.option_id: opt.operational_impact for opt in evaluated}
        best_ops = min(ops_vals, key=ops_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="operational_impact",
                label="Operational Disruption",
                unit="scale 0-100 (lower is better)",
                values_by_option=ops_vals,
                best_option_id=best_ops,
            )
        )

        # 9. Decision Score & Rank
        score_vals = {opt.option_id: opt.decision_score for opt in evaluated}
        best_score = max(score_vals, key=score_vals.get)
        metrics.append(
            ComparisonMatrixMetric(
                metric_key="decision_score",
                label="Authoritative Decision Score",
                unit="utility pts (higher is better)",
                values_by_option=score_vals,
                best_option_id=best_score,
            )
        )

        for opt in evaluated:
            summary_matrix[opt.option_id] = {
                "name": opt.name,
                "rank": opt.rank,
                "score": opt.decision_score,
                "is_feasible": opt.is_feasible,
                "risk": opt.projected_risk,
                "cost": opt.projected_cost,
                "esg": opt.projected_esg_impact,
                "carbon": opt.projected_carbon_impact,
                "compliance": opt.projected_compliance_exposure,
                "time": opt.implementation_time,
                "operational_impact": opt.operational_impact,
                "violations": opt.constraint_violations,
            }

        return DecisionComparisonResponse(
            decision_id=request.decision_id,
            comparison_timestamp=datetime.now(timezone.utc).isoformat(),
            metrics=metrics,
            summary_matrix=summary_matrix,
            scoring_version=SCORING_VERSION,
        )
