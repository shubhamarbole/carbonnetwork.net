"""
Pydantic Schemas for Phase 15: Autonomous Risk Optimization
Deterministic portfolio scoring, multi-objective weights, and constraints.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class OptimizationObjective(str, Enum):
    RISK_MINIMIZATION = "RISK_MINIMIZATION"
    COST_MINIMIZATION = "COST_MINIMIZATION"
    COMPLIANCE_PROTECTION = "COMPLIANCE_PROTECTION"
    ESG_IMPROVEMENT = "ESG_IMPROVEMENT"
    CARBON_REDUCTION = "CARBON_REDUCTION"
    TIME_MINIMIZATION = "TIME_MINIMIZATION"
    BALANCED_OPTIMIZATION = "BALANCED_OPTIMIZATION"


class ObjectiveWeights(BaseModel):
    version: str = Field("opt-weights-v1.0.0", description="Version of the objective weight configuration")
    risk_reduction_weight: float = Field(0.35, ge=0.0, le=1.0)
    cost_efficiency_weight: float = Field(0.20, ge=0.0, le=1.0)
    compliance_weight: float = Field(0.15, ge=0.0, le=1.0)
    esg_improvement_weight: float = Field(0.10, ge=0.0, le=1.0)
    carbon_reduction_weight: float = Field(0.10, ge=0.0, le=1.0)
    time_efficiency_weight: float = Field(0.10, ge=0.0, le=1.0)


class OptimizationConstraints(BaseModel):
    budget: float = Field(..., ge=0.0, description="Total monetary budget cap in USD/EUR")
    deadline: int = Field(..., ge=1, description="Maximum implementation timeline in days")
    resource_limit: int = Field(100, ge=1, description="Maximum resource/headcount capacity units")
    risk_tolerance: float = Field(50.0, ge=0.0, le=100.0, description="Maximum acceptable post-mitigation risk score")
    mandatory_compliance: bool = Field(True, description="Strictly mandate mitigation of all critical compliance risks")
    carbon_target: Optional[float] = Field(None, ge=0.0, description="Target minimum carbon reduction in tCO2e")
    esg_target: Optional[float] = Field(None, ge=0.0, description="Target minimum ESG score gain")


class CandidateMitigation(BaseModel):
    action_id: str = Field(..., description="Unique ID of candidate mitigation action")
    title: str = Field(..., description="Action title or strategy description")
    cost: float = Field(..., ge=0.0, description="Estimated implementation cost")
    implementation_days: int = Field(..., ge=1, description="Required days to complete")
    risk_reduction: float = Field(..., ge=0.0, le=100.0, description="Expected drop in Phase 2 risk score points")
    esg_gain: float = Field(0.0, ge=0.0, description="Expected ESG score gain")
    carbon_reduction_tco2e: float = Field(0.0, ge=0.0, description="Expected carbon reduction in metric tons")
    compliance_covered: bool = Field(False, description="Whether this addresses a formal compliance mandate")
    resource_units: int = Field(1, ge=1, description="Personnel or operational capacity units required")


class RiskPortfolioItem(BaseModel):
    risk_id: str = Field(..., description="Authoritative Risk ID")
    risk_title: str = Field(..., description="Risk headline")
    current_score: float = Field(..., ge=0.0, le=100.0, description="Authoritative Phase 2 risk score")
    category: str = Field(..., description="Category: Environmental, Compliance, Operational, etc.")
    severity: str = Field(..., description="Severity: LOW, MEDIUM, HIGH, CRITICAL")
    project_id: Optional[str] = None
    candidate_actions: List[CandidateMitigation] = Field(default_factory=list)


class OptimizationRequest(BaseModel):
    organization_id: str
    objective: OptimizationObjective = OptimizationObjective.BALANCED_OPTIMIZATION
    custom_weights: Optional[ObjectiveWeights] = None
    constraints: OptimizationConstraints
    portfolio_risks: List[RiskPortfolioItem]
    simulation_only: bool = False


class SelectedMitigation(BaseModel):
    risk_id: str
    risk_title: str
    priority: int
    action_id: str
    action_title: str
    current_risk_score: float
    expected_reduction: float
    post_mitigation_score: float
    estimated_cost: float
    implementation_time: int
    resource_units: int
    optimization_score: float
    reason: str


class OptimizationResponse(BaseModel):
    optimization_id: str
    organization_id: str
    objective: str
    weights_version: str = "opt-weights-v1.0.0"
    scoring_version: str = "opt-score-v1.0.0"
    total_risks_considered: int
    selected_mitigations_count: int
    total_budget_allocated: float
    budget_cap: float
    budget_utilization_pct: float
    total_risk_points_reduced: float
    total_carbon_reduction_tco2e: float
    total_esg_gain: float
    max_implementation_days: int
    constraints_satisfied: bool
    constraint_violations: List[str] = Field(default_factory=list)
    ranked_strategies: List[SelectedMitigation] = Field(default_factory=list)
    executive_summary: str
    is_simulation: bool = False
