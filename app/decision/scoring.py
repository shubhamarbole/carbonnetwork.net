"""
Deterministic Decision Scoring Engine
Phase 13: Mathematical Multi-Criteria Utility & Option Ranking
Formula Version: decision-score-v1.0.0
Strictly non-LLM, reproducible, bounded [0.0, 100.0].
"""

import math
from typing import Dict, List, Optional, Tuple
from app.schemas.decision import (
    DecisionObjective,
    DecisionWeights,
    DecisionConstraints,
    DecisionOptionInput,
    EvaluatedOptionSchema,
)

SCORING_VERSION = "decision-score-v1.0.0"

OBJECTIVE_DEFAULT_WEIGHTS: Dict[DecisionObjective, DecisionWeights] = {
    DecisionObjective.RISK_REDUCTION: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.45,
        cost=0.15,
        esg_impact=0.10,
        carbon_impact=0.10,
        compliance=0.10,
        implementation_time=0.05,
        operational_impact=0.05,
    ),
    DecisionObjective.COST_MINIMIZATION: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.20,
        cost=0.45,
        esg_impact=0.05,
        carbon_impact=0.05,
        compliance=0.10,
        implementation_time=0.10,
        operational_impact=0.05,
    ),
    DecisionObjective.COMPLIANCE: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.20,
        cost=0.10,
        esg_impact=0.10,
        carbon_impact=0.10,
        compliance=0.40,
        implementation_time=0.05,
        operational_impact=0.05,
    ),
    DecisionObjective.ESG_IMPROVEMENT: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.15,
        cost=0.15,
        esg_impact=0.40,
        carbon_impact=0.15,
        compliance=0.10,
        implementation_time=0.025,
        operational_impact=0.025,
    ),
    DecisionObjective.CARBON_REDUCTION: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.15,
        cost=0.15,
        esg_impact=0.15,
        carbon_impact=0.40,
        compliance=0.10,
        implementation_time=0.025,
        operational_impact=0.025,
    ),
    DecisionObjective.OPERATIONAL_STABILITY: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.20,
        cost=0.15,
        esg_impact=0.05,
        carbon_impact=0.05,
        compliance=0.10,
        implementation_time=0.20,
        operational_impact=0.25,
    ),
    DecisionObjective.BALANCED_OUTCOME: DecisionWeights(
        weight_version="weight-v1.0.0",
        risk_reduction=0.25,
        cost=0.20,
        esg_impact=0.15,
        carbon_impact=0.15,
        compliance=0.15,
        implementation_time=0.05,
        operational_impact=0.05,
    ),
}


