"""
Pydantic Schemas for AI Agent Execution, Steps, and Run State
Phase 5: AI Agent + Tool Calling
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.approvals import ApprovalRequest


class AgentStateEnum(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PLANNING = "PLANNING"
    TOOL_EXECUTION = "TOOL_EXECUTION"
    OBSERVING = "OBSERVING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class AgentStepType(str, Enum):
    PLANNING = "PLANNING"
    TOOL_CALL = "TOOL_CALL"
    TOOL_RESULT = "TOOL_RESULT"
    RAG_RETRIEVAL = "RAG_RETRIEVAL"
    LLM_ANALYSIS = "LLM_ANALYSIS"
    APPROVAL_REQUEST = "APPROVAL_REQUEST"
    FINAL_RESPONSE = "FINAL_RESPONSE"


class UserContext(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    organization_id: str = Field(..., description="Tenant organization identifier")
    role: str = Field("VIEWER", description="Assigned user role e.g. ESG_MANAGER, ADMIN")
    permissions: List[str] = Field(default_factory=list, description="Explicit permissions list")


class AgentRunRequest(BaseModel):
    goal: str = Field(..., min_length=1, description="Natural language goal/task for the agent")
    user_context: UserContext = Field(..., description="Authorized user and tenant scope")
    agent_run_id: Optional[str] = Field(None, description="Optional existing run ID to correlate or resume")
    resume_approval_id: Optional[str] = Field(None, description="Approval ID when resuming a paused execution")
    resume_decision: Optional[str] = Field(None, description="'APPROVE' or 'REJECT' when resuming")


class AgentStepResponse(BaseModel):
    step_id: str
    agent_run_id: str
    step_number: int
    step_type: AgentStepType
    tool_name: Optional[str] = None
    input_summary: str = ""
    output_summary: str = ""
    status: str = "COMPLETED"
    created_at: str


class AgentToolCallResponse(BaseModel):
    tool_call_id: str
    agent_run_id: str
    step_id: str
    tool_name: str
    validated_input: Dict[str, Any] = Field(default_factory=dict)
    result_summary: str = ""
    status: str = "SUCCESS"
    execution_time: float = 0.0
    created_at: str


class AgentRunResponse(BaseModel):
    agent_run_id: str
    goal: str
    status: AgentStateEnum
    step_count: int = 0
    steps: List[AgentStepResponse] = Field(default_factory=list)
    tool_calls: List[AgentToolCallResponse] = Field(default_factory=list)
    approvals: List[ApprovalRequest] = Field(default_factory=list)
    result_summary: str = ""
    final_response: Optional[str] = None
    error_category: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
