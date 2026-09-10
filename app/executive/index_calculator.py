"""
Deterministic Executive Risk Index Calculator
Phase 11: executive-index-v1.0.0
Auditable, versioned organization-level risk aggregation.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.executive import ExecutiveIndexResponse, ExecutiveIndexComponents

CALCULATION_VERSION = "executive-index-v1.0.0"

SEVERITY_WEIGHTS = {
    "CRITICAL": 2.0,
    "HIGH": 1.5,
    "MEDIUM": 1.0,
    "LOW": 0.5
}


def classify_executive_severity(score: float) -> str:
    if score < 25.0:
        return "LOW"
    elif score < 50.0:
        return "MEDIUM"
    elif score < 75.0:
        return "HIGH"
    else:
        return "CRITICAL"


def calculate_executive_risk_index(
    risks: List[Dict[str, Any]],
    previous_index: Optional[float] = None,
    total_projects_count: Optional[int] = None
) -> ExecutiveIndexResponse:
    """
    Deterministic Executive Risk Index Formula:
    Index = round(0.45 * S_mean + 0.30 * C_penalty + 0.15 * H_conc + 0.10 * B_proj, 2)
    Clamped strictly to [0.0, 100.0].
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    n_total = len(risks)

    if n_total == 0:
        return ExecutiveIndexResponse(
            executive_index=0.0,
            overall_severity="LOW",
            trend="STABLE",
            calculation_version=CALCULATION_VERSION,
            calculation_timestamp=now_iso,
            components=ExecutiveIndexComponents(
                severity_weighted_mean=0.0,
                critical_penalty=0.0,
                category_concentration=0.0,
                project_breadth=0.0,
                total_risks=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0
            )
        )

    # 1. Severity Counts and Weighted Mean
    n_crit = 0
    n_high = 0
    n_med = 0
    n_low = 0
    sum_weighted_score = 0.0
    sum_weights = 0.0

    categories_count: Dict[str, int] = {}
    impacted_projects = set()
    all_projects = set()

    for r in risks:
        if not isinstance(r, dict):
            if hasattr(r, "model_dump"):
                r = r.model_dump()
            elif hasattr(r, "dict"):
                r = r.dict()
            else:
                r = dict(r)
        score = float(r.get("risk_score") or r.get("score") or 50.0)
        sev = str(r.get("severity", "MEDIUM")).upper()
        cat = str(r.get("category", "GENERAL")).upper()
        proj = r.get("projectId") or r.get("project_id")
        if proj:
            all_projects.add(str(proj))

        # Category tally
        categories_count[cat] = categories_count.get(cat, 0) + 1

        if sev == "CRITICAL" or score >= 75.0:
            n_crit += 1
            w = 2.0
            if proj: impacted_projects.add(str(proj))
        elif sev == "HIGH" or score >= 50.0:
            n_high += 1
            w = 1.5
            if proj: impacted_projects.add(str(proj))
        elif sev == "MEDIUM" or score >= 25.0:
            n_med += 1
            w = 1.0
            if proj: impacted_projects.add(str(proj))
        else:
            n_low += 1
            w = 0.5
            if proj: impacted_projects.add(str(proj))

        sum_weighted_score += (score * w)
        sum_weights += w

    s_mean = round(sum_weighted_score / max(sum_weights, 0.001), 2)

    # 2. Critical Penalty Component
    c_penalty = min(100.0, round((n_crit * 15.0) + (n_high * 5.0), 2))

    # 3. Category Concentration (Herfindahl-Hirschman Index)
    hhi_sum = 0.0
    for cat_cnt in categories_count.values():
        share = cat_cnt / float(n_total)
        hhi_sum += (share ** 2)
    h_conc = min(100.0, round(hhi_sum * 100.0, 2))

    # 4. Project Breadth Component
    total_proj = total_projects_count or len(all_projects)
    if total_proj > 0:
        b_proj = min(100.0, round((len(impacted_projects) / float(total_proj)) * 100.0, 2))
    else:
        b_proj = min(100.0, round((n_crit + n_high) * 12.0, 2))

    # 5. Composite Executive Index
    raw_index = (0.45 * s_mean) + (0.30 * c_penalty) + (0.15 * h_conc) + (0.10 * b_proj)
    exec_index = round(max(0.0, min(100.0, raw_index)), 2)

    # 6. Severity Classification
    if exec_index < 25.0:
        severity = "LOW"
    elif exec_index < 50.0:
        severity = "MEDIUM"
    elif exec_index < 75.0:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    # 7. Trend Determination
    if previous_index is not None:
        diff = exec_index - float(previous_index)
        if diff > 1.5:
            trend = "INCREASING"
        elif diff < -1.5:
            trend = "DECREASING"
        else:
            trend = "STABLE"
    else:
        # Default heuristic based on critical pressure
        if n_crit > 1 or (n_crit + n_high) >= 4:
            trend = "INCREASING"
        else:
            trend = "STABLE"

    return ExecutiveIndexResponse(
        executive_index=exec_index,
        overall_severity=severity,
        trend=trend,
        calculation_version=CALCULATION_VERSION,
        calculation_timestamp=now_iso,
        components=ExecutiveIndexComponents(
            severity_weighted_mean=s_mean,
            critical_penalty=c_penalty,
            category_concentration=h_conc,
            project_breadth=b_proj,
            total_risks=n_total,
            critical_count=n_crit,
            high_count=n_high,
            medium_count=n_med,
            low_count=n_low
        )
    )
