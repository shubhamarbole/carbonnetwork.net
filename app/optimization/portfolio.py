"""
Deterministic Portfolio Optimizer
Solves multi-risk response strategy allocation under hard resource & budget constraints.
Phase 15: Autonomous Risk Optimization
"""

from typing import Dict, List, Tuple
from app.optimization.constraints import evaluate_portfolio_constraints
from app.optimization.objectives import resolve_weights
from app.optimization.ranking import rank_mitigations, score_candidate_action
from app.optimization.schemas import (
    CandidateMitigation,
    OptimizationConstraints,
    OptimizationObjective,
    OptimizationRequest,
    OptimizationResponse,
    RiskPortfolioItem,
    SelectedMitigation,
)


def _ensure_default_candidate_actions(risk: RiskPortfolioItem) -> List[CandidateMitigation]:
    """Generates standard deterministic mitigation options if none provided."""
    if risk.candidate_actions:
        return risk.candidate_actions

    # Dynamic generation based on category and score
    is_compliance = risk.category.lower() == "compliance"
    is_env = risk.category.lower() == "environmental"
    base_cost = risk.current_score * 120.0

    return [
        CandidateMitigation(
            action_id=f"act_comp_{risk.risk_id[:8]}",
            title=f"Comprehensive Response: {risk.risk_title}",
            cost=round(base_cost * 1.5, 2),
            implementation_days=45,
            risk_reduction=round(risk.current_score * 0.70, 2),
            esg_gain=25.0 if is_env else 10.0,
            carbon_reduction_tco2e=60.0 if is_env else 10.0,
            compliance_covered=True if is_compliance else False,
            resource_units=3,
        ),
        CandidateMitigation(
            action_id=f"act_target_{risk.risk_id[:8]}",
            title=f"Targeted Mitigation: {risk.risk_title}",
            cost=round(base_cost * 0.85, 2),
            implementation_days=30,
            risk_reduction=round(risk.current_score * 0.45, 2),
            esg_gain=15.0 if is_env else 5.0,
            carbon_reduction_tco2e=35.0 if is_env else 5.0,
            compliance_covered=True if is_compliance else False,
            resource_units=2,
        ),
        CandidateMitigation(
            action_id=f"act_quick_{risk.risk_id[:8]}",
            title=f"Rapid Containment: {risk.risk_title}",
            cost=round(base_cost * 0.35, 2),
            implementation_days=14,
            risk_reduction=round(risk.current_score * 0.25, 2),
            esg_gain=5.0,
            carbon_reduction_tco2e=10.0,
            compliance_covered=False,
            resource_units=1,
        ),
    ]


