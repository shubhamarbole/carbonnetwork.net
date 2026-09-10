"""
Internal Proactive Monitoring API Router
Exposes /internal/monitoring/* for authenticated invocations from Express gateway and tests.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.core.config import settings
from app.schemas.monitoring import (
    ManualInvestigationRequest,
    MonitoringEventCreate,
    MonitoringEventResponse,
    MonitoringHealthResponse,
    MonitoringOverviewResponse,
    MonitoringRuleCreate,
    MonitoringRuleResponse,
    MonitoringRuleUpdate,
    MonitoringRunResponse,
)
from app.services.monitoring_service import default_monitoring_service
from app.monitoring.evaluator import default_rule_evaluator

logger = logging.getLogger("api_monitoring")

router = APIRouter()


def _verify_internal_auth(key: str) -> None:
    if key != settings.INTERNAL_SERVICE_KEY:
        logger.warning("Unauthorized internal monitoring access attempt.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Service-Key"
        )


@router.get("/health", response_model=MonitoringHealthResponse)
def get_monitoring_health(
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Returns health status, active rules, processed/failed counts, and last sweep timestamp."""
    _verify_internal_auth(x_internal_service_key)
    return default_monitoring_service.get_health()


@router.get("/overview", response_model=MonitoringOverviewResponse)
def get_monitoring_overview(
    organization_id: Optional[str] = Query(None, description="Optional tenant organization scope"),
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Returns overview dashboard statistics."""
    _verify_internal_auth(x_internal_service_key)
    return default_monitoring_service.get_overview(organization_id=organization_id)


@router.post("/process", response_model=MonitoringEventResponse)
def process_event(
    event: MonitoringEventCreate,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Processes a detected event through deduplication, rule evaluation, and alert dispatching."""
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_monitoring_service.process_event(event)
    except Exception as e:
        logger.error(f"Error processing monitoring event: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process event: {str(e)}"
        )


@router.post("/batch", response_model=MonitoringRunResponse)
def process_batch(
    events: List[MonitoringEventCreate],
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Evaluates a batch of detected events."""
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_monitoring_service.process_batch(events)
    except Exception as e:
        logger.error(f"Error processing batch: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process batch: {str(e)}"
        )


@router.post("/evaluate")
def evaluate_condition(
    payload: Dict[str, Any],
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Direct deterministic evaluation endpoint for a rule and event payload."""
    _verify_internal_auth(x_internal_service_key)
    try:
        rule_data = payload.get("rule", {})
        event_data = payload.get("event", {})
        matched, reasons = default_rule_evaluator.evaluate_rule(rule_data, event_data)
        return {"matched": matched, "reasons": reasons}
    except Exception as e:
        logger.error(f"Error evaluating rule: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Evaluation failed: {str(e)}"
        )


@router.post("/sweep")
def trigger_sweep(
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Triggers an immediate on-demand monitoring sweep."""
    _verify_internal_auth(x_internal_service_key)
    res = default_monitoring_service.scheduler.trigger_on_demand()
    return res


# ==========================================
# Rules Management Endpoints
# ==========================================

@router.get("/rules", response_model=List[MonitoringRuleResponse])
def list_rules(
    organization_id: str = Query(..., description="Tenant organization scope"),
    project_id: Optional[str] = Query(None, description="Project scope filter"),
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Lists monitoring rules scoped to organization."""
    _verify_internal_auth(x_internal_service_key)
    return default_monitoring_service.get_rules(organization_id, project_id)


@router.post("/rules", response_model=MonitoringRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(
    rule_data: MonitoringRuleCreate,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Creates a new monitoring rule."""
    _verify_internal_auth(x_internal_service_key)
    return default_monitoring_service.create_rule(rule_data)


@router.get("/rules/{rule_id}", response_model=MonitoringRuleResponse)
def get_rule(
    rule_id: str,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Retrieves a single rule by ID."""
    _verify_internal_auth(x_internal_service_key)
    rule = default_monitoring_service.get_rule_by_id(rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return rule


@router.patch("/rules/{rule_id}", response_model=MonitoringRuleResponse)
def update_rule(
    rule_id: str,
    updates: MonitoringRuleUpdate,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Updates an existing monitoring rule."""
    _verify_internal_auth(x_internal_service_key)
    updated = default_monitoring_service.update_rule(rule_id, updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return updated


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Deletes a rule by ID."""
    _verify_internal_auth(x_internal_service_key)
    success = default_monitoring_service.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return {"message": "Rule deleted successfully", "rule_id": rule_id}


# ==========================================
# Events Endpoints
# ==========================================

@router.get("/events", response_model=List[MonitoringEventResponse])
def list_events(
    organization_id: str = Query(..., description="Tenant organization scope"),
    project_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Lists monitored events."""
    _verify_internal_auth(x_internal_service_key)
    return default_monitoring_service.get_events(organization_id, project_id, event_type, limit)


@router.get("/events/{event_id}", response_model=MonitoringEventResponse)
def get_event(
    event_id: str,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Retrieves an event by ID."""
    _verify_internal_auth(x_internal_service_key)
    evt = default_monitoring_service.get_event_by_id(event_id)
    if not evt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return evt


@router.post("/events/{event_id}/investigate")
def investigate_event(
    event_id: str,
    request_data: Optional[ManualInvestigationRequest] = None,
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    """Triggers on-demand AI investigation for an event."""
    _verify_internal_auth(x_internal_service_key)
    try:
        user_id = request_data.user_id if request_data and request_data.user_id else "operator"
        notes = request_data.notes if request_data else None
        agent_run_id = default_monitoring_service.trigger_investigation(event_id, user_id=user_id, notes=notes)
        return {
            "message": "AI Agent investigation triggered",
            "event_id": event_id,
            "agent_run_id": agent_run_id
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Investigation trigger failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation failed: {str(e)}"
        )
