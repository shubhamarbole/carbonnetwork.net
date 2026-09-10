"""
Pydantic Schemas for Executive Risk Intelligence
Phase 11: Executive Risk Center, Deterministic Executive Risk Index, and AI Executive Briefings.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutiveRiskItem(BaseModel):
    risk_id: str
    score: float
    severity: str
    category: str = "Operational"
    project_id: Optional[str] = None


class DomainMetrics(BaseModel):
    esg_composite: float = 50.0
    carbon_exposure_tco2e: float = 0.0
    grid_carbon_intensity: float = 0.0
    cbam_exposure_eur: float = 0.0
    csrd_gap_count: int = 0
    active_events: int = 0


class ExecutiveIndexRequest(BaseModel):
    """Request to calculate organization-level Executive Risk Index."""
    organization_id: str = Field(..., description="Mandatory tenant isolation identifier")
    project_id: Optional[str] = Field(None, description="Optional project scope filter")
    risks: List[Any] = Field(default_factory=list, description="List of active risk objects")
    previous_index: Optional[float] = Field(None, description="Previous Executive Index snapshot for trend calculation")
    total_projects_count: Optional[int] = Field(None, description="Total number of projects in organization")


class ExecutiveIndexComponents(BaseModel):
    """Detailed breakdown of deterministic index calculation."""
    severity_weighted_mean: float
    critical_penalty: float
    category_concentration: float
    project_breadth: float
    total_risks: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int

    def __getitem__(self, item: str):
        return getattr(self, item)


class ExecutiveIndexResponse(BaseModel):
    """Deterministic Executive Risk Index calculation output."""
    executive_index: float = Field(..., ge=0.0, le=100.0, description="Consolidated Executive Risk Index [0.0 - 100.0]")
    overall_severity: str = Field(..., description="Severity tier: LOW, MEDIUM, HIGH, CRITICAL")
    trend: str = Field(..., description="Trajectory trend: INCREASING, STABLE, or DECREASING")
    calculation_version: str = Field("executive-index-v1.0.0", description="Algorithm version identifier")
    calculation_timestamp: str = Field(..., description="ISO 8601 calculation timestamp")
    components: ExecutiveIndexComponents

    @property
    def severity(self) -> str:
        return self.overall_severity

    @property
    def total_risks(self) -> int:
        return self.components.total_risks

    @property
    def critical_risks(self) -> int:
        return self.components.critical_count

    @property
    def high_risks(self) -> int:
        return self.components.high_count

    @property
    def model_version(self) -> str:
        return self.calculation_version


class ExecutiveBriefingRequest(BaseModel):
    """Request to synthesize an AI Executive Briefing from validated backend data."""
    organization_id: str = Field(..., description="Tenant isolation identifier")
    project_id: Optional[str] = Field(None, description="Optional project scope filter")
    created_by: Optional[str] = Field("Executive AI Assistant", description="Author identifier")
    executive_context: Dict[str, Any] = Field(..., description="Strictly validated backend metrics context")


class ExecutiveBriefingSections(BaseModel):
    """Structured sections of an executive briefing."""
    executive_summary: str
    top_risks_assessment: str
    emerging_risks_outlook: str
    esg_concerns: str
    carbon_exposure: str
    compliance_exposure: str
    critical_decisions: str
    overdue_actions: str
    recommended_priorities: str


class ExecutiveBriefingResponse(BaseModel):
    """Synthesized AI Executive Briefing response."""
    briefing_id: str
    organization_id: str
    project_id: Optional[str] = None
    summary: str
    sections: ExecutiveBriefingSections
    evidence_references: List[Dict[str, Any]] = Field(default_factory=list)
    model: str = Field("executive-analyst-v1")
    prompt_version: str = Field("v1.0.0")
    context_version: str = Field("v1.0.0")
    created_at: str