def optimize_portfolio(request: OptimizationRequest, optimization_id: str) -> OptimizationResponse:
    """
    Executes deterministic portfolio optimization across all submitted risks.
    Finds the optimal set of mitigation strategies satisfying all constraints.
    """
    weights = resolve_weights(request.objective, request.custom_weights)
    constraints = request.constraints

    # 1. Expand risks with candidate actions if empty
    portfolio_risks: List[RiskPortfolioItem] = []
    for r in request.portfolio_risks:
        expanded_actions = _ensure_default_candidate_actions(r)
        portfolio_risks.append(
            RiskPortfolioItem(
                risk_id=r.risk_id,
                risk_title=r.risk_title,
                current_score=r.current_score,
                category=r.category,
                severity=r.severity,
                project_id=r.project_id,
                candidate_actions=expanded_actions,
            )
        )

    # 2. Score all candidate actions across all risks
    scored_by_risk: Dict[str, List[Tuple[CandidateMitigation, SelectedMitigation]]] = {}
    for r in portfolio_risks:
        scored_by_risk[r.risk_id] = []
        for a in r.candidate_actions:
            sel = score_candidate_action(
                risk=r,
                action=a,
                weights=weights,
                budget_cap=constraints.budget,
                deadline_days=constraints.deadline,
            )
            scored_by_risk[r.risk_id].append((a, sel))
        # Sort candidate actions for each risk by optimization score descending
        scored_by_risk[r.risk_id].sort(key=lambda x: x[1].optimization_score, reverse=True)

    # 3. Two-phase selection under knapsack constraints
    selected_mitigations: List[SelectedMitigation] = []
    remaining_budget = constraints.budget
    remaining_resources = constraints.resource_limit
    selected_risk_ids = set()

    # Pass 1: Mandatory Compliance Coverage for Critical/High Compliance risks
    if constraints.mandatory_compliance:
        for r in portfolio_risks:
            if r.category.lower() == "compliance" and r.severity in ["HIGH", "CRITICAL"]:
                # Pick best action that has compliance_covered == True
                compliant_candidates = [
                    (a, s) for a, s in scored_by_risk[r.risk_id] if a.compliance_covered
                ]
                chosen = compliant_candidates[0] if compliant_candidates else scored_by_risk[r.risk_id][0]
                action, sel_mit = chosen
                if sel_mit.estimated_cost <= remaining_budget:
                    selected_mitigations.append(sel_mit)
                    remaining_budget -= sel_mit.estimated_cost
                    remaining_resources -= sel_mit.resource_units
                    selected_risk_ids.add(r.risk_id)

    # Pass 2: Greedily select best actions for remaining unaddressed risks
    # Flatten remaining candidate actions and rank by utility density (score / max(cost, 1))
    unselected_candidates: List[Tuple[RiskPortfolioItem, CandidateMitigation, SelectedMitigation, float]] = []
    for r in portfolio_risks:
        if r.risk_id in selected_risk_ids:
            continue
        for a, s in scored_by_risk[r.risk_id]:
            density = s.optimization_score / max(s.estimated_cost, 100.0)
            unselected_candidates.append((r, a, s, density))

    # Sort candidates by optimization_score descending, with density tie-breaking
    unselected_candidates.sort(key=lambda x: (x[2].optimization_score, x[3]), reverse=True)

    for r, a, s, density in unselected_candidates:
        if r.risk_id in selected_risk_ids:
            continue
        if s.estimated_cost <= remaining_budget and s.resource_units <= remaining_resources:
            selected_mitigations.append(s)
            remaining_budget -= s.estimated_cost
            remaining_resources -= s.resource_units
            selected_risk_ids.add(r.risk_id)

    # If no mitigations were selected (e.g. tight budget), select at least the top affordable or lowest-cost action
    if not selected_mitigations and portfolio_risks:
        all_flattened = []
        for r in portfolio_risks:
            for a, s in scored_by_risk[r.risk_id]:
                all_flattened.append(s)
        if all_flattened:
            cheapest = min(all_flattened, key=lambda x: x.estimated_cost)
            selected_mitigations.append(cheapest)

    # 4. Final ranking and priority assignment
    ranked_strategies = rank_mitigations(selected_mitigations)

    # 5. Compute aggregate metrics
    total_cost = sum(m.estimated_cost for m in ranked_strategies)
    total_risk_reduced = sum(m.expected_reduction for m in ranked_strategies)
    max_days = max((m.implementation_time for m in ranked_strategies), default=0)

    # Find carbon and ESG gains for selected actions
    selected_action_ids = {m.action_id for m in ranked_strategies}
    total_carbon = 0.0
    total_esg = 0.0
    for r in portfolio_risks:
        for a in r.candidate_actions:
            if a.action_id in selected_action_ids:
                total_carbon += a.carbon_reduction_tco2e
                total_esg += a.esg_gain

    budget_util_pct = round((total_cost / max(constraints.budget, 1.0)) * 100.0, 2)
    if constraints.budget == 0.0:
        budget_util_pct = 0.0

    # 6. Constraint evaluation
    satisfied, violations = evaluate_portfolio_constraints(
        selected_mitigations=ranked_strategies,
        portfolio_risks=portfolio_risks,
        constraints=constraints,
        total_carbon=total_carbon,
        total_esg=total_esg,
    )

    # 7. Executive Narrative Summary
    exec_summary = (
        f"Autonomous Risk Optimization completed under objective '{request.objective.value}'. "
        f"Evaluated {len(portfolio_risks)} open risks; selected {len(ranked_strategies)} optimal mitigation strategies "
        f"totaling ${total_cost:,.2f} ({budget_util_pct}% budget utilization). "
        f"Projected to reduce aggregate risk exposure by {total_risk_reduced:.1f} points, "
        f"abate {total_carbon:.1f} tCO2e, and improve ESG score by {total_esg:.1f} points "
        f"with peak completion time of {max_days} days."
    )

    return OptimizationResponse(
        optimization_id=optimization_id,
        organization_id=request.organization_id,
        objective=request.objective.value,
        weights_version=weights.version,
        scoring_version="opt-score-v1.0.0",
        total_risks_considered=len(portfolio_risks),
        selected_mitigations_count=len(ranked_strategies),
        total_budget_allocated=round(total_cost, 2),
        budget_cap=round(constraints.budget, 2),
        budget_utilization_pct=budget_util_pct,
        total_risk_points_reduced=round(total_risk_reduced, 2),
        total_carbon_reduction_tco2e=round(total_carbon, 2),
        total_esg_gain=round(total_esg, 2),
        max_implementation_days=max_days,
        constraints_satisfied=satisfied,
        constraint_violations=violations,
        ranked_strategies=ranked_strategies,
        executive_summary=exec_summary,
        is_simulation=request.simulation_only,
    )
