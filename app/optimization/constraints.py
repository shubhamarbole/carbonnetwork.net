"""
Deterministic Constraint Evaluation and Validation
Phase 15: Autonomous Risk Optimization
"""

from typing import List, Tuple
from app.optimization.schemas import (
    CandidateMitigation,
    OptimizationConstraints,
    RiskPortfolioItem,
    SelectedMitigation,
)


class ConstraintValidationError(ValueError):
    pass


def validate_constraints(constraints: OptimizationConstraints) -> None:
    """
    Guarantees constraint parameters are within valid numerical domains.
    Rejects any malicious or nonsensical parameters.
    """
    if constraints.budget < 0.0:
        raise ConstraintValidationError("Budget constraint cannot be negative.")
    if constraints.deadline < 1:
        raise ConstraintValidationError("Deadline constraint must be at least 1 day.")
    if constraints.resource_limit < 1:
        raise ConstraintValidationError("Resource limit must be at least 1 unit.")
    if not (0.0 <= constraints.risk_tolerance <= 100.0):
        raise ConstraintValidationError("Risk tolerance must be between 0.0 and 100.0.")
    if constraints.carbon_target is not None and constraints.carbon_target < 0.0:
        raise ConstraintValidationError("Carbon target cannot be negative.")
    if constraints.esg_target is not None and constraints.esg_target < 0.0:
        raise ConstraintValidationError("ESG target cannot be negative.")


def evaluate_portfolio_constraints(
    selected_mitigations: List[SelectedMitigation],
    portfolio_risks: List[RiskPortfolioItem],
    constraints: OptimizationConstraints,
    total_carbon: float,
    total_esg: float,
) -> Tuple[bool, List[str]]:
    """
    Verifies whether the aggregated selected mitigations satisfy all portfolio constraints.
    Returns (satisfied: bool, violations: List[str]).
    """
    violations: List[str] = []

    # 1. Budget Constraint
    total_cost = sum(m.estimated_cost for m in selected_mitigations)
    if total_cost > constraints.budget:
        violations.append(
            f"Total cost (${total_cost:,.2f}) exceeds budget cap (${constraints.budget:,.2f})"
        )

    # 2. Timeline Constraint
    max_days = max((m.implementation_time for m in selected_mitigations), default=0)
    if max_days > constraints.deadline:
        violations.append(
            f"Maximum implementation time ({max_days} days) exceeds deadline cap ({constraints.deadline} days)"
        )

    # 3. Resource Limit
    total_resources = sum(m.resource_units for m in selected_mitigations)
    if total_resources > constraints.resource_limit:
        violations.append(
            f"Total resource units ({total_resources}) exceed resource capacity ({constraints.resource_limit})"
        )

    # 4. Post-Mitigation Risk Tolerance
    for m in selected_mitigations:
        if m.post_mitigation_score > constraints.risk_tolerance:
            violations.append(
                f"Post-mitigation score ({m.post_mitigation_score:.1f}) for '{m.risk_title}' exceeds risk tolerance ({constraints.risk_tolerance:.1f})"
            )

    # 5. Mandatory Compliance
    if constraints.mandatory_compliance:
        selected_risk_ids = {m.risk_id for m in selected_mitigations}
        for r in portfolio_risks:
            if r.category.lower() == "compliance" and r.severity in ["HIGH", "CRITICAL"]:
                if r.risk_id not in selected_risk_ids:
                    violations.append(
                        f"Mandatory compliance protection: High/Critical risk '{r.risk_title}' ({r.risk_id}) is unmitigated"
                    )

    # 6. Carbon Target
    if constraints.carbon_target is not None and total_carbon < constraints.carbon_target:
        violations.append(
            f"Total carbon reduction ({total_carbon:.2f} tCO2e) is below target ({constraints.carbon_target:.2f} tCO2e)"
        )

    # 7. ESG Target
    if constraints.esg_target is not None and total_esg < constraints.esg_target:
        violations.append(
            f"Total ESG score gain ({total_esg:.2f} pts) is below target ({constraints.esg_target:.2f} pts)"
        )

    return (len(violations) == 0, violations)
