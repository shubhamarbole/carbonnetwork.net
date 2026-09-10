"""
Pydantic Schemas for Scenario / What-If Intelligence Engine
Phase 10: Deterministic simulation of hypothetical perturbations.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ScenarioType(str, Enum):
    CARBON_INCREASE = "CARBON_INCREASE"
    CARBON_REDUCTION = "CARBON_REDUCTION"
    ENERGY_INCREASE = "ENERGY_INCREASE"
    ENERGY_REDUCTION = "ENERGY_REDUCTION"
    COMPLIANCE_DELAY = "COMPLIANCE_DELAY"
    SUPPLIER_FAILURE = "SUPPLIER_FAILURE"
    PROJECT_DELAY = "PROJECT_DELAY"
    ESG_DEGRADATION = "ESG_DEGRADATION"
    MITIGATION_FAILURE = "MITIGATION_FAILURE"
    RISK_FACTOR_CHANGE = "RISK_FACTOR_CHANGE"


class ScenarioParameters(BaseModel):
    """Input parameters controlling scenario perturbation."""
    carbon_emission_pct_change: Optional[float] = Field(None, description="Percentage change in carbon emissions (-100 to +500)")
    energy_consumption_pct_change: Optional[float] = Field(None, description="Percentage change in energy consumption (-100 to +500)")
    compliance_delay_days: Optional[int] = Field(None, description="Delay in compliance filings in days (0 to 365)")
    supplier_risk_pct_change: Optional[float] = Field(None, description="Percentage change in supplier risk factor (-100 to +500)")
    project_delay_days: Optional[int] = Field(None, description="Project timeline delay in days (0 to 730)")
    esg_score_pct_change: Optional[float] = Field(None, description="Percentage change in ESG composite score (-100 to +100)")
    mitigation_effectiveness_loss_pct: Optional[float] = Field(None, description="Reduction in mitigation efficacy (0 to 100)")
    probability_shift: Optional[float] = Field(None, description="Direct probability shift in points (-100 to +100)")
    impact_shift: Optional[float] = Field(None, description="Direct impact shift in points (-100 to +100)")
    exposure_shift: Optional[float] = Field(None, description="Direct exposure shift in points (-100 to +100)")
    urgency_shift: Optional[float] = Field(None, description="Direct urgency shift in points (-100 to +100)")
    target_risk_ids: Optional[List[str]] = Field(None, description="Specific risk IDs to perturb (if None, applies to matching categories)")
    target_categories: Optional[List[str]] = Field(None, description="Risk categories impacted (e.g. ENVIRONMENTAL, OPERATIONAL, COMPLIANCE)")


class ScenarioCreateRequest(BaseModel):
    """Request to define a new scenario."""
    name: str = Field(..., min_length=3, max_length=120, description="Scenario human-readable name")
    description: Optional[str] = Field("", max_length=500, description="Scenario hypothesis or description")
    scenario_type: ScenarioType = Field(..., description="Type of perturbation to simulate")
    organization_id: str = Field(..., description="Mandatory tenant isolation identifier")
    project_id: Optional[str] = Field(None, description="Optional project scope")
    parameters: ScenarioParameters = Field(default_factory=ScenarioParameters)


class AffectedRiskItem(BaseModel):
    """Baseline vs Projected comparison for a single risk."""
    risk_id: str
    title: str
    category: str
    baseline_probability: float
    baseline_impact: float
    baseline_exposure: float
    baseline_urgency: float
    baseline_score: float
    baseline_severity: str
    projected_probability: float
    projected_impact: float
    projected_exposure: float
    projected_urgency: float
    projected_score: float
    projected_severity: str
    score_delta: float
    severity_transition: str
    explanation: Optional[str] = None


class PotentialSimulatedEvent(BaseModel):
    """Simulated event triggered under scenario conditions."""
    event_type: str
    title: str
    description: str
    severity: str
    simulation: bool = True


class ScenarioSimulationRequest(BaseModel):
    """Request payload to run a scenario simulation."""
    scenario_id: Optional[str] = None
    scenario_name: Optional[str] = "Ad-Hoc Simulation"
    scenario_type: ScenarioType
    organization_id: str
    project_id: Optional[str] = None
    parameters: ScenarioParameters = Field(default_factory=ScenarioParameters)
    risks: Optional[List[Dict[str, Any]]] = Field(None, description="Pre-loaded baseline risk objects")
    include_ai_explanation: bool = Field(True, description="Whether to generate LLM + RAG explanation")


class ScenarioResultResponse(BaseModel):
    """Deterministic simulation result output."""
    simulation_id: str
    scenario_id: Optional[str] = None
    scenario_name: str
    scenario_type: ScenarioType
    organization_id: str
    project_id: Optional[str] = None
    baseline_average_score: float
    projected_average_score: float
    score_delta: float
    baseline_critical_count: int
    projected_critical_count: int
    baseline_high_count: int
    projected_high_count: int
    affected_risks: List[AffectedRiskItem]
    potential_events: List[PotentialSimulatedEvent] = Field(default_factory=list)
    potential_alerts: List[Dict[str, Any]] = Field(default_factory=list)
    ai_explanation: Optional[str] = None
    policy_citations: List[Dict[str, Any]] = Field(default_factory=list)
    engine_version: str = "scenario-engine-v1.0.0"
    simulation_timestamp: str


class ScenarioComparisonRequest(BaseModel):
    """Request to compare multiple scenarios side-by-side."""
    organization_id: str
    project_id: Optional[str] = None
    scenario_ids: Optional[List[str]] = Field(None, description="List of scenario IDs")
    simulation_results: Optional[List[ScenarioResultResponse]] = Field(None, description="Pre-calculated simulation results")


class ScenarioComparisonResponse(BaseModel):
    """Multi-scenario comparison output matrix."""
    organization_id: str
    project_id: Optional[str] = None
    baseline_summary: Dict[str, Any]
    scenarios: List[Dict[str, Any]]
    comparison_matrix: Dict[str, Any]
    ai_synthesis: Optional[str] = None
