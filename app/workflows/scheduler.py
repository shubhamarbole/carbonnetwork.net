"""
Workflow Deadline & Escalation Scheduler
Phase 7: Alerts + Workflow Automation

Background scheduler that sweeps running workflows, evaluates deadlines,
and triggers warning/overdue/manager/critical escalations.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from app.workflows.engine import WorkflowEngine, default_workflow_engine
from app.workflows.escalation import EscalationEngine, EscalationTier, default_escalation_engine
from app.schemas.workflow import WorkflowInstanceStatus

logger = logging.getLogger("workflow.scheduler")


class WorkflowScheduler:
    """Manages recurring sweeps for deadline checks and automated escalations."""

    def __init__(
        self,
        engine: Optional[WorkflowEngine] = None,
        escalation_engine: Optional[EscalationEngine] = None
    ):
        self.engine = engine or default_workflow_engine
        self.escalation_engine = escalation_engine or default_escalation_engine
        self.scheduler = BackgroundScheduler()
        self._is_running = False

    def start(self, interval_minutes: int = 15):
        """Starts periodic deadline sweeps."""
        if not self._is_running:
            self.scheduler.add_job(
                self.run_deadline_sweep,
                "interval",
                minutes=interval_minutes,
                id="workflow_deadline_sweep",
                replace_existing=True
            )
            self.scheduler.start()
            self._is_running = True
            logger.info("Workflow deadline scheduler started.")

    def shutdown(self):
        """Stops the scheduler."""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("Workflow deadline scheduler stopped.")

    def run_deadline_sweep(self) -> Dict[str, Any]:
        """Runs an evaluation sweep across all active workflows with deadlines."""
        instances = self.engine.list_instances()
        active_instances = [
            i for i in instances
            if i.deadline and i.status in [WorkflowInstanceStatus.RUNNING, WorkflowInstanceStatus.WAITING_FOR_APPROVAL]
        ]

        now = datetime.utcnow()
        escalations_triggered = 0
        details: List[Dict[str, Any]] = []

        for inst in active_instances:
            deadline_info = inst.deadline or {}
            new_tier, should_escalate, reason = self.escalation_engine.evaluate_escalation(
                deadline_info=deadline_info,
                now=now
            )

            if should_escalate:
                escalations_triggered += 1
                deadline_info["current_tier"] = new_tier
                if "escalated_tiers" not in deadline_info:
                    deadline_info["escalated_tiers"] = []
                deadline_info["escalated_tiers"].append(new_tier)

                if new_tier in [EscalationTier.MANAGER_ESCALATED, EscalationTier.CRITICAL_ESCALATED]:
                    inst.status = WorkflowInstanceStatus.ESCALATED

                inst.deadline = deadline_info
                inst.updated_at = now.isoformat()
                self.engine.instances[inst.instance_id] = inst

                details.append({
                    "instance_id": inst.instance_id,
                    "tier": new_tier,
                    "reason": reason
                })
                logger.warning(f"Workflow {inst.instance_id} escalated to {new_tier}: {reason}")

        return {
            "instances_checked": len(active_instances),
            "escalations_triggered": escalations_triggered,
            "details": details,
            "timestamp": now.isoformat()
        }


default_workflow_scheduler = WorkflowScheduler()
