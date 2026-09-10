"""
Pydantic Schemas for Tool Registry and Tool Inputs
Phase 5: AI Agent + Tool Calling
"""

from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolRiskLevel(str, Enum):
    READ = "READ"
    WRITE = "WRITE"


# ==========================================
# Read Tool Input Schemas
# ==========================================

class ListRisksInput(BaseModel):
    category: Optional[str] = Field(None, description="Optional category filter e.g. Environmental, Compliance, Operational")
    severity: Optional[str] = Field(None, description="Optional severity filter: LOW, MEDIUM, HIGH, CRITICAL")
    status: Optional[str] = Field(None, description="Optional status filter: OPEN, UNDER_REVIEW, MITIGATION_IN_PROGRESS, MITIGATED, CLOSED")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of risks to return")


class GetRiskInput(BaseModel):
    risk_id: str = Field(..., min_length=1, description="Unique ID of the risk to retrieve")


class GetRiskHistoryInput(BaseModel):
    risk_id: str = Field(..., min_length=1, description="Unique ID of the risk to retrieve history for")


class GetProjectInput(BaseModel):
    project_id: str = Field(..., min_length=1, description="Unique ID of the project to retrieve")


class GetProjectRisksInput(BaseModel):
    project_id: str = Field(..., min_length=1, description="Unique ID of the project to retrieve risks for")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of risks to return")


class GetESGRecordsInput(BaseModel):
    category: Optional[str] = Field(None, description="ESG category: Energy, GHG, Water, Waste, Pollution, Biodiversity")
    facility_id: Optional[str] = Field(None, description="Optional facility ID filter")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return")


class GetCarbonRecordsInput(BaseModel):
    facility_id: Optional[str] = Field(None, description="Optional facility ID filter")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return")


class GetComplianceRecordsInput(BaseModel):
    status: Optional[str] = Field(None, description="Optional compliance status: Compliant, Under Review, Non-Compliant, Expired")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return")


class GetSupplierRecordsInput(BaseModel):
    risk_level: Optional[str] = Field(None, description="Optional supplier risk level: Low, Medium, High, Critical")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return")


class SearchKnowledgeBaseInput(BaseModel):
    query_text: str = Field(..., min_length=1, description="Search query for retrieving organizational knowledge evidence")
    top_k: int = Field(5, ge=1, le=20, description="Number of document chunks to retrieve")
    category: Optional[str] = Field(None, description="Optional document category filter")
    project_id: Optional[str] = Field(None, description="Optional project ID filter")


class GetMitigationPlanInput(BaseModel):
    risk_id: Optional[str] = Field(None, description="Risk ID to retrieve mitigation plan for")
    plan_id: Optional[str] = Field(None, description="Specific mitigation plan ID")


class GenerateRiskReportInput(BaseModel):
    report_type: str = Field("EXECUTIVE_SUMMARY", description="Type of report: EXECUTIVE_SUMMARY, DETAILED_AUDIT, COMPLIANCE_BRIEF")
    project_id: Optional[str] = Field(None, description="Optional project scope")
    include_recommendations: bool = Field(True, description="Whether to include remediation recommendations")


# ==========================================
# Write Tool Input Schemas
# ==========================================

class CreateMitigationPlanInput(BaseModel):
    risk_id: str = Field(..., min_length=1, description="Risk ID this mitigation plan addresses")
    title: str = Field(..., min_length=3, description="Title of the mitigation plan")
    steps: List[str] = Field(..., min_items=1, description="Ordered list of action steps")
    owner: str = Field(..., min_length=1, description="Owner or responsible team")
    target_date: str = Field(..., description="Target completion date (YYYY-MM-DD)")


class AssignRiskOwnerInput(BaseModel):
    risk_id: str = Field(..., min_length=1, description="Unique ID of the risk")
    owner_id: str = Field(..., min_length=1, description="User ID of the assigned owner")
    owner_name: Optional[str] = Field(None, description="Name or email of the assigned owner")


class UpdateMitigationStatusInput(BaseModel):
    risk_id: str = Field(..., min_length=1, description="Unique ID of the risk")
    status: str = Field(..., description="New status: OPEN, UNDER_REVIEW, MITIGATION_IN_PROGRESS, MITIGATED, CLOSED")
    notes: Optional[str] = Field(None, description="Reason or justification for the status transition")


class CreateAlertInput(BaseModel):
    severity: str = Field(..., description="Alert severity: Critical, Warning, Improvement, INFO")
    title: str = Field(..., min_length=3, description="Headline or title of the alert")
    message: str = Field(..., min_length=5, description="Detailed alert description")
    entity: Optional[str] = Field("RiskManager", description="Affected module or entity")


# ==========================================
# Registry & Execution Models
# ==========================================

class ToolDefinition(BaseModel):
    name: str = Field(..., description="Unique tool identifier")
    description: str = Field(..., description="Human and LLM-readable summary of tool behavior")
    input_schema: Any = Field(..., description="Pydantic model class for input validation")
    output_schema: Optional[Any] = Field(None, description="Expected schema or dict")
    permission_required: str = Field("risk.read", description="Permission needed to call this tool")
    risk_level: ToolRiskLevel = Field(ToolRiskLevel.READ, description="READ or WRITE")
    requires_approval: bool = Field(False, description="Whether human approval is required before execution")
    version: str = Field("1.0.0", description="Semantic tool version")
    category: str = Field("Risk", description="Category: Risk, ESG, Carbon, Compliance, Supplier, Project, Scenario, Decision, Reporting, Executive, Optimization")
    owner: str = Field("Platform", description="Tool owner")
    audit_policy: str = Field("LOG_EXECUTION", description="Audit logging policy")
    enabled: bool = Field(True, description="Whether tool is enabled")


class ToolResult(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    requires_approval: bool = False
    approval_reason: Optional[str] = None
    approval_details: Optional[Dict[str, Any]] = None
