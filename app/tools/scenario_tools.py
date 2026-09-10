"""
Scenario Intelligence AI Agent Tools
Phase 10: Allows the AI Agent to run what-if simulations and compare risk trajectories.
"""

import logging
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.tools import ToolDefinition, ToolRiskLevel, ToolResult
from app.schemas.scenario import (
    ScenarioSimulationRequest,
    ScenarioType,
    ScenarioParameters,
    ScenarioResultResponse
)
from app.scenarios.engine import ScenarioEngine
from app.scenarios.comparison import build_comparison_matrix

logger = logging.getLogger("scenario_tools")


class SimulateRiskScenarioInput(BaseModel):
    """Input schema for simulate_risk_scenario tool."""
    scenario_type: str = Field(..., description="Type of perturbation: CARBON_INCREASE, CARBON_REDUCTION, ENERGY_INCREASE, ENERGY_REDUCTION, COMPLIANCE_DELAY, SUPPLIER_FAILURE, PROJECT_DELAY, ESG_DEGRADATION, MITIGATION_FAILURE, RISK_FACTOR_CHANGE")
    scenario_name: Optional[str] = Field("Agent What-If Simulation", description="Descriptive name for simulation")
    carbon_emission_pct_change: Optional[float] = Field(None, description="Perturbation percentage for carbon")
    compliance_delay_days: Optional[int] = Field(None, description="Perturbation delay in days for compliance")
    supplier_risk_pct_change: Optional[float] = Field(None, description="Perturbation percentage for supplier risk")
    energy_consumption_pct_change: Optional[float] = Field(None, description="Perturbation percentage for energy consumption")
    project_delay_days: Optional[int] = Field(None, description="Perturbation delay in days for project")
    probability_shift: Optional[float] = Field(None, description="Direct probability shift in points")
    impact_shift: Optional[float] = Field(None, description="Direct impact shift in points")
    target_categories: Optional[List[str]] = Field(None, description="Specific categories to target")


class CompareRiskScenariosInput(BaseModel):
    """Input schema for compare_risk_scenarios tool."""
    scenario_types: List[str] = Field(..., description="List of scenario types to simulate and contrast")


def execute_simulate_risk_scenario(
    parameters: Dict[str, Any],
    user_context: Any
) -> ToolResult:
    start = time.time()
    try:
        raw_type = parameters.get("scenario_type", "CARBON_INCREASE").upper()
        try:
            scen_type = ScenarioType(raw_type)
        except ValueError:
            scen_type = ScenarioType.CARBON_INCREASE

        params = ScenarioParameters(
            carbon_emission_pct_change=parameters.get("carbon_emission_pct_change"),
            compliance_delay_days=parameters.get("compliance_delay_days"),
            supplier_risk_pct_change=parameters.get("supplier_risk_pct_change"),
            energy_consumption_pct_change=parameters.get("energy_consumption_pct_change"),
            project_delay_days=parameters.get("project_delay_days"),
            probability_shift=parameters.get("probability_shift"),
            impact_shift=parameters.get("impact_shift"),
            target_categories=parameters.get("target_categories")
        )

        org_id = getattr(user_context, "organization_id", "org_default")
        proj_id = getattr(user_context, "project_id", None)

        sim_req = ScenarioSimulationRequest(
            scenario_name=parameters.get("scenario_name", f"Agent Simulation: {scen_type.value}"),
            scenario_type=scen_type,
            organization_id=org_id,
            project_id=proj_id,
            parameters=params,
            include_ai_explanation=True
        )

        result = ScenarioEngine.simulate(sim_req)
        elapsed = round((time.time() - start) * 1000.0, 2)
        return ToolResult(success=True, data=result.model_dump(), execution_time_ms=elapsed)
    except Exception as err:
        logger.error(f"Error executing simulate_risk_scenario: {err}")
        return ToolResult(success=False, error=str(err), execution_time_ms=round((time.time() - start) * 1000.0, 2))


def execute_compare_risk_scenarios(
    parameters: Dict[str, Any],
    user_context: Any
) -> ToolResult:
    start = time.time()
    try:
        types = parameters.get("scenario_types", ["CARBON_INCREASE", "CARBON_REDUCTION"])
        org_id = getattr(user_context, "organization_id", "org_default")
        proj_id = getattr(user_context, "project_id", None)

        sim_results: List[ScenarioResultResponse] = []
        for t in types:
            try:
                st = ScenarioType(t.upper())
            except ValueError:
                continue
            req = ScenarioSimulationRequest(
                scenario_name=f"Scenario: {st.value}",
                scenario_type=st,
                organization_id=org_id,
                project_id=proj_id,
                parameters=ScenarioParameters(),
                include_ai_explanation=False
            )
            sim_results.append(ScenarioEngine.simulate(req))

        comp_resp = build_comparison_matrix(org_id, proj_id, sim_results)
        elapsed = round((time.time() - start) * 1000.0, 2)
        return ToolResult(success=True, data=comp_resp.model_dump(), execution_time_ms=elapsed)
    except Exception as err:
        logger.error(f"Error executing compare_risk_scenarios: {err}")
        return ToolResult(success=False, error=str(err), execution_time_ms=round((time.time() - start) * 1000.0, 2))


simulate_risk_scenario_tool = ToolDefinition(
    name="simulate_risk_scenario",
    description="Runs a deterministic what-if scenario simulation (e.g. CARBON_INCREASE, COMPLIANCE_DELAY, SUPPLIER_FAILURE) projecting changes in risk scores, severity tiers, potential alerts, and workflows without altering production data.",
    input_schema=SimulateRiskScenarioInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)

compare_risk_scenarios_tool = ToolDefinition(
    name="compare_risk_scenarios",
    description="Compares multiple what-if risk scenarios side-by-side against the baseline portfolio, identifying best-case and worst-case risk trajectories.",
    input_schema=CompareRiskScenariosInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)
