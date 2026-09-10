"""
Workflow Action Step Executor
Phase 7: Alerts + Workflow Automation

Executes safe actions deterministically.
Pauses sensitive actions for Human-in-the-Loop (HITL) approval.
Integrates with IdempotencyManager to prevent duplicate actions.
"""

from datetime import datetime
import logging
import uuid
from typing import Any, Dict, Optional, Tuple

from app.schemas.workflow import (
    WorkflowActionStep,
    WorkflowActionType,
    WorkflowStepStatus,
    SENSITIVE_ACTIONS,
)
from app.workflows.idempotency import IdempotencyManager, default_idempotency_manager

logger = logging.getLogger("workflow.executor")


class StepExecutor:
    """Executes single workflow steps with idempotency and approval governance."""

    def __init__(self, idempotency_mgr: Optional[IdempotencyManager] = None):
        self.idempotency_mgr = idempotency_mgr or default_idempotency_manager

    def execute_step(
        self,
        instance_id: str,
        step: WorkflowActionStep,
        context: Dict[str, Any],
        is_approved: bool = False
    ) -> Dict[str, Any]:
        """
        Executes a workflow action step.
        Returns result dict:
        {
            "status": WorkflowStepStatus,
            "input_summary": str,
            "result_summary": str,
            "output_data": Dict,
            "requires_approval": bool,
            "error": Optional[str]
        }
        """
        action_type = step.action_type
        params = step.parameters or {}
        resource_id = context.get("risk_id") or context.get("event_id") or context.get("resource_id", "")

        # 1. Idempotency check
        fp = self.idempotency_mgr.generate_fingerprint(
            instance_id=instance_id,
            step_number=step.step_number,
            action_type=str(action_type),
            resource_id=resource_id,
            params=params
        )

        if self.idempotency_mgr.has_executed(fp):
            cached = self.idempotency_mgr.get_execution_result(fp) or {}
            logger.info(f"Step {step.step_number} ({action_type}) already executed (FP: {fp[:10]}). Returning cached result.")
            return {
                "status": WorkflowStepStatus.COMPLETED,
                "input_summary": cached.get("input_summary", f"Action {action_type}"),
                "result_summary": cached.get("result_summary", "Idempotent cached completion"),
                "output_data": cached.get("output_data", {}),
                "requires_approval": False,
                "error": None,
                "idempotent_cached": True
            }

        # 2. Check if action requires approval
        requires_approval = step.requires_approval or (action_type in SENSITIVE_ACTIONS)
        if requires_approval and not is_approved:
            logger.info(f"Step {step.step_number} ({action_type}) requires approval. Pausing execution.")
            return {
                "status": WorkflowStepStatus.WAITING,
                "input_summary": f"Sensitive Action: {action_type}",
                "result_summary": f"Action paused awaiting approval for {action_type}",
                "output_data": {"approval_required": True, "action_type": str(action_type)},
                "requires_approval": True,
                "error": None
            }

        # 3. Execute the action
        now_iso = datetime.utcnow().isoformat()
        try:
            output_data: Dict[str, Any] = {}
            result_summary = ""

            # --- CREATE_ALERT ---
            if action_type == WorkflowActionType.CREATE_ALERT:
                alert_id = f"alt_{uuid.uuid4().hex[:10]}"
                severity = params.get("severity", context.get("severity", "HIGH"))
                title = params.get("title", f"Workflow Alert: {context.get('event_type', 'Operational Event')}")
                output_data = {
                    "alert_id": alert_id,
                    "organization_id": context.get("organization_id"),
                    "project_id": context.get("project_id"),
                    "risk_id": context.get("risk_id"),
                    "event_id": context.get("event_id"),
                    "title": title,
                    "severity": severity,
                    "status": "NEW",
                    "created_at": now_iso
                }
                result_summary = f"Created alert {alert_id} (Severity: {severity})"

            # --- CREATE_MITIGATION ---
            elif action_type == WorkflowActionType.CREATE_MITIGATION:
                plan_id = f"mit_{uuid.uuid4().hex[:10]}"
                owner = params.get("owner", context.get("assigned_to", "Unassigned"))
                output_data = {
                    "plan_id": plan_id,
                    "risk_id": context.get("risk_id"),
                    "title": params.get("title", f"Mitigation for {context.get('risk_id')}"),
                    "owner": owner,
                    "status": "PLANNED",
                    "target_date": params.get("target_date", ""),
                    "created_at": now_iso
                }
                result_summary = f"Created mitigation plan {plan_id} (Owner: {owner})"

            # --- CREATE_TASK ---
            elif action_type == WorkflowActionType.CREATE_TASK:
                task_id = f"task_{uuid.uuid4().hex[:10]}"
                assignee = params.get("assigned_to", context.get("assigned_to", "ESG Lead"))
                output_data = {
                    "task_id": task_id,
                    "title": params.get("title", "Operational Task"),
                    "assigned_to": assignee,
                    "status": "OPEN",
                    "created_at": now_iso
                }
                result_summary = f"Created task {task_id} assigned to {assignee}"

            # --- ASSIGN_OWNER ---
            elif action_type == WorkflowActionType.ASSIGN_OWNER:
                new_owner = params.get("assigned_to", "ESG Lead")
                output_data = {"assigned_to": new_owner, "assigned_at": now_iso}
                result_summary = f"Assigned workflow owner to {new_owner}"

            # --- SET_DEADLINE ---
            elif action_type == WorkflowActionType.SET_DEADLINE:
                hours = float(params.get("duration_hours", 24.0))
                from app.workflows.escalation import EscalationEngine
                deadline_dict = EscalationEngine.calculate_deadline(
                    started_at=datetime.utcnow(),
                    duration_hours=hours,
                    warning_pct=float(params.get("warning_pct", 75.0))
                )
                output_data = {"deadline": deadline_dict}
                result_summary = f"Configured {hours}h deadline (Due: {deadline_dict['due_at']})"

            # --- CREATE_NOTIFICATION ---
            elif action_type == WorkflowActionType.CREATE_NOTIFICATION:
                notif_id = f"notif_{uuid.uuid4().hex[:10]}"
                user_id = params.get("user_id", context.get("user_id"))
                output_data = {
                    "notification_id": notif_id,
                    "user_id": user_id,
                    "title": params.get("title", "Workflow Notification"),
                    "type": params.get("type", "WORKFLOW_ASSIGNED"),
                    "created_at": now_iso
                }
                result_summary = f"Created notification {notif_id} for user {user_id}"

            # --- CREATE_FOLLOW_UP ---
            elif action_type == WorkflowActionType.CREATE_FOLLOW_UP:
                followup_id = f"fol_{uuid.uuid4().hex[:10]}"
                output_data = {
                    "followup_id": followup_id,
                    "due_date": params.get("due_date", now_iso),
                    "note": params.get("note", "Automated follow-up")
                }
                result_summary = f"Created follow-up {followup_id}"

            # --- ESCALATE ---
            elif action_type == WorkflowActionType.ESCALATE:
                output_data = {
                    "escalated": True,
                    "escalation_level": params.get("level", "MANAGER"),
                    "escalated_at": now_iso
                }
                result_summary = f"Escalated workflow to {params.get('level', 'MANAGER')}"

            # --- GENERATE_REPORT ---
            elif action_type == WorkflowActionType.GENERATE_REPORT:
                report_id = f"rep_{uuid.uuid4().hex[:10]}"
                output_data = {
                    "report_id": report_id,
                    "report_type": params.get("report_type", "INCIDENT_SUMMARY"),
                    "generated_at": now_iso
                }
                result_summary = f"Generated report {report_id}"

            # --- TRIGGER_AI_AGENT ---
            elif action_type in [WorkflowActionType.TRIGGER_AI_AGENT, WorkflowActionType.TRIGGER_AI_ANALYSIS]:
                run_id = f"agent_run_{uuid.uuid4().hex[:10]}"
                # Lightweight call representation (or integration with Phase 5 agent orchestrator)
                output_data = {
                    "agent_run_id": run_id,
                    "goal": params.get("goal", f"Investigate risk {context.get('risk_id')}"),
                    "triggered_at": now_iso
                }
                result_summary = f"Triggered Phase 5 AI Agent (Run ID: {run_id})"

            # --- SENSITIVE ACTIONS (POST-APPROVAL) ---
            elif action_type in SENSITIVE_ACTIONS:
                output_data = {
                    "sensitive_action": str(action_type),
                    "approved": True,
                    "executed_at": now_iso,
                    "params": params
                }
                result_summary = f"Executed approved sensitive action {action_type}"

            else:
                output_data = {"executed_at": now_iso}
                result_summary = f"Executed action {action_type}"

            # 4. Record execution in idempotency manager
            step_result = {
                "status": WorkflowStepStatus.COMPLETED,
                "input_summary": f"{action_type} with params: {params}",
                "result_summary": result_summary,
                "output_data": output_data,
                "requires_approval": False,
                "error": None
            }
            self.idempotency_mgr.record_execution(fp, step_result)
            return step_result

        except Exception as exc:
            logger.error(f"Step {step.step_number} ({action_type}) failed: {exc}")
            return {
                "status": WorkflowStepStatus.FAILED,
                "input_summary": f"{action_type} with params: {params}",
                "result_summary": f"Failed: {str(exc)}",
                "output_data": {},
                "requires_approval": False,
                "error": str(exc)
            }


default_step_executor = StepExecutor()
