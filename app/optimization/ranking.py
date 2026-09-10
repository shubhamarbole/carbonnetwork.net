"""
Deterministic Ranking and Scoring Engine
Phase 15: Autonomous Risk Optimization
"""

from typing import List
from app.optimization.objectives import calculate_action_utility
from app.optimization.schemas import (
    CandidateMitigation,
    ObjectiveWeights,
    RiskPortfolioItem,
    SelectedMitigation,
)


def score_candidate_action(
    risk: RiskPortfolioItem,
    action: CandidateMitigation,
    weights: ObjectiveWeights,
    budget_cap: float,
    deadline_days: int,
) -> SelectedMitigation:
    """Calculates deterministic score and constructs SelectedMitigation descriptor."""
    utility_score = calculate_action_utility(
        action=action,
        baseline_risk_score=risk.current_score,
        weights=weights,
        budget_cap=budget_cap,
        deadline_days=deadline_days,
    )

    post_score = max(0.0, round(risk.current_score - action.risk_reduction, 2))

    reasons = []
    if action.risk_reduction > 0:
        reasons.append(f"Reduces risk by {action.risk_reduction:.1f} pts ({risk.current_score:.1f} -> {post_score:.1f})")
    if action.compliance_covered:
        reasons.append("Guarantees regulatory compliance coverage")
    if action.carbon_reduction_tco2e > 0:
        reasons.append(f"Abates {action.carbon_reduction_tco2e:.1f} tCO2e")
    if action.esg_gain > 0:
        reasons.append(f"+{action.esg_gain:.1f} ESG points")
    reasons.append(f"Est. cost: ${action.cost:,.2f} in {action.implementation_days}d")

    reason_str = " | ".join(reasons)

    return SelectedMitigation(
        risk_id=risk.risk_id,
        risk_title=risk.risk_title,
        priority=1,  # Will be assigned during portfolio ranking
        action_id=action.action_id,
        action_title=action.title,
        current_risk_score=risk.current_score,
        expected_reduction=action.risk_reduction,
        post_mitigation_score=post_score,
        estimated_cost=action.cost,
        implementation_time=action.implementation_days,
        resource_units=action.resource_units,
        optimization_score=utility_score,
        reason=reason_str,
    )


def rank_mitigations(mitigations: List[SelectedMitigation]) -> List[SelectedMitigation]:
    """
    Ranks mitigations in strictly descending order of optimization_score,
    breaking ties with lower cost and higher risk reduction.
    Assigns sequential 1-based priority ranks.
    """
    sorted_items = sorted(
        mitigations,
        key=lambda m: (m.optimization_score, -m.estimated_cost, m.expected_reduction),
        reverse=True,
    )

    ranked = []
    for idx, item in enumerate(sorted_items, start=1):
        item_dict = item.model_dump()
        item_dict["priority"] = idx
        ranked.append(SelectedMitigation(**item_dict))

    return ranked
