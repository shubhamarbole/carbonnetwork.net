"""
Deterministic Scenario Risk Calculator
Phase 10: scenario-engine-v1.0.0
Applies hypothetical perturbations strictly in memory without mutating production records.
"""

import copy
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.scenario import ScenarioParameters, ScenarioType, AffectedRiskItem
from app.services.risk_scoring_service import calculate_risk_score, classify_severity

ENGINE_VERSION = "scenario-engine-v1.0.0"


def clamp(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Restricts values strictly within mathematical boundary [min_val, max_val]."""
    return max(min_val, min(max_val, val))


def perturb_factors(
    p: float,
    i: float,
    e: float,
    u: float,
    category: str,
    scenario_type: ScenarioType,
    params: ScenarioParameters
) -> Tuple[float, float, float, float]:
    """
    Applies scenario-specific perturbation factors deterministically to (P, I, E, U).
    Returns perturbed (p_prime, i_prime, e_prime, u_prime) clamped between 0 and 100.
    """
    cat = category.upper()
    new_p, new_i, new_e, new_u = p, i, e, u

    # Direct shifts if specified
    if params.probability_shift is not None:
        new_p += params.probability_shift
    if params.impact_shift is not None:
        new_i += params.impact_shift
    if params.exposure_shift is not None:
        new_e += params.exposure_shift
    if params.urgency_shift is not None:
        new_u += params.urgency_shift

    # Scenario type-specific domain perturbations
    if scenario_type == ScenarioType.CARBON_INCREASE:
        pct = params.carbon_emission_pct_change if params.carbon_emission_pct_change is not None else 25.0
        # Increases impact & exposure primarily on ENVIRONMENTAL & COMPLIANCE risks
        scale = pct / 100.0
        if "ENV" in cat or "CARBON" in cat or "CLIMATE" in cat:
            new_i += scale * 30.0
            new_e += scale * 25.0
            new_u += scale * 15.0
        else:
            new_i += scale * 10.0
            new_e += scale * 10.0

    elif scenario_type == ScenarioType.CARBON_REDUCTION:
        pct = abs(params.carbon_emission_pct_change if params.carbon_emission_pct_change is not None else 20.0)
        scale = pct / 100.0
        if "ENV" in cat or "CARBON" in cat or "CLIMATE" in cat:
            new_i -= scale * 25.0
            new_p -= scale * 20.0
            new_e -= scale * 20.0
        else:
            new_i -= scale * 10.0

    elif scenario_type == ScenarioType.ENERGY_INCREASE:
        pct = params.energy_consumption_pct_change if params.energy_consumption_pct_change is not None else 30.0
        scale = pct / 100.0
        new_i += scale * 20.0
        new_u += scale * 25.0
        if "OPERATIONAL" in cat or "ENERGY" in cat:
            new_p += scale * 20.0

    elif scenario_type == ScenarioType.ENERGY_REDUCTION:
        pct = abs(params.energy_consumption_pct_change if params.energy_consumption_pct_change is not None else 15.0)
        scale = pct / 100.0
        new_i -= scale * 15.0
        new_u -= scale * 15.0

    elif scenario_type == ScenarioType.COMPLIANCE_DELAY:
        days = params.compliance_delay_days if params.compliance_delay_days is not None else 30
        day_scale = min(days / 30.0, 3.0)
        if "COMPLIANCE" in cat or "LEGAL" in cat or "REGULATORY" in cat:
            new_u += day_scale * 28.0
            new_p += day_scale * 22.0
            new_i += day_scale * 15.0
        else:
            new_u += day_scale * 12.0

    elif scenario_type == ScenarioType.SUPPLIER_FAILURE:
        pct = params.supplier_risk_pct_change if params.supplier_risk_pct_change is not None else 40.0
        scale = pct / 100.0
        if "SUPPLIER" in cat or "OPERATIONAL" in cat or "REPUTATION" in cat:
            new_p += scale * 35.0
            new_i += scale * 30.0
            new_e += scale * 25.0
        else:
            new_p += scale * 15.0

    elif scenario_type == ScenarioType.PROJECT_DELAY:
        days = params.project_delay_days if params.project_delay_days is not None else 60
        day_scale = min(days / 60.0, 2.5)
        new_u += day_scale * 25.0
        new_i += day_scale * 20.0

    elif scenario_type == ScenarioType.ESG_DEGRADATION:
        pct = abs(params.esg_score_pct_change if params.esg_score_pct_change is not None else 25.0)
        scale = pct / 100.0
        new_i += scale * 25.0
        new_e += scale * 30.0
        new_p += scale * 20.0

    elif scenario_type == ScenarioType.MITIGATION_FAILURE:
        loss_pct = params.mitigation_effectiveness_loss_pct if params.mitigation_effectiveness_loss_pct is not None else 50.0
        scale = loss_pct / 100.0
        new_p += scale * 30.0
        new_i += scale * 25.0
        new_e += scale * 20.0

    elif scenario_type == ScenarioType.RISK_FACTOR_CHANGE:
        # Covered by direct shifts above
        pass

    return (
        round(clamp(new_p), 2),
        round(clamp(new_i), 2),
        round(clamp(new_e), 2),
        round(clamp(new_u), 2)
    )


def evaluate_scenario_risks(
    baseline_risks: List[Dict[str, Any]],
    scenario_type: ScenarioType,
    params: ScenarioParameters
) -> List[AffectedRiskItem]:
    """
    Deterministically calculates baseline and projected scores for all risks in scope.
    GUARANTEE: Pure function, baseline_risks input is NEVER mutated.
    """
    target_ids = set(params.target_risk_ids) if params.target_risk_ids else None
    target_cats = set([c.upper() for c in params.target_categories]) if params.target_categories else None

    affected: List[AffectedRiskItem] = []

    for raw_risk in baseline_risks:
        risk = copy.deepcopy(raw_risk)
        r_id = str(risk.get("id") or risk.get("_id", ""))
        title = str(risk.get("title", "Untitled Risk"))
        category = str(risk.get("category", "GENERAL"))

        # Check if in target scope
        if target_ids and r_id not in target_ids:
            # Outside target scope: untouched
            continue
        if target_cats and category.upper() not in target_cats:
            continue

        # Baseline factors
        bp = float(risk.get("probability", 50.0))
        bi = float(risk.get("impact", 50.0))
        be = float(risk.get("exposure", 50.0))
        bu = float(risk.get("urgency", 50.0))

        baseline_score = calculate_risk_score(bp, bi, be, bu)
        baseline_sev = classify_severity(baseline_score)

        # Perturb
        pp, pi, pe, pu = perturb_factors(bp, bi, be, bu, category, scenario_type, params)
        projected_score = calculate_risk_score(pp, pi, pe, pu)
        projected_sev = classify_severity(projected_score)

        delta = round(projected_score - baseline_score, 2)
        transition = f"{baseline_sev} -> {projected_sev}" if baseline_sev != projected_sev else f"{baseline_sev} (Unchanged)"

        # Explanatory note
        direction = "elevated" if delta > 0 else ("reduced" if delta < 0 else "stable")
        exp = f"Score {direction} by {abs(delta)} pts under {scenario_type.value} conditions ({transition})."

        affected.append(AffectedRiskItem(
            risk_id=r_id,
            title=title,
            category=category,
            baseline_probability=bp,
            baseline_impact=bi,
            baseline_exposure=be,
            baseline_urgency=bu,
            baseline_score=baseline_score,
            baseline_severity=baseline_sev,
            projected_probability=pp,
            projected_impact=pi,
            projected_exposure=pe,
            projected_urgency=pu,
            projected_score=projected_score,
            projected_severity=projected_sev,
            score_delta=delta,
            severity_transition=transition,
            explanation=exp
        ))

    return affected
