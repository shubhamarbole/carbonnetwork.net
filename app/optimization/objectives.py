"""
Multi-Objective Utility Weights and Presets
Phase 15: Autonomous Risk Optimization
"""

from typing import Optional
from app.optimization.schemas import CandidateMitigation, ObjectiveWeights, OptimizationObjective

PRESET_WEIGHTS = {
    OptimizationObjective.BALANCED_OPTIMIZATION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.30,
        cost_efficiency_weight=0.20,
        compliance_weight=0.15,
        esg_improvement_weight=0.15,
        carbon_reduction_weight=0.10,
        time_efficiency_weight=0.10,
    ),
    OptimizationObjective.RISK_MINIMIZATION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.60,
        cost_efficiency_weight=0.10,
        compliance_weight=0.10,
        esg_improvement_weight=0.10,
        carbon_reduction_weight=0.05,
        time_efficiency_weight=0.05,
    ),
    OptimizationObjective.COST_MINIMIZATION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.15,
        cost_efficiency_weight=0.55,
        compliance_weight=0.10,
        esg_improvement_weight=0.05,
        carbon_reduction_weight=0.05,
        time_efficiency_weight=0.10,
    ),
    OptimizationObjective.COMPLIANCE_PROTECTION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.20,
        cost_efficiency_weight=0.10,
        compliance_weight=0.50,
        esg_improvement_weight=0.10,
        carbon_reduction_weight=0.05,
        time_efficiency_weight=0.05,
    ),
    OptimizationObjective.ESG_IMPROVEMENT: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.20,
        cost_efficiency_weight=0.10,
        compliance_weight=0.10,
        esg_improvement_weight=0.45,
        carbon_reduction_weight=0.10,
        time_efficiency_weight=0.05,
    ),
    OptimizationObjective.CARBON_REDUCTION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.20,
        cost_efficiency_weight=0.10,
        compliance_weight=0.10,
        esg_improvement_weight=0.10,
        carbon_reduction_weight=0.45,
        time_efficiency_weight=0.05,
    ),
    OptimizationObjective.TIME_MINIMIZATION: ObjectiveWeights(
        version="opt-weights-v1.0.0",
        risk_reduction_weight=0.20,
        cost_efficiency_weight=0.10,
        compliance_weight=0.10,
        esg_improvement_weight=0.10,
        carbon_reduction_weight=0.05,
        time_efficiency_weight=0.45,
    ),
}


def resolve_weights(
    objective: OptimizationObjective,
    custom_weights: Optional[ObjectiveWeights] = None
) -> ObjectiveWeights:
    """Returns normalized weights according to the selected objective preset or custom weights."""
    weights = custom_weights or PRESET_WEIGHTS.get(
        objective,
        PRESET_WEIGHTS[OptimizationObjective.BALANCED_OPTIMIZATION]
    )

    total = (
        weights.risk_reduction_weight
        + weights.cost_efficiency_weight
        + weights.compliance_weight
        + weights.esg_improvement_weight
        + weights.carbon_reduction_weight
        + weights.time_efficiency_weight
    )

    if total <= 0:
        return PRESET_WEIGHTS[OptimizationObjective.BALANCED_OPTIMIZATION]

    return ObjectiveWeights(
        version=weights.version,
        risk_reduction_weight=round(weights.risk_reduction_weight / total, 4),
        cost_efficiency_weight=round(weights.cost_efficiency_weight / total, 4),
        compliance_weight=round(weights.compliance_weight / total, 4),
        esg_improvement_weight=round(weights.esg_improvement_weight / total, 4),
        carbon_reduction_weight=round(weights.carbon_reduction_weight / total, 4),
        time_efficiency_weight=round(weights.time_efficiency_weight / total, 4),
    )


def calculate_action_utility(
    action: CandidateMitigation,
    baseline_risk_score: float,
    weights: ObjectiveWeights,
    budget_cap: float,
    deadline_days: int
) -> float:
    """
    Computes deterministic utility score u in [0, 100] for a single candidate action.
    """
    # 1. Risk reduction utility
    safe_baseline = max(baseline_risk_score, 1.0)
    u_risk = min(1.0, max(0.0, action.risk_reduction / safe_baseline))

    # 2. Cost efficiency utility (cheaper is better relative to budget)
    safe_budget = max(budget_cap, 1.0)
    u_cost = max(0.0, 1.0 - min(1.0, action.cost / safe_budget))

    # 3. Compliance coverage utility
    u_compliance = 1.0 if action.compliance_covered else 0.2

    # 4. ESG improvement utility (normalized against benchmark 50 pts)
    u_esg = min(1.0, max(0.0, action.esg_gain / 50.0))

    # 5. Carbon reduction utility (normalized against benchmark 100 tCO2e)
    u_carbon = min(1.0, max(0.0, action.carbon_reduction_tco2e / 100.0))

    # 6. Time efficiency utility (faster completion relative to deadline)
    safe_deadline = max(deadline_days, 1)
    u_time = max(0.0, 1.0 - min(1.0, action.implementation_days / safe_deadline))

    raw_utility = (
        weights.risk_reduction_weight * u_risk
        + weights.cost_efficiency_weight * u_cost
        + weights.compliance_weight * u_compliance
        + weights.esg_improvement_weight * u_esg
        + weights.carbon_reduction_weight * u_carbon
        + weights.time_efficiency_weight * u_time
    )

    return round(raw_utility * 100.0, 2)
