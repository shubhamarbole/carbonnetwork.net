"""
Core Workflow Engine Coordinator
Phase 7: Alerts + Workflow Automation

Orchestrates:
Trigger -> Validate Definition -> Evaluate Conditions -> Create Instance
-> Execute Steps (with Idempotency) -> HITL Approval Pause/Resume -> Completion.
"""

from datetime import datetime
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.workflow import (
    WorkflowActionStep,
    WorkflowActionType,
    WorkflowCondition,
    WorkflowDefinitionCreate,
    WorkflowDefinitionResponse,
    WorkflowDefinitionUpdate,
    WorkflowInstanceResponse,
    WorkflowInstanceStatus,
    WorkflowStepResponse,
    WorkflowStepStatus,
    WorkflowTriggerType,
)
from app.workflows.evaluator import WorkflowEvaluator
from app.workflows.executor import StepExecutor, default_step_executor
from app.workflows.idempotency import IdempotencyManager, default_idempotency_manager
from app.workflows.escalation import EscalationEngine, EscalationTier, default_escalation_engine

logger = logging.getLogger("workflow.engine")


class WorkflowEngine:
    """Enterprise Workflow Automation Engine."""

    def __init__(
        self,
        executor: Optional[StepExecutor] = None,
        idempotency_mgr: Optional[IdempotencyManager] = None,
        escalation_engine: Optional[EscalationEngine] = None
    ):
        self.executor = executor or default_step_executor
        self.idempotency_mgr = idempotency_mgr or default_idempotency_manager
        self.escalation_engine = escalation_engine or default_escalation_engine

        # State stores
        self.definitions: Dict[str, WorkflowDefinitionResponse] = {}
        self.instances: Dict[str, WorkflowInstanceResponse] = {}
        self.steps: Dict[str, List[WorkflowStepResponse]] = {}  # instance_id -> list of steps

    # ----------------------------------------------------------------------
    # Workflow Definitions Management
    # ----------------------------------------------------------------------

    def register_definition(
        self,
        def_data: WorkflowDefinitionCreate,
        created_by: str = "System"
    ) -> WorkflowDefinitionResponse:
        """Registers a new workflow definition."""
        wf_id = def_data.workflow_id or f"wf_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        resp = WorkflowDefinitionResponse(
            workflow_id=wf_id,
            name=def_data.name,
            description=def_data.description or "",
            trigger=def_data.trigger,
            conditions=def_data.conditions or [],
            actions=def_data.actions or [],
            enabled=def_data.enabled,
            organization_id=def_data.organization_id,
            project_id=def_data.project_id,
            deadline_config=def_data.deadline_config,
            created_by=created_by,
            created_at=now_iso,
            updated_at=now_iso
        )
        self.definitions[wf_id] = resp
        logger.info(f"Registered workflow definition: {wf_id} ({def_data.name})")
        return resp

    def get_definition(self, workflow_id: str) -> Optional[WorkflowDefinitionResponse]:
        return self.definitions.get(workflow_id)

    def list_definitions(
        self,
        org_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> List[WorkflowDefinitionResponse]:
        res = list(self.definitions.values())
        if org_id:
            res = [w for w in res if w.organization_id == org_id]
        if project_id:
            res = [w for w in res if w.project_id == project_id]
        return res

    def update_definition(
        self,
        workflow_id: str,
        update_data: WorkflowDefinitionUpdate
    ) -> Optional[WorkflowDefinitionResponse]:
        existing = self.definitions.get(workflow_id)
        if not existing:
            return None

        now_iso = datetime.utcnow().isoformat()
        dumped = existing.dict()
        for k, v in update_data.dict(exclude_unset=True).items():
            if v is not None:
                dumped[k] = v
        dumped["updated_at"] = now_iso

        updated = WorkflowDefinitionResponse(**dumped)
        self.definitions[workflow_id] = updated
        return updated

    def delete_definition(self, workflow_id: str) -> bool:
        if workflow_id in self.definitions:
            del self.definitions[workflow_id]
            return True
        return False

    # ----------------------------------------------------------------------
    # Trigger Matching & Instance Creation
    # ----------------------------------------------------------------------

    def find_matching_definitions(
        self,
        trigger_type: WorkflowTriggerType,
        org_id: str,
        context_data: Dict[str, Any]
    ) -> List[WorkflowDefinitionResponse]:
        """Finds enabled workflow definitions matching the trigger and conditions."""
        candidates = [
            w for w in self.definitions.values()
            if w.enabled and w.organization_id == org_id and w.trigger == trigger_type
        ]
        matched = []
        for cand in candidates:
            conds_met, _ = WorkflowEvaluator.evaluate_conditions(cand.conditions, context_data)
            if conds_met:
                matched.append(cand)
        return matched

    def create_and_execute_workflow(
        self,
        workflow_id: str,
        org_id: str,
        context_data: Dict[str, Any],
        created_by: str = "System"
    ) -> WorkflowInstanceResponse:
        """Creates and executes a workflow instance."""
        definition = self.definitions.get(workflow_id)
        if not definition:
            raise ValueError(f"Workflow definition {workflow_id} not found")

        inst_id = f"inst_{uuid.uuid4().hex[:12]}"
        now_dt = datetime.utcnow()
        now_iso = now_dt.isoformat()

        # Compute deadline if configured
        deadline_dict = None
        if definition.deadline_config:
            hours = definition.deadline_config.duration_hours or 24.0
            warn_pct = definition.deadline_config.warning_threshold_pct or 75.0
            deadline_dict = self.escalation_engine.calculate_deadline(
                started_at=now_dt,
                duration_hours=hours,
                warning_pct=warn_pct
            )

        # Initialize instance
        instance = WorkflowInstanceResponse(
            instance_id=inst_id,
            workflow_id=workflow_id,
            event_id=context_data.get("event_id"),
            risk_id=context_data.get("risk_id"),
            organization_id=org_id,
            project_id=context_data.get("project_id"),
            status=WorkflowInstanceStatus.RUNNING,
            current_step=0,
            started_at=now_iso,
            completed_at=None,
            created_by=created_by,
            error=None,
            deadline=deadline_dict,
            steps=[],
            updated_at=now_iso
        )

        # Build initial step models
        initial_steps: List[WorkflowStepResponse] = []
        for act in definition.actions:
            step_id = f"step_{uuid.uuid4().hex[:10]}"
            step_resp = WorkflowStepResponse(
                step_id=step_id,
                instance_id=inst_id,
                step_number=act.step_number,
                action_type=act.action_type,
                status=WorkflowStepStatus.PENDING,
                input_summary="",
                result_summary="",
                assigned_to=act.parameters.get("assigned_to"),
                started_at=now_iso,
                completed_at=None,
                error=None
            )
            initial_steps.append(step_resp)

        self.instances[inst_id] = instance
        self.steps[inst_id] = initial_steps

        # Execute steps
        return self._run_steps(instance, definition.actions, context_data)

    def _run_steps(
        self,
        instance: WorkflowInstanceResponse,
        actions: List[WorkflowActionStep],
        context_data: Dict[str, Any]
    ) -> WorkflowInstanceResponse:
        """Runs steps sequentially until complete, waiting for approval, or failure."""
        inst_id = instance.instance_id
        step_models = self.steps.get(inst_id, [])

        now_iso = datetime.utcnow().isoformat()

        for act in actions:
            step_resp = next((s for s in step_models if s.step_number == act.step_number), None)
            if not step_resp:
                continue

            # Skip completed steps (for idempotency and resumed executions)
            if step_resp.status == WorkflowStepStatus.COMPLETED:
                continue

            step_resp.status = WorkflowStepStatus.RUNNING
            step_resp.started_at = datetime.utcnow().isoformat()
            instance.current_step = act.step_number
            instance.updated_at = datetime.utcnow().isoformat()

            # Execute with executor
            exec_res = self.executor.execute_step(
                instance_id=inst_id,
                step=act,
                context=context_data,
                is_approved=False
            )

            step_resp.input_summary = exec_res.get("input_summary", "")
            step_resp.result_summary = exec_res.get("result_summary", "")
            step_resp.error = exec_res.get("error")

            # Check if approval required
            if exec_res.get("requires_approval") or exec_res.get("status") == WorkflowStepStatus.WAITING:
                step_resp.status = WorkflowStepStatus.WAITING
                instance.status = WorkflowInstanceStatus.WAITING_FOR_APPROVAL
                instance.steps = step_models
                self.instances[inst_id] = instance
                logger.info(f"Instance {inst_id} paused at step {act.step_number} awaiting approval.")
                return instance

            # Check if step failed
            if exec_res.get("status") == WorkflowStepStatus.FAILED:
                # Check retry policy
                max_retries = act.retry_policy.max_retries if act.retry_policy else 0
                retries_done = 0
                failed = True
                while retries_done < max_retries:
                    retries_done += 1
                    logger.info(f"Retrying step {act.step_number} (Attempt {retries_done}/{max_retries})")
                    retry_res = self.executor.execute_step(
                        instance_id=inst_id,
                        step=act,
                        context=context_data
                    )
                    if retry_res.get("status") == WorkflowStepStatus.COMPLETED:
                        step_resp.status = WorkflowStepStatus.COMPLETED
                        step_resp.completed_at = datetime.utcnow().isoformat()
                        step_resp.result_summary = retry_res.get("result_summary", "")
                        step_resp.error = None
                        failed = False
                        break

                if failed:
                    step_resp.status = WorkflowStepStatus.FAILED
                    instance.status = WorkflowInstanceStatus.FAILED
                    instance.error = step_resp.error or "Step execution failed after retries"
                    instance.steps = step_models
                    self.instances[inst_id] = instance
                    return instance

            # Step completed successfully
            step_resp.status = WorkflowStepStatus.COMPLETED
            step_resp.completed_at = datetime.utcnow().isoformat()

        # All steps completed!
        instance.status = WorkflowInstanceStatus.COMPLETED
        instance.completed_at = datetime.utcnow().isoformat()
        instance.updated_at = datetime.utcnow().isoformat()
        instance.steps = step_models
        self.instances[inst_id] = instance
        logger.info(f"Instance {inst_id} completed successfully.")
        return instance

    # ----------------------------------------------------------------------
    # Approval Lifecycle (Resume / Reject)
    # ----------------------------------------------------------------------

    def approve_step(
        self,
        instance_id: str,
        reviewer_id: str = "Admin",
        comment: Optional[str] = None
    ) -> WorkflowInstanceResponse:
        """Approves a waiting step and resumes the workflow."""
        instance = self.instances.get(instance_id)
        if not instance:
            raise ValueError(f"Instance {instance_id} not found")

        if instance.status != WorkflowInstanceStatus.WAITING_FOR_APPROVAL:
            raise ValueError(f"Instance {instance_id} is not waiting for approval (Current status: {instance.status})")

        definition = self.definitions.get(instance.workflow_id)
        step_models = self.steps.get(instance_id, [])

        # Find the waiting step
        waiting_idx = -1
        for i, s in enumerate(step_models):
            if s.status == WorkflowStepStatus.WAITING:
                waiting_idx = i
                break

        if waiting_idx == -1:
            instance.status = WorkflowInstanceStatus.COMPLETED
            return instance

        # Mark step approved and execute the action with is_approved=True
        act = definition.actions[waiting_idx] if definition else None
        step_resp = step_models[waiting_idx]

        if act:
            exec_res = self.executor.execute_step(
                instance_id=instance_id,
                step=act,
                context={"organization_id": instance.organization_id, "risk_id": instance.risk_id, "event_id": instance.event_id},
                is_approved=True
            )
            step_resp.status = WorkflowStepStatus.COMPLETED
            step_resp.completed_at = datetime.utcnow().isoformat()
            step_resp.result_summary = f"Approved by {reviewer_id}: {exec_res.get('result_summary')}"
        else:
            step_resp.status = WorkflowStepStatus.COMPLETED
            step_resp.completed_at = datetime.utcnow().isoformat()
            step_resp.result_summary = f"Approved by {reviewer_id}."

        instance.status = WorkflowInstanceStatus.RUNNING
        instance.updated_at = datetime.utcnow().isoformat()

        # Resume remaining steps
        remaining_actions = definition.actions[waiting_idx + 1:] if definition else []
        return self._run_steps(
            instance,
            remaining_actions,
            {"organization_id": instance.organization_id, "risk_id": instance.risk_id, "event_id": instance.event_id}
        )

    def reject_step(
        self,
        instance_id: str,
        reviewer_id: str = "Admin",
        comment: Optional[str] = None
    ) -> WorkflowInstanceResponse:
        """Rejects a waiting step, cancelling the workflow instance."""
        instance = self.instances.get(instance_id)
        if not instance:
            raise ValueError(f"Instance {instance_id} not found")

        step_models = self.steps.get(instance_id, [])
        for s in step_models:
            if s.status == WorkflowStepStatus.WAITING:
                s.status = WorkflowStepStatus.SKIPPED
                s.error = f"Rejected by {reviewer_id}: {comment or 'No comment'}"

        instance.status = WorkflowInstanceStatus.CANCELLED
        instance.error = f"Workflow halted by reviewer rejection ({reviewer_id})"
        instance.updated_at = datetime.utcnow().isoformat()
        instance.steps = step_models
        self.instances[instance_id] = instance
        return instance

    def cancel_instance(self, instance_id: str, reason: str = "User cancelled") -> WorkflowInstanceResponse:
        """Cancels a running or waiting workflow instance."""
        instance = self.instances.get(instance_id)
        if not instance:
            raise ValueError(f"Instance {instance_id} not found")

        instance.status = WorkflowInstanceStatus.CANCELLED
        instance.error = reason
        instance.updated_at = datetime.utcnow().isoformat()
        self.instances[instance_id] = instance
        return instance

    def retry_instance(self, instance_id: str) -> WorkflowInstanceResponse:
        """Retries a failed or cancelled workflow instance idempotently."""
        instance = self.instances.get(instance_id)
        if not instance:
            raise ValueError(f"Instance {instance_id} not found")

        definition = self.definitions.get(instance.workflow_id)
        if not definition:
            raise ValueError(f"Definition {instance.workflow_id} not found")

        step_models = self.steps.get(instance_id, [])
        # Reset failed steps to pending
        for s in step_models:
            if s.status in [WorkflowStepStatus.FAILED, WorkflowStepStatus.SKIPPED]:
                s.status = WorkflowStepStatus.PENDING
                s.error = None

        instance.status = WorkflowInstanceStatus.RUNNING
        instance.error = None
        instance.updated_at = datetime.utcnow().isoformat()

        return self._run_steps(
            instance,
            definition.actions,
            {"organization_id": instance.organization_id, "risk_id": instance.risk_id, "event_id": instance.event_id}
        )

    # ----------------------------------------------------------------------
    # Querying & Metrics
    # ----------------------------------------------------------------------

    def get_instance(self, instance_id: str) -> Optional[WorkflowInstanceResponse]:
        inst = self.instances.get(instance_id)
        if inst:
            inst.steps = self.steps.get(instance_id, [])
        return inst

    def list_instances(
        self,
        org_id: Optional[str] = None,
        status: Optional[WorkflowInstanceStatus] = None,
        workflow_id: Optional[str] = None
    ) -> List[WorkflowInstanceResponse]:
        res = list(self.instances.values())
        if org_id:
            res = [i for i in res if i.organization_id == org_id]
        if status:
            res = [i for i in res if i.status == status]
        if workflow_id:
            res = [i for i in res if i.workflow_id == workflow_id]
        for item in res:
            item.steps = self.steps.get(item.instance_id, [])
        return res

    def get_metrics(self, org_id: Optional[str] = None) -> Dict[str, Any]:
        """Aggregates workflow operational metrics."""
        instances = self.list_instances(org_id=org_id)
        now_date = datetime.utcnow().date()

        active = [i for i in instances if i.status == WorkflowInstanceStatus.RUNNING]
        pending_approvals = [i for i in instances if i.status == WorkflowInstanceStatus.WAITING_FOR_APPROVAL]
        escalated = [i for i in instances if i.status == WorkflowInstanceStatus.ESCALATED]
        failed = [i for i in instances if i.status == WorkflowInstanceStatus.FAILED]

        completed_today = 0
        overdue_count = 0
        for i in instances:
            if i.status == WorkflowInstanceStatus.COMPLETED and i.completed_at:
                try:
                    c_date = datetime.fromisoformat(i.completed_at).date()
                    if c_date == now_date:
                        completed_today += 1
                except Exception:
                    pass

            if i.deadline and i.status in [WorkflowInstanceStatus.RUNNING, WorkflowInstanceStatus.WAITING_FOR_APPROVAL]:
                try:
                    due = datetime.fromisoformat(i.deadline.get("due_at", ""))
                    if datetime.utcnow() > due:
                        overdue_count += 1
                except Exception:
                    pass

        total_finished = len([i for i in instances if i.status in [WorkflowInstanceStatus.COMPLETED, WorkflowInstanceStatus.FAILED]])
        success_rate = 100.0 if total_finished == 0 else round((len([i for i in instances if i.status == WorkflowInstanceStatus.COMPLETED]) / total_finished) * 100.0, 1)

        return {
            "active_workflows": len(active),
            "pending_approvals": len(pending_approvals),
            "overdue_workflows": overdue_count,
            "completed_today": completed_today,
            "failed_workflows": len(failed),
            "escalated_workflows": len(escalated),
            "success_rate": success_rate,
            "total_instances": len(instances)
        }


# Singleton engine instance
default_workflow_engine = WorkflowEngine()
