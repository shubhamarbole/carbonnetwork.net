"""
Internal Workflows API Router
Phase 7: Alerts + Workflow Automation
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.core.config import settings
from app.schemas.workflow import (
    WorkflowApprovalRequest,
    WorkflowDefinitionCreate,
    WorkflowDefinitionResponse,
    WorkflowDefinitionUpdate,
    WorkflowExecuteRequest,
    WorkflowInstanceResponse,
    WorkflowInstanceStatus,
)
from app.workflows.engine import default_workflow_engine
from app.workflows.scheduler import default_workflow_scheduler

logger = logging.getLogger("api_workflows")

router = APIRouter()


def _verify_internal_auth(key: Optional[str]) -> None:
    if not key or key != settings.INTERNAL_SERVICE_KEY:
        logger.warning("Unauthorized internal workflow access attempt.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Service-Key"
        )


@router.get("/health")
def get_workflow_health(
    x_internal_service_key: Optional[str] = Header(None, description="Internal shared key")
):
    _verify_internal_auth(x_internal_service_key)
    metrics = default_workflow_engine.get_metrics()
    return {
        "status": "healthy",
        "service": "workflow-engine",
        "active_definitions": len(default_workflow_engine.definitions),
        "total_instances": len(default_workflow_engine.instances),
        "metrics": metrics
    }


@router.get("/overview")
def get_workflow_overview(
    organization_id: Optional[str] = Query(None),
    x_internal_service_key: str = Header(..., description="Internal shared key")
):
    _verify_internal_auth(x_internal_service_key)
    return default_workflow_engine.get_metrics(org_id=organization_id)


@router.post("/definitions", response_model=WorkflowDefinitionResponse)
def create_definition(
    def_data: WorkflowDefinitionCreate,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    return default_workflow_engine.register_definition(def_data)


@router.get("/definitions", response_model=List[WorkflowDefinitionResponse])
def list_definitions(
    organization_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    return default_workflow_engine.list_definitions(org_id=organization_id, project_id=project_id)


@router.get("/definitions/{workflow_id}", response_model=WorkflowDefinitionResponse)
def get_definition(
    workflow_id: str,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    definition = default_workflow_engine.get_definition(workflow_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Workflow definition not found")
    return definition


@router.patch("/definitions/{workflow_id}", response_model=WorkflowDefinitionResponse)
def update_definition(
    workflow_id: str,
    update_data: WorkflowDefinitionUpdate,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    updated = default_workflow_engine.update_definition(workflow_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Workflow definition not found")
    return updated


@router.delete("/definitions/{workflow_id}")
def delete_definition(
    workflow_id: str,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    deleted = default_workflow_engine.delete_definition(workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow definition not found")
    return {"success": True, "message": f"Deleted workflow definition {workflow_id}"}


@router.post("/execute", response_model=WorkflowInstanceResponse)
def execute_workflow(
    request: WorkflowExecuteRequest,
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    wf_id = request.workflow_id
    if not wf_id:
        # Find matching definitions
        matched = default_workflow_engine.find_matching_definitions(
            trigger_type=request.trigger_type,
            org_id=request.organization_id,
            context_data=request.context_data
        )
        if not matched:
            raise HTTPException(status_code=404, detail="No matching workflow definition found")
        wf_id = matched[0].workflow_id

    ctx = request.context_data.copy()
    if request.event_id:
        ctx["event_id"] = request.event_id
    if request.risk_id:
        ctx["risk_id"] = request.risk_id
    if request.project_id:
        ctx["project_id"] = request.project_id
    ctx["organization_id"] = request.organization_id

    try:
        return default_workflow_engine.create_and_execute_workflow(
            workflow_id=wf_id,
            org_id=request.organization_id,
            context_data=ctx
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/instances", response_model=List[WorkflowInstanceResponse])
def list_instances(
    organization_id: Optional[str] = Query(None),
    status: Optional[WorkflowInstanceStatus] = Query(None),
    workflow_id: Optional[str] = Query(None),
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    return default_workflow_engine.list_instances(org_id=organization_id, status=status, workflow_id=workflow_id)


@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
def get_instance(
    instance_id: str,
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    inst = default_workflow_engine.get_instance(instance_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    return inst


@router.post("/instances/{instance_id}/approve", response_model=WorkflowInstanceResponse)
def approve_instance(
    instance_id: str,
    approval_data: WorkflowApprovalRequest,
    reviewer_id: str = Query("Admin"),
    x_internal_service_key: Optional[str] = Header(None)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_workflow_engine.approve_step(
            instance_id=instance_id,
            reviewer_id=reviewer_id,
            comment=approval_data.comment
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/instances/{instance_id}/reject", response_model=WorkflowInstanceResponse)
def reject_instance(
    instance_id: str,
    approval_data: WorkflowApprovalRequest,
    reviewer_id: str = Query("Admin"),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_workflow_engine.reject_step(
            instance_id=instance_id,
            reviewer_id=reviewer_id,
            comment=approval_data.comment
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/instances/{instance_id}/cancel", response_model=WorkflowInstanceResponse)
def cancel_instance(
    instance_id: str,
    reason: str = Query("Cancelled by user"),
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_workflow_engine.cancel_instance(instance_id=instance_id, reason=reason)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/instances/{instance_id}/retry", response_model=WorkflowInstanceResponse)
def retry_instance(
    instance_id: str,
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    try:
        return default_workflow_engine.retry_instance(instance_id=instance_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/sweep-deadlines")
def sweep_deadlines(
    x_internal_service_key: str = Header(...)
):
    _verify_internal_auth(x_internal_service_key)
    return default_workflow_scheduler.run_deadline_sweep()
