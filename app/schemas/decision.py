"""
Pydantic Schemas for Advanced Decision Intelligence
Phase 13: Decision Engine, Multi-Option Evaluation, Objectives, Weights,
Constraints, Deterministic Scoring, and Outcome Tracking.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DecisionObjective(str, Enum):
    RISK_REDUCTION = "RISK_REDUCTION"
    COST_MINIMIZATION = "COST_MINIMIZATION"
    COMPLIANCE = "COMPLIANCE"
    ESG_IMPROVEMENT = "ESG_IMPROVEMENT"
    CARBON_REDUCTION = "CARBON_REDUCTION"
    OPERATIONAL_STABILITY = "OPERATIONAL_STABILITY"
    BALANCED_OUTCOME = "BALANCED_OUTCOME"


class DecisionStatus(str, Enum):
    DRAFT = "DRAFT"
    ANALYZING = "ANALYZING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DecisionWeights(BaseModel):
    weight_version: str = Field(default="weight-v1.0.0")
    risk_reduction: float = Field(default=0.30, ge=0.0, le=1.0)
    cost: float = Field(default=0.20, ge=0.0, le=1.0)
    esg_impact: float = Field(default=0.15, ge=0.0, le=1.0)
    carbon_impact: float = Field(default=0.15, ge=0.0, le=1.0)
    compliance: float = Field(default=0.10, ge=0.0, le=1.0)
    implementation_time: float = Field(default=0.05, ge=0.0, le=1.0)
    operational_impact: float = Field(default=0.05, ge=0.0, le=1.0)


class DecisionConstraints(BaseModel):
    max_cost: Optional[float] = Field(default=None, ge=0.0)
    max_implementation_time_days: Optional[float] = Field(default=None, ge=0.0)
    min_risk_reduction_points: Optional[float] = Field(default=None, ge=0.0)
    max_operational_impact: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    mandatory_compliance_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)


class DecisionOptionInput(BaseModel):
    option_id: str
    name: str
    description: Optional[str] = ""
    inputs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    scenario_reference: Optional[str] = None
    projected_risk: float = Field(default=50.0, ge=0.0, le=100.0)
    projected_cost: float = Field(default=0.0, ge=0.0)
    projected_esg_impact: float = Field(default=50.0, ge=0.0, le=100.0)
    projected_carbon_impact: float = Field(default=0.0, ge=0.0)  # e.g., tCO2e reduced
    projected_compliance_exposure: float = Field(default=0.0, ge=0.0)  # e.g., residual penalty or exposure
    implementation_time: float = Field(default=30.0, ge=0.0)  # days
    operational_impact: float = Field(default=20.0, ge=0.0, le=100.0)  # friction/disruption scale


class EvaluatedOptionSchema(DecisionOptionInput):
    decision_score: float = Field(default=0.0, ge=0.0, le=100.0)
    rank: int = Field(default=1, ge=1)
    normalized_benefit: float = Field(default=0.0)
    normalized_cost_friction: float = Field(default=0.0)
    risk_reduction_delta: float = Field(default=0.0)
    constraint_violations: List[str] = Field(default_factory=list)
    is_feasible: bool = True


class DecisionAnalysisRequest(BaseModel):
    decision_id: str
    title: str
    organization_id: str
    project_id: Optional[str] = None
    baseline_risk_score: float = Field(default=60.0, ge=0.0, le=100.0)
    objective: DecisionObjective = DecisionObjective.BALANCED_OUTCOME
    constraints: Optional[DecisionConstraints] = Field(default_factory=DecisionConstraints)
    custom_weights: Optional[DecisionWeights] = None
    options: List[DecisionOptionInput]


class DecisionAnalysisResponse(BaseModel):
    decision_id: str
    scoring_version: str = "decision-score-v1.0.0"
    objective: DecisionObjective
    weights_used: DecisionWeights
    ranked_options: List[EvaluatedOptionSchema]
    top_recommended_option_id: Optional[str] = None
    total_options_evaluated: int
    feasible_options_count: int


class DecisionComparisonRequest(BaseModel):
    decision_id: str
    organization_id: str
    baseline_risk_score: float = Field(default=60.0, ge=0.0, le=100.0)
    options: List[DecisionOptionInput]
    objective: DecisionObjective = DecisionObjective.BALANCED_OUTCOME
    custom_weights: Optional[DecisionWeights] = None


class ComparisonMatrixMetric(BaseModel):
    metric_key: str
    label: str
    unit: str
    values_by_option: Dict[str, Any]
    best_option_id: Optional[str] = None


class DecisionComparisonResponse(BaseModel):
    decision_id: str
    comparison_timestamp: str
    metrics: List[ComparisonMatrixMetric]
    summary_matrix: Dict[str, Dict[str, Any]]
    scoring_version: str = "decision-score-v1.0.0"


class DecisionRecommendationRequest(BaseModel):
    decision_id: str
    title: str
    description: Optional[str] = ""
    organization_id: str
    project_id: Optional[str] = None
    baseline_risk: Dict[str, Any]
    predictions: Optional[Dict[str, Any]] = None
    scenario_results: Optional[List[Dict[str, Any]]] = None
    evaluated_options: List[EvaluatedOptionSchema]
    objective: DecisionObjective = DecisionObjective.BALANCED_OUTCOME
    rag_citations: Optional[List[Dict[str, Any]]] = None
    historical_outcomes: Optional[List[Dict[str, Any]]] = None


class OptionRiskAssessment(BaseModel):
    option_id: str
    name: str
    key_risks: List[str]
    residual_vulnerabilities: List[str]
    mitigation_readiness: str


class DecisionRecommendationResponse(BaseModel):
    decision_id: str
    recommended_option_id: str
    recommended_option_name: str
    executive_rationale: str
    tradeoff_explanation: str
    risks_of_options: List[OptionRiskAssessment]
    evidence_references: List[Dict[str, Any]]
    confidence_score: float = Field(default=0.92, ge=0.0, le=1.0)
    generated_at: str


class DecisionOutcomeEvaluationRequest(BaseModel):
    outcome_id: str
    decision_id: str
    option_id: str
    expected_risk: float
    expected_cost: float
    expected_esg: float
    expected_carbon: float
    expected_compliance: float
    actual_risk: float
    actual_cost: float
    actual_esg: float
    actual_carbon: float
    actual_compliance: float
    baseline_risk: Optional[float] = None


class DecisionOutcomeEvaluationResponse(BaseModel):
    outcome_id: str
    decision_id: str
    option_id: str
    forecast_error: float
    expected_risk_reduction: float
    actual_risk_reduction: float
    cost_variance: float
    cost_variance_percentage: float
    esg_delta: float
    carbon_delta: float
    compliance_delta: float
    evaluation_rating: str  # e.g., HIGH_ACCURACY, MODERATE_ACCURACY, VARIANCE_EXCEEDED
    accuracy_notes: str
    evaluated_at: str
