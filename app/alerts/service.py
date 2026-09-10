"""
Alerts Microservice Layer
Phase 7: Alerts + Workflow Automation

Handles alert CRUD, deduplication, assignment, and status lifecycle:
NEW -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED / DISMISSED
"""

from datetime import datetime
import hashlib
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.schemas.alert import (
    AlertCreate,
    AlertResponse,
    AlertSeverity,
    AlertStatus,
    AlertType,
)

logger = logging.getLogger("alerts.service")


class AlertService:
    """Manages alert entities, status transitions, and duplicate prevention."""

    def __init__(self):
        self.alerts: Dict[str, AlertResponse] = {}
        self.fingerprints: Dict[str, str] = {}  # sha256_fp -> alert_id

    def _compute_alert_fp(self, org_id: str, title: str, alert_type: str, event_id: Optional[str] = None) -> str:
        raw = f"{org_id}::{title}::{alert_type}::{event_id or ''}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def create_alert(self, create_data: AlertCreate) -> AlertResponse:
        """Creates an alert with duplicate prevention."""
        fp = self._compute_alert_fp(
            create_data.organization_id,
            create_data.title,
            create_data.type.value if hasattr(create_data.type, "value") else str(create_data.type),
            create_data.event_id
        )

        if fp in self.fingerprints:
            existing_id = self.fingerprints[fp]
            if existing_id in self.alerts:
                logger.info(f"Duplicate alert suppressed for FP: {fp[:10]}. Returning existing alert {existing_id}.")
                return self.alerts[existing_id]

        alert_id = create_data.alert_id or f"alt_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        alert = AlertResponse(
            alert_id=alert_id,
            event_id=create_data.event_id,
            risk_id=create_data.risk_id,
            organization_id=create_data.organization_id,
            project_id=create_data.project_id,
            type=create_data.type,
            severity=create_data.severity,
            title=create_data.title,
            description=create_data.description or "",
            status=create_data.status,
            assigned_to=create_data.assigned_to,
            created_at=now_iso,
            acknowledged_at=None,
            resolved_at=None,
            updated_at=now_iso,
            metadata=create_data.metadata
        )

        self.alerts[alert_id] = alert
        self.fingerprints[fp] = alert_id
        logger.info(f"Created alert {alert_id}: '{alert.title}' ({alert.severity})")
        return alert

    def get_alert(self, alert_id: str) -> Optional[AlertResponse]:
        return self.alerts.get(alert_id)

    def list_alerts(
        self,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None,
        alert_type: Optional[AlertType] = None,
        severity: Optional[AlertSeverity] = None,
        status: Optional[AlertStatus] = None,
        assigned_to: Optional[str] = None
    ) -> List[AlertResponse]:
        res = list(self.alerts.values())
        if organization_id:
            res = [a for a in res if a.organization_id == organization_id]
        if project_id:
            res = [a for a in res if a.project_id == project_id]
        if alert_type:
            res = [a for a in res if a.type == alert_type]
        if severity:
            res = [a for a in res if a.severity == severity]
        if status:
            res = [a for a in res if a.status == status]
        if assigned_to:
            res = [a for a in res if a.assigned_to == assigned_to]

        res.sort(key=lambda a: a.created_at, reverse=True)
        return res

    def acknowledge_alert(self, alert_id: str, user_id: Optional[str] = None) -> AlertResponse:
        alert = self.alerts.get(alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        now_iso = datetime.utcnow().isoformat()
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = now_iso
        alert.updated_at = now_iso
        self.alerts[alert_id] = alert
        return alert

    def resolve_alert(self, alert_id: str, user_id: Optional[str] = None) -> AlertResponse:
        alert = self.alerts.get(alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        now_iso = datetime.utcnow().isoformat()
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = now_iso
        alert.updated_at = now_iso
        self.alerts[alert_id] = alert
        return alert

    def dismiss_alert(self, alert_id: str, user_id: Optional[str] = None) -> AlertResponse:
        alert = self.alerts.get(alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        now_iso = datetime.utcnow().isoformat()
        alert.status = AlertStatus.DISMISSED
        alert.updated_at = now_iso
        self.alerts[alert_id] = alert
        return alert

    def assign_alert(self, alert_id: str, assigned_to: str) -> AlertResponse:
        alert = self.alerts.get(alert_id)
        if not alert:
            raise ValueError(f"Alert {alert_id} not found")

        now_iso = datetime.utcnow().isoformat()
        alert.assigned_to = assigned_to
        if alert.status == AlertStatus.NEW:
            alert.status = AlertStatus.IN_PROGRESS
        alert.updated_at = now_iso
        self.alerts[alert_id] = alert
        return alert


default_alert_service = AlertService()
