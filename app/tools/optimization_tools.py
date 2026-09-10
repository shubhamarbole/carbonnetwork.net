"""
AI Agent Tools for Autonomous Risk Optimization
Phase 15: Autonomous Risk Optimization
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.tools import ToolDefinition, ToolRiskLevel


class OptimizePortfolioInput(BaseModel):
    objective: str = Field(
        "BALANCED_OPTIMIZATION",
        description="Optimization objective: BALANCED_OPTIMIZATION, RISK_MINIMIZATION, COST_MINIMIZATION, COMPLIANCE_PROTECTION, ESG_IMPROVEMENT, CARBON_REDUCTION, TIME_MINIMIZATION"
    )
    budget_cap: float = Field(50000.0, ge=0.0, description="Maximum total mitigation budget available in USD")
    deadline_days: int = Field(60, ge=1, description="Maximum implementation timeline in days")
    resource_limit: int = Field(20, ge=1, description="Maximum available resource units")
    risk_tolerance: float = Field(45.0, ge=0.0, le=100.0, description="Acceptable post-mitigation risk score threshold")
    mandatory_compliance: bool = Field(True, description="Strictly mandate coverage of critical/high compliance risks")
    top_n_risks: int = Field(10, ge=1, le=50, description="Number of top priority risks from tenant portfolio to optimize")


optimize_risk_portfolio_tool = ToolDefinition(
    name="optimize_risk_portfolio",
    description=(
        "Executes deterministic multi-objective risk optimization across the organization's open risks. "
        "Evaluates trade-offs between risk reduction, cost, compliance, ESG impact, carbon reduction, "
        "and timeline under strict budget and capacity constraints."
    ),
    input_schema=OptimizePortfolioInput,
    permission_required="risk.manage",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False,
)
