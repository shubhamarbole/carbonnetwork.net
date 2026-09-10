"""
Decision Intelligence AI Agent Tools
Phase 13: Allows the AI Agent to evaluate decision options, compare alternatives,
and generate grounded recommendations.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.tools import ToolDefinition, ToolRiskLevel
from app.schemas.decision import DecisionObjective


class AnalyzeDecisionOptionsInput(BaseModel):
    """Input schema for analyze_decision_options tool."""
    decision_id: str = Field(..., description="Unique decision ID")
    title: str = Field(..., description="Title of the decision")
    baseline_risk_score: float = Field(..., ge=0.0, le=100.0, description="Authoritative Phase 2 current risk score")
    objective: Optional[str] = Field("BALANCED_OUTCOME", description="Objective: RISK_REDUCTION, COST_MINIMIZATION, COMPLIANCE, ESG_IMPROVEMENT, CARBON_REDUCTION, OPERATIONAL_STABILITY, BALANCED_OUTCOME")
    options: List[Dict[str, Any]] = Field(..., description="List of decision options with projected_risk, projected_cost, etc.")
    constraints: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional constraints: max_cost, max_implementation_time_days, min_risk_reduction_points")


class CompareDecisionOptionsInput(BaseModel):
    """Input schema for compare_decision_options tool."""
    decision_id: str = Field(..., description="Unique decision ID")
    baseline_risk_score: float = Field(..., ge=0.0, le=100.0, description="Authoritative baseline risk score")
    options: List[Dict[str, Any]] = Field(..., description="List of decision options to contrast")
    objective: Optional[str] = Field("BALANCED_OUTCOME", description="Decision objective")


class RecommendDecisionOptionInput(BaseModel):
    """Input schema for recommend_decision_option tool."""
    decision_id: str = Field(..., description="Unique decision ID")
    title: str = Field(..., description="Title of the decision")
    baseline_risk: Dict[str, Any] = Field(..., description="Authoritative baseline risk details (id, risk_score, severity)")
    evaluated_options: List[Dict[str, Any]] = Field(..., description="List of evaluated options with decision_score and rank")
    objective: Optional[str] = Field("BALANCED_OUTCOME", description="Strategic decision objective")


analyze_decision_options_tool = ToolDefinition(
    name="analyze_decision_options",
    description="Evaluates multiple decision options using deterministic multi-attribute utility scoring (decision-score-v1.0.0), applying constraints and ranking alternatives.",
    input_schema=AnalyzeDecisionOptionsInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)

compare_decision_options_tool = ToolDefinition(
    name="compare_decision_options",
    description="Builds a comprehensive side-by-side comparison matrix of decision options across risk, cost, ESG, carbon, compliance, time, and disruption.",
    input_schema=CompareDecisionOptionsInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)

recommend_decision_option_tool = ToolDefinition(
    name="recommend_decision_option",
    description="Generates an evidence-grounded AI recommendation, executive rationale, and tradeoff analysis across deterministic decision options without modifying authoritative metrics.",
    input_schema=RecommendDecisionOptionInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)
