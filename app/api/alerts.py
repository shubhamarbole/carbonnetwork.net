"""
Internal Alerts API Router
Phase 7: Alerts + Workflow Automation
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.core.config import settings
from app.schemas.alert import (
    AlertAssignRequest,
    AlertCreate,
    AlertResponse,
    AlertSeverity,
    AlertStatus,
    AlertType,
)
from app.alerts.service import default_alert_service

logger = logging.getLogger("api_alerts")

router = APIRouter()


def _verify_internal_auth(key: Optional[str]) -> None:
    if not key or key != settings.INTERNAL_SERVICE_KEY:
        logger.warning("Unauthorized internal alert access attempt.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Service-Key"
        )


@router.post("/", response_model=AlertResponse)
def create_alert(
    create_data: AlertCreate,
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    return default_alert_service.create_alert(create_data)


@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    organization_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    alert_type: Optional[AlertType] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    status: Optional[AlertStatus] = Query(None),
    assigned_to: Optional[str] = Query(None),
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    return default_alert_service.list_alerts(
        organization_id=organization_id,
        project_id=project_id,
        alert_type=alert_type,
        severity=severity,
        status=status,
        assigned_to=assigned_to
    )


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: str,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    alert = default_alert_service.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: str,
    user_id: Optional[str] = Query(None),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_alert_service.acknowledge_alert(alert_id, user_id=user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: str,
    user_id: Optional[str] = Query(None),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_alert_service.resolve_alert(alert_id, user_id=user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{alert_id}/dismiss", response_model=AlertResponse)
def dismiss_alert(
    alert_id: str,
    user_id: Optional[str] = Query(None),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_alert_service.dismiss_alert(alert_id, user_id=user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{alert_id}/assign", response_model=AlertResponse)
def assign_alert(
    alert_id: str,
    assign_data: AlertAssignRequest,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_alert_service.assign_alert(alert_id, assigned_to=assign_data.assigned_to)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
