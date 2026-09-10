"""
Multi-Scenario Comparison Engine
Produces side-by-side matrices comparing baseline and multiple simulation results.
"""

from typing import Any, Dict, List, Optional
from app.schemas.scenario import ScenarioComparisonResponse, ScenarioResultResponse


def build_comparison_matrix(
    organization_id: str,
    project_id: Optional[str],
    simulation_results: List[ScenarioResultResponse]
) -> ScenarioComparisonResponse:
    """
    Assembles comparative analytics across multiple simulated scenarios.
    """
    if not simulation_results:
        return ScenarioComparisonResponse(
            organization_id=organization_id,
            project_id=project_id,
            baseline_summary={},
            scenarios=[],
            comparison_matrix={},
            ai_synthesis="No simulation results provided for comparison."
        )

    # Baseline extracted from first result
    first = simulation_results[0]
    baseline_summary = {
        "baseline_average_score": first.baseline_average_score,
        "baseline_critical_count": first.baseline_critical_count,
        "baseline_high_count": first.baseline_high_count,
        "total_evaluated_risks": len(first.affected_risks)
    }

    scenarios_list = []
    matrix_rows = []

    for res in simulation_results:
        s_info = {
            "simulation_id": res.simulation_id,
            "scenario_name": res.scenario_name,
            "scenario_type": res.scenario_type.value,
            "projected_average_score": res.projected_average_score,
            "score_delta": res.score_delta,
            "projected_critical_count": res.projected_critical_count,
            "projected_high_count": res.projected_high_count,
            "potential_events_count": len(res.potential_events),
            "potential_alerts_count": len(res.potential_alerts)
        }
        scenarios_list.append(s_info)

        matrix_rows.append({
            "scenario": res.scenario_name,
            "type": res.scenario_type.value,
            "avg_score": res.projected_average_score,
            "delta": res.score_delta,
            "critical_risks": res.projected_critical_count,
            "high_risks": res.projected_high_count
        })

    # Sort matrix by delta (highest risk impact first)
    matrix_rows.sort(key=lambda x: x["delta"], reverse=True)

    best_case = min(scenarios_list, key=lambda s: s["projected_average_score"])
    worst_case = max(scenarios_list, key=lambda s: s["projected_average_score"])

    synthesis = (
        f"Evaluated {len(simulation_results)} scenarios for organization {organization_id}. "
        f"The worst-case trajectory is '{worst_case['scenario_name']}' with an average risk score of {worst_case['projected_average_score']:.2f} "
        f"(delta: {worst_case['score_delta']:+.2f}). "
        f"The most favorable trajectory is '{best_case['scenario_name']}' with an average risk score of {best_case['projected_average_score']:.2f}."
    )

    return ScenarioComparisonResponse(
        organization_id=organization_id,
        project_id=project_id,
        baseline_summary=baseline_summary,
        scenarios=scenarios_list,
        comparison_matrix={"rows": matrix_rows, "best_case": best_case, "worst_case": worst_case},
        ai_synthesis=synthesis
    )
