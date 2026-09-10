"""
Scenario Intelligence Microservice API Router
Phase 10: Deterministic simulation of hypothetical perturbations and multi-scenario comparisons.
"""

import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from app.schemas.scenario import (
    ScenarioSimulationRequest,
    ScenarioResultResponse,
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    ScenarioType,
    ScenarioParameters
)
from app.scenarios.engine import ScenarioEngine
from app.scenarios.comparison import build_comparison_matrix

logger = logging.getLogger("scenarios_api")
router = APIRouter()


@router.post("/simulate", response_model=ScenarioResultResponse, tags=["Scenarios"])
def simulate_scenario(request: ScenarioSimulationRequest):
    """Executes a deterministic what-if scenario simulation."""
    try:
        result = ScenarioEngine.simulate(request)
        return result
    except Exception as err:
        logger.error(f"Error simulating scenario: {err}")
        raise HTTPException(status_code=500, detail=f"Simulation execution failed: {str(err)}")


@router.post("/compare", response_model=ScenarioComparisonResponse, tags=["Scenarios"])
def compare_scenarios(request: ScenarioComparisonRequest):
    """Compares multiple scenario simulations side-by-side against baseline portfolio."""
    try:
        results = request.simulation_results or []
        if not results:
            # Generate default comparison set if none provided
            types = [ScenarioType.CARBON_INCREASE, ScenarioType.CARBON_REDUCTION, ScenarioType.COMPLIANCE_DELAY]
            for st in types:
                sim_req = ScenarioSimulationRequest(
                    scenario_name=f"Baseline Perturbation: {st.value}",
                    scenario_type=st,
                    organization_id=request.organization_id,
                    project_id=request.project_id,
                    parameters=ScenarioParameters(),
                    include_ai_explanation=False
                )
                results.append(ScenarioEngine.simulate(sim_req))

        comparison = build_comparison_matrix(request.organization_id, request.project_id, results)
        return comparison
    except Exception as err:
        logger.error(f"Error comparing scenarios: {err}")
        raise HTTPException(status_code=500, detail=f"Scenario comparison failed: {str(err)}")
