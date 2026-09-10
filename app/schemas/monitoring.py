"""
Pydantic Schemas for Proactive Monitoring & Event Detection
Phase 6: Proactive Monitoring & Event Detection
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MonitoredEventType(str, Enum):
    # Risk Events
    RISK_SCORE_CHANGED = "RISK_SCORE_CHANGED"
    RISK_ESCALATED = "RISK_ESCALATED"
    RISK_DE_ESCALATED = "RISK_DE_ESCALATED"

    # ESG Events
    ESG_THRESHOLD_EXCEEDED = "ESG_THRESHOLD_EXCEEDED"
    ESG_DATA_MISSING = "ESG_DATA_MISSING"
    ESG_DATA_OVERDUE = "ESG_DATA_OVERDUE"

    # Carbon Events
    CARBON_THRESHOLD_EXCEEDED = "CARBON_THRESHOLD_EXCEEDED"
    CARBON_DATA_MISSING = "CARBON_DATA_MISSING"
    CARBON_TARGET_DEVIATION = "CARBON_TARGET_DEVIATION"

    # Compliance Events
    COMPLIANCE_DEADLINE_APPROACHING = "COMPLIANCE_DEADLINE_APPROACHING"
    COMPLIANCE_DEADLINE_MISSED = "COMPLIANCE_DEADLINE_MISSED"
    COMPLIANCE_DOCUMENT_MISSING = "COMPLIANCE_DOCUMENT_MISSING"
    COMPLIANCE_STATUS_CHANGED = "COMPLIANCE_STATUS_CHANGED"

    # Supplier Events
    SUPPLIER_RISK_INCREASED = "SUPPLIER_RISK_INCREASED"
    SUPPLIER_DOCUMENT_EXPIRING = "SUPPLIER_DOCUMENT_EXPIRING"
    SUPPLIER_PERFORMANCE_DETERIORATED = "SUPPLIER_PERFORMANCE_DETERIORATED"

    # Project Events
    PROJECT_DELAYED = "PROJECT_DELAYED"
    PROJECT_MILESTONE_MISSED = "PROJECT_MILESTONE_MISSED"
    PROJECT_DATA_MISSING = "PROJECT_DATA_MISSING"

    # Predictive Risk Events (Phase 9)
    PREDICTIVE_RISK_DETECTED = "PREDICTIVE_RISK_DETECTED"
    PREDICTIVE_RISK_ESCALATION = "PREDICTIVE_RISK_ESCALATION"

    # Integration & Scenario Events (Phase 10)
    CARBON_DATA_UPDATED = "CARBON_DATA_UPDATED"
    ESG_DATA_UPDATED = "ESG_DATA_UPDATED"
    SUPPLIER_DATA_UPDATED = "SUPPLIER_DATA_UPDATED"
    COMPLIANCE_DATA_UPDATED = "COMPLIANCE_DATA_UPDATED"
    PROJECT_DATA_UPDATED = "PROJECT_DATA_UPDATED"
    SCENARIO_SIMULATION_EXECUTED = "SCENARIO_SIMULATION_EXECUTED"


class EventStatus(str, Enum):
    DETECTED = "DETECTED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"


class RuleAction(str, Enum):
    CREATE_ALERT = "CREATE_ALERT"
    TRIGGER_AI_ANALYSIS = "TRIGGER_AI_ANALYSIS"
    TRIGGER_AI_AGENT = "TRIGGER_AI_AGENT"
    LOG_ONLY = "LOG_ONLY"


class RuleOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN = "less_than"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    INCREASE_PERCENTAGE = "increase_percentage"
    DECREASE_PERCENTAGE = "decrease_percentage"
    CROSSES_THRESHOLD = "crosses_threshold"
    MISSING = "missing"
    OVERDUE = "overdue"


class MonitoringRunStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PARTIAL_FAILURE = "PARTIAL_FAILURE"
    FAILED = "FAILED"


class MonitoringHealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"


# ==========================================
# Rule Condition Schema
# ==========================================

class RuleCondition(BaseModel):
    field: str = Field(..., description="Field to evaluate e.g. current_value, risk_score, severity, days_left")
    operator: RuleOperator = Field(..., description="Comparison operator")
    value: Optional[Any] = Field(None, description="Target value for comparison")
    threshold: Optional[float] = Field(None, description="Threshold for crossing/percentage checks")


# ==========================================
# Monitoring Rule Schemas
# ==========================================

class MonitoringRuleCreate(BaseModel):
    rule_id: Optional[str] = Field(None, description="Optional custom rule identifier")
    name: str = Field(..., min_length=3, description="Rule name")
    description: str = Field("", description="Rule purpose and justification")
    event_type: MonitoredEventType = Field(..., description="Target event type to monitor")
    conditions: List[RuleCondition] = Field(..., min_length=1, description="List of condition criteria (AND logic)")
    action: RuleAction = Field(RuleAction.CREATE_ALERT, description="Action to execute upon match")
    enabled: bool = Field(True, description="Whether rule is actively evaluated")
    organization_id: str = Field(..., description="Tenant organization scope")
    project_id: Optional[str] = Field(None, description="Optional project scope filter")


class MonitoringRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[List[RuleCondition]] = None
    action: Optional[RuleAction] = None
    enabled: Optional[bool] = None
    project_id: Optional[str] = None


class MonitoringRuleResponse(BaseModel):
    rule_id: str
    name: str
    description: str
    event_type: MonitoredEventType
    conditions: List[RuleCondition]
    action: RuleAction
    enabled: bool
    organization_id: str
    project_id: Optional[str] = None
    created_by: str = "System"
    created_at: str
    updated_at: str


# ==========================================
# Event Schemas
# ==========================================

class MonitoringEventCreate(BaseModel):
    event_id: Optional[str] = None
    event_type: MonitoredEventType
    organization_id: str
    project_id: Optional[str] = None
    resource_type: str = Field(..., description="Entity type: Risk, ComplianceRecord, Project, etc.")
    resource_id: str = Field(..., description="Entity ID")
    previous_value: Optional[Any] = None
    current_value: Optional[Any] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    source: str = "SystemEngine"
    fingerprint: Optional[str] = None


class MonitoringEventResponse(BaseModel):
    event_id: str
    event_type: MonitoredEventType
    organization_id: str
    project_id: Optional[str] = None
    resource_type: str
    resource_id: str
    previous_value: Optional[Any] = None
    current_value: Optional[Any] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    source: str
    fingerprint: str
    status: EventStatus
    detected_at: str
    processed_at: Optional[str] = None
    ai_agent_run_id: Optional[str] = None
    rule_id: Optional[str] = None


class MonitoringAlertResponse(BaseModel):
    alert_id: str
    organization_id: str
    project_id: Optional[str] = None
    event_id: str
    rule_id: Optional[str] = None
    title: str
    severity: str
    message: str
    ai_agent_run_id: Optional[str] = None
    created_at: str


# ==========================================
# Run & Health Schemas
# ==========================================

class MonitoringRunResponse(BaseModel):
    run_id: str
    started_at: str
    completed_at: Optional[str] = None
    events_processed: int = 0
    events_failed: int = 0
    ai_triggers: int = 0
    status: MonitoringRunStatus
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MonitoringHealthResponse(BaseModel):
    status: MonitoringHealthStatus
    last_successful_run: Optional[str] = None
    last_run_duration_ms: float = 0.0
    events_processed: int = 0
    events_failed: int = 0
    ai_triggers: int = 0
    active_rules: int = 0


class MonitoringOverviewResponse(BaseModel):
    events_today: int = 0
    active_rules: int = 0
    triggered_alerts: int = 0
    ai_investigations: int = 0
    critical_events: int = 0
    failed_events: int = 0
    last_run: Optional[str] = None
    monitoring_status: MonitoringHealthStatus = MonitoringHealthStatus.HEALTHY


class ManualInvestigationRequest(BaseModel):
    user_id: Optional[str] = None
    notes: Optional[str] = None
