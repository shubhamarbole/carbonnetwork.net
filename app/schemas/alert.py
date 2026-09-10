"""
Pydantic Schemas for Alerts
Phase 7: Alerts + Workflow Automation
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AlertType(str, Enum):
    CRITICAL_RISK = "CRITICAL_RISK"
    HIGH_RISK = "HIGH_RISK"
    RISK_ESCALATION = "RISK_ESCALATION"
    COMPLIANCE = "COMPLIANCE"
    ESG = "ESG"
    CARBON = "CARBON"
    SUPPLIER = "SUPPLIER"
    PROJECT = "PROJECT"
    MONITORING = "MONITORING"
    AI_AGENT = "AI_AGENT"
    MITIGATION_OVERDUE = "MITIGATION_OVERDUE"


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class AlertCreate(BaseModel):
    alert_id: Optional[str] = None
    event_id: Optional[str] = None
    risk_id: Optional[str] = None
    organization_id: str
    project_id: Optional[str] = None
    type: AlertType = AlertType.MONITORING
    severity: AlertSeverity = AlertSeverity.MEDIUM
    title: str
    description: Optional[str] = ""
    status: AlertStatus = AlertStatus.NEW
    assigned_to: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AlertAssignRequest(BaseModel):
    assigned_to: str


class AlertStatusUpdateRequest(BaseModel):
    status: AlertStatus
    comment: Optional[str] = None


class AlertResponse(BaseModel):
    alert_id: str
    event_id: Optional[str] = None
    risk_id: Optional[str] = None
    organization_id: str
    project_id: Optional[str] = None
    type: AlertType
    severity: AlertSeverity
    title: str
    description: str = ""
    status: AlertStatus
    assigned_to: Optional[str] = None
    created_at: str
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None
