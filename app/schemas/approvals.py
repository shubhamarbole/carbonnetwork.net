"""
Pydantic Schemas for HITL Approval System
Phase 5: AI Agent + Tool Calling
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ApprovalRequest(BaseModel):
    approval_id: str = Field(..., description="Unique approval identifier")
    agent_run_id: str = Field(..., description="Run ID associated with this approval request")
    tool_name: str = Field(..., description="Tool requiring authorization")
    reason: str = Field(..., description="Justification and risk context for why approval is required")
    requested_action: Dict[str, Any] = Field(..., description="Validated tool parameters proposed by the agent")
    requested_by_agent: str = Field("RiskAgent", description="Agent identity requesting the action")
    status: ApprovalStatus = Field(ApprovalStatus.PENDING, description="Current approval status")
    approved_by: Optional[str] = Field(None, description="User ID or email of approver")
    approved_at: Optional[str] = Field(None, description="ISO timestamp of approval")
    rejected_by: Optional[str] = Field(None, description="User ID or email of rejector")
    rejected_at: Optional[str] = Field(None, description="ISO timestamp of rejection")
    created_at: str = Field(..., description="ISO timestamp of creation")


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., description="'APPROVE' or 'REJECT'")
    user_id: Optional[str] = Field(None, description="User performing the action")
    comment: Optional[str] = Field(None, description="Optional notes or feedback")
