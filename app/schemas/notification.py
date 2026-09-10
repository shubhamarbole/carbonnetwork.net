"""
Pydantic Schemas for Internal Notifications
Phase 7: Alerts + Workflow Automation
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    CRITICAL_RISK = "CRITICAL_RISK"
    HIGH_RISK = "HIGH_RISK"
    WORKFLOW_ASSIGNED = "WORKFLOW_ASSIGNED"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    MITIGATION_DUE = "MITIGATION_DUE"
    MITIGATION_OVERDUE = "MITIGATION_OVERDUE"
    ESCALATION = "ESCALATION"
    AI_ANALYSIS_COMPLETE = "AI_ANALYSIS_COMPLETE"
    INFO = "INFO"
    WARNING = "WARNING"
    ALERT = "ALERT"


class NotificationCreate(BaseModel):
    notification_id: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: str
    type: NotificationType = NotificationType.INFO
    title: str
    message: Optional[str] = ""
    resource_type: Optional[str] = ""
    resource_id: Optional[str] = ""
    read: bool = False


class NotificationResponse(BaseModel):
    notification_id: str
    user_id: Optional[str] = None
    organization_id: str
    type: NotificationType
    title: str
    message: str
    resource_type: str = ""
    resource_id: str = ""
    read: bool = False
    created_at: str