class DecisionScorer:
    """Deterministic, auditable decision scoring engine."""

    @classmethod
    def get_weights_for_objective(
        cls,
        objective: DecisionObjective,
        custom_weights: Optional[DecisionWeights] = None
    ) -> DecisionWeights:
        """Resolves weights, prioritizing custom configuration if provided."""
        if custom_weights:
            return custom_weights
        return OBJECTIVE_DEFAULT_WEIGHTS.get(objective, OBJECTIVE_DEFAULT_WEIGHTS[DecisionObjective.BALANCED_OUTCOME])

    @classmethod
    def check_constraints(
        cls,
        option: DecisionOptionInput,
        baseline_risk: float,
        constraints: Optional[DecisionConstraints]
    ) -> Tuple[bool, List[str]]:
        """Verifies whether an option meets explicit business constraints."""
        if not constraints:
            return True, []

        violations = []
        # Max Cost
        if constraints.max_cost is not None and option.projected_cost > constraints.max_cost:
            violations.append(
                f"Projected cost (${option.projected_cost:,.2f}) exceeds constraint cap of ${constraints.max_cost:,.2f}"
            )

        # Max Implementation Time
        if constraints.max_implementation_time_days is not None and option.implementation_time > constraints.max_implementation_time_days:
            violations.append(
                f"Implementation time ({option.implementation_time}d) exceeds deadline of {constraints.max_implementation_time_days}d"
            )

        # Min Risk Reduction
        risk_reduction = baseline_risk - option.projected_risk
        if constraints.min_risk_reduction_points is not None and risk_reduction < constraints.min_risk_reduction_points:
            violations.append(
                f"Risk reduction ({risk_reduction:.2f} pts) is below required minimum of {constraints.min_risk_reduction_points:.2f} pts"
            )

        # Max Operational Impact
        if constraints.max_operational_impact is not None and option.operational_impact > constraints.max_operational_impact:
            violations.append(
                f"Operational impact ({option.operational_impact:.1f}) exceeds tolerance of {constraints.max_operational_impact:.1f}"
            )

        # Mandatory Compliance
        compliance_score = max(0.0, 100.0 - option.projected_compliance_exposure)
        if constraints.mandatory_compliance_score is not None and compliance_score < constraints.mandatory_compliance_score:
            violations.append(
                f"Compliance score ({compliance_score:.1f}) does not meet threshold of {constraints.mandatory_compliance_score:.1f}"
            )

        return len(violations) == 0, violations

    @classmethod
    def evaluate_options(
        cls,
        options: List[DecisionOptionInput],
        baseline_risk: float,
        objective: DecisionObjective = DecisionObjective.BALANCED_OUTCOME,
        constraints: Optional[DecisionConstraints] = None,
        custom_weights: Optional[DecisionWeights] = None
    ) -> List[EvaluatedOptionSchema]:
        """
        Deterministically evaluates and ranks decision options.
        Guaranteed to produce stable, mathematically bounded [0, 100] scores.
        """
        if not options:
            return []

        weights = cls.get_weights_for_objective(objective, custom_weights)

        # 1. Establish scaling reference caps across the options cohort
        max_cost_ref = max([opt.projected_cost for opt in options] + [10000.0])
        max_time_ref = max([opt.implementation_time for opt in options] + [90.0])
        max_carbon_ref = max([opt.projected_carbon_impact for opt in options] + [100.0])

        evaluated: List[EvaluatedOptionSchema] = []

        for opt in options:
            is_feasible, violations = cls.check_constraints(opt, baseline_risk, constraints)

            # Benefit Factors (Scaled [0, 100])
            risk_red = max(0.0, baseline_risk - opt.projected_risk)
            scaled_risk_red = min(100.0, risk_red * (100.0 / max(1.0, baseline_risk)))
            scaled_esg = min(100.0, max(0.0, opt.projected_esg_impact))
            scaled_carbon = min(100.0, (opt.projected_carbon_impact / max_carbon_ref) * 100.0)
            scaled_comp = min(100.0, max(0.0, 100.0 - opt.projected_compliance_exposure))

            raw_benefit = (
                weights.risk_reduction * scaled_risk_red +
                weights.esg_impact * scaled_esg +
                weights.carbon_impact * scaled_carbon +
                weights.compliance * scaled_comp
            )

            # Cost & Friction Factors (Scaled [0, 100])
            scaled_cost = min(100.0, (opt.projected_cost / max_cost_ref) * 100.0)
            scaled_time = min(100.0, (opt.implementation_time / max_time_ref) * 100.0)
            scaled_ops = min(100.0, max(0.0, opt.operational_impact))

            raw_friction = (
                weights.cost * scaled_cost +
                weights.implementation_time * scaled_time +
                weights.operational_impact * scaled_ops
            )

            # Multi-Attribute Utility Score Bounded [0, 100]
            denominator = max(0.001, raw_benefit + raw_friction)
            base_score = 100.0 * (raw_benefit / denominator)

            # Apply constraint penalty if infeasible
            if not is_feasible:
                penalty = 20.0 * len(violations)
                final_score = max(0.0, (base_score * 0.5) - penalty)
            else:
                final_score = min(100.0, max(0.0, base_score))

            final_score = round(final_score, 2)

            evaluated.append(
                EvaluatedOptionSchema(
                    option_id=opt.option_id,
                    name=opt.name,
                    description=opt.description,
                    inputs=opt.inputs,
                    scenario_reference=opt.scenario_reference,
                    projected_risk=round(opt.projected_risk, 2),
                    projected_cost=round(opt.projected_cost, 2),
                    projected_esg_impact=round(opt.projected_esg_impact, 2),
                    projected_carbon_impact=round(opt.projected_carbon_impact, 2),
                    projected_compliance_exposure=round(opt.projected_compliance_exposure, 2),
                    implementation_time=round(opt.implementation_time, 1),
                    operational_impact=round(opt.operational_impact, 1),
                    decision_score=final_score,
                    rank=1,  # updated below
                    normalized_benefit=round(raw_benefit, 3),
                    normalized_cost_friction=round(raw_friction, 3),
                    risk_reduction_delta=round(risk_red, 2),
                    constraint_violations=violations,
                    is_feasible=is_feasible,
                )
            )

        # 2. Deterministic Ranking:
        # Feasible options sorted by decision_score DESC, then infeasible options by decision_score DESC
        evaluated.sort(key=lambda x: (1 if x.is_feasible else 0, x.decision_score), reverse=True)

        for idx, item in enumerate(evaluated):
            item.rank = idx + 1

        return evaluated
