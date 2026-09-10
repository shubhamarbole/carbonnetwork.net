"""
Pydantic Schemas for Workflows
Phase 7: Alerts + Workflow Automation
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorkflowTriggerType(str, Enum):
    RISK_ESCALATED = "RISK_ESCALATED"
    CRITICAL_RISK_DETECTED = "CRITICAL_RISK_DETECTED"
    COMPLIANCE_DEADLINE_MISSED = "COMPLIANCE_DEADLINE_MISSED"
    ESG_THRESHOLD_EXCEEDED = "ESG_THRESHOLD_EXCEEDED"
    CARBON_THRESHOLD_EXCEEDED = "CARBON_THRESHOLD_EXCEEDED"
    MITIGATION_OVERDUE = "MITIGATION_OVERDUE"
    SUPPLIER_RISK_INCREASED = "SUPPLIER_RISK_INCREASED"
    MANUAL = "MANUAL"


class WorkflowActionType(str, Enum):
    # Safe Actions
    CREATE_ALERT = "CREATE_ALERT"
    CREATE_MITIGATION = "CREATE_MITIGATION"
    CREATE_TASK = "CREATE_TASK"
    ASSIGN_OWNER = "ASSIGN_OWNER"
    SET_DEADLINE = "SET_DEADLINE"
    CREATE_NOTIFICATION = "CREATE_NOTIFICATION"
    CREATE_FOLLOW_UP = "CREATE_FOLLOW_UP"
    ESCALATE = "ESCALATE"
    GENERATE_REPORT = "GENERATE_REPORT"
    TRIGGER_AI_AGENT = "TRIGGER_AI_AGENT"
    TRIGGER_AI_ANALYSIS = "TRIGGER_AI_ANALYSIS"

    # Sensitive Actions (HITL Approval Required by default)
    CHANGE_RISK_OWNER = "CHANGE_RISK_OWNER"
    CHANGE_COMPLIANCE_STATUS = "CHANGE_COMPLIANCE_STATUS"
    EXTERNAL_NOTIFICATION = "EXTERNAL_NOTIFICATION"
    SUPPLIER_ACTION = "SUPPLIER_ACTION"
    FINANCIAL_ACTION = "FINANCIAL_ACTION"
    DESTRUCTIVE_ACTION = "DESTRUCTIVE_ACTION"


SENSITIVE_ACTIONS = {
    WorkflowActionType.CHANGE_RISK_OWNER,
    WorkflowActionType.CHANGE_COMPLIANCE_STATUS,
    WorkflowActionType.EXTERNAL_NOTIFICATION,
    WorkflowActionType.SUPPLIER_ACTION,
    WorkflowActionType.FINANCIAL_ACTION,
    WorkflowActionType.DESTRUCTIVE_ACTION,
}


class WorkflowInstanceStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    ESCALATED = "ESCALATED"


class WorkflowStepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class WorkflowCondition(BaseModel):
    field: str
    operator: str = "equals"  # equals, not_equals, greater_than, greater_than_or_equal, less_than, less_than_or_equal, increase_percentage, decrease_percentage, crosses_threshold, missing, overdue
    value: Optional[Any] = None
    threshold: Optional[float] = None


class RetryPolicy(BaseModel):
    max_retries: int = 2
    retry_interval_seconds: int = 5


class WorkflowActionStep(BaseModel):
    step_number: int
    action_type: WorkflowActionType
    parameters: Dict[str, Any] = Field(default_factory=dict)
    requires_approval: bool = False
    retry_policy: Optional[RetryPolicy] = None


class DeadlineConfig(BaseModel):
    duration_hours: Optional[float] = 24.0
    due_at: Optional[str] = None
    warning_at: Optional[str] = None
    overdue_at: Optional[str] = None
    warning_threshold_pct: float = 75.0


class WorkflowDefinitionCreate(BaseModel):
    workflow_id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    trigger: WorkflowTriggerType
    conditions: List[WorkflowCondition] = Field(default_factory=list)
    actions: List[WorkflowActionStep] = Field(default_factory=list)
    enabled: bool = True
    organization_id: str
    project_id: Optional[str] = None
    deadline_config: Optional[DeadlineConfig] = None


class WorkflowDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[WorkflowTriggerType] = None
    conditions: Optional[List[WorkflowCondition]] = None
    actions: Optional[List[WorkflowActionStep]] = None
    enabled: Optional[bool] = None
    project_id: Optional[str] = None
    deadline_config: Optional[DeadlineConfig] = None


class WorkflowDefinitionResponse(BaseModel):
    workflow_id: str
    name: str
    description: str = ""
    trigger: WorkflowTriggerType
    conditions: List[WorkflowCondition] = []
    actions: List[WorkflowActionStep] = []
    enabled: bool
    organization_id: str
    project_id: Optional[str] = None
    deadline_config: Optional[DeadlineConfig] = None
    created_by: str
    created_at: str
    updated_at: str


class WorkflowStepResponse(BaseModel):
    step_id: str
    instance_id: str
    step_number: int
    action_type: WorkflowActionType
    status: WorkflowStepStatus
    input_summary: str = ""
    result_summary: str = ""
    assigned_to: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None


class WorkflowInstanceResponse(BaseModel):
    instance_id: str
    workflow_id: str
    event_id: Optional[str] = None
    risk_id: Optional[str] = None
    organization_id: str
    project_id: Optional[str] = None
    status: WorkflowInstanceStatus
    current_step: int = 0
    started_at: str
    completed_at: Optional[str] = None
    created_by: str = "System"
    error: Optional[str] = None
    deadline: Optional[Dict[str, Any]] = None
    steps: List[WorkflowStepResponse] = []
    updated_at: str


class WorkflowExecuteRequest(BaseModel):
    workflow_id: Optional[str] = None
    event_id: Optional[str] = None
    risk_id: Optional[str] = None
    organization_id: str
    project_id: Optional[str] = None
    trigger_type: Optional[WorkflowTriggerType] = WorkflowTriggerType.MANUAL
    context_data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowApprovalRequest(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    comment: Optional[str] = None
