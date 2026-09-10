"""
Phase 7: Alerts + Workflow Automation Unit & Integration Tests
Covers all 35 required scenarios:
- Alert tests (1-8)
- Workflow tests (9-20)
- Deadline & escalation tests (21-25)
- Notification tests (26-28)
- AI integration tests (29-31)
- Security tests (32-35)
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.schemas.alert import AlertCreate, AlertSeverity, AlertStatus, AlertType, AlertAssignRequest
from app.schemas.workflow import (
    WorkflowActionStep,
    WorkflowActionType,
    WorkflowCondition,
    WorkflowDefinitionCreate,
    WorkflowDefinitionUpdate,
    WorkflowExecuteRequest,
    WorkflowInstanceStatus,
    WorkflowStepStatus,
    WorkflowTriggerType,
    RetryPolicy,
    DeadlineConfig
)
from app.schemas.notification import NotificationCreate, NotificationType
from app.alerts.service import AlertService
from app.notifications.service import NotificationService
from app.workflows.engine import WorkflowEngine
from app.workflows.evaluator import WorkflowEvaluator
from app.workflows.escalation import EscalationEngine, EscalationTier
from app.workflows.executor import StepExecutor
from app.workflows.idempotency import IdempotencyManager

client = TestClient(app)
INTERNAL_KEY = settings.INTERNAL_SERVICE_KEY
INTERNAL_HEADERS = {"X-Internal-Service-Key": INTERNAL_KEY}


# ==============================================================================
# 1-8: ALERT TESTS
# ==============================================================================

def test_1_alert_creation():
    service = AlertService()
    alert = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="High Carbon Emissions Detected",
        severity=AlertSeverity.HIGH,
        type=AlertType.CARBON
    ))
    assert alert.alert_id.startswith("alt_")
    assert alert.title == "High Carbon Emissions Detected"
    assert alert.status == AlertStatus.NEW
    assert alert.severity == AlertSeverity.HIGH


def test_2_alert_duplicate_prevention():
    service = AlertService()
    alert1 = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Duplicate Carbon Alert",
        severity=AlertSeverity.HIGH,
        type=AlertType.CARBON,
        event_id="evt_100"
    ))
    alert2 = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Duplicate Carbon Alert",
        severity=AlertSeverity.HIGH,
        type=AlertType.CARBON,
        event_id="evt_100"
    ))
    assert alert1.alert_id == alert2.alert_id
    assert len(service.alerts) == 1


def test_3_alert_acknowledge():
    service = AlertService()
    alert = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Ack Test Alert",
        severity=AlertSeverity.MEDIUM,
        type=AlertType.MONITORING
    ))
    acked = service.acknowledge_alert(alert.alert_id)
    assert acked.status == AlertStatus.ACKNOWLEDGED
    assert acked.acknowledged_at is not None


def test_4_alert_resolve():
    service = AlertService()
    alert = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Resolve Test Alert",
        severity=AlertSeverity.HIGH,
        type=AlertType.CRITICAL_RISK
    ))
    resolved = service.resolve_alert(alert.alert_id)
    assert resolved.status == AlertStatus.RESOLVED
    assert resolved.resolved_at is not None


def test_5_alert_dismiss():
    service = AlertService()
    alert = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Dismiss Test Alert",
        severity=AlertSeverity.LOW,
        type=AlertType.MONITORING
    ))
    dismissed = service.dismiss_alert(alert.alert_id)
    assert dismissed.status == AlertStatus.DISMISSED


def test_6_alert_assignment():
    service = AlertService()
    alert = service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Assign Test Alert",
        severity=AlertSeverity.HIGH,
        type=AlertType.RISK_ESCALATION
    ))
    assigned = service.assign_alert(alert.alert_id, assigned_to="esg_lead@acme.com")
    assert assigned.assigned_to == "esg_lead@acme.com"
    assert assigned.status == AlertStatus.IN_PROGRESS


def test_7_alert_tenant_isolation():
    service = AlertService()
    service.create_alert(AlertCreate(
        organization_id="org_acme",
        title="Acme Alert",
        type=AlertType.ESG
    ))
    service.create_alert(AlertCreate(
        organization_id="org_msme",
        title="MSME Alert",
        type=AlertType.ESG
    ))

    acme_alerts = service.list_alerts(organization_id="org_acme")
    msme_alerts = service.list_alerts(organization_id="org_msme")

    assert len(acme_alerts) == 1
    assert acme_alerts[0].organization_id == "org_acme"
    assert len(msme_alerts) == 1
    assert msme_alerts[0].organization_id == "org_msme"


def test_8_alert_rbac():
    # Via API: missing internal key returns 401
    resp = client.post("/internal/alerts/", json={
        "organization_id": "org_acme",
        "title": "Unauthorized Alert",
        "type": "MONITORING"
    })
    assert resp.status_code == 401


# ==============================================================================
# 9-20: WORKFLOW TESTS
# ==============================================================================

def test_9_workflow_definition_validation():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Escalation Flow",
        description="Handles critical risks",
        trigger=WorkflowTriggerType.RISK_ESCALATED,
        conditions=[
            WorkflowCondition(field="severity", operator="equals", value="CRITICAL")
        ],
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CREATE_ALERT, parameters={"title": "Alert"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.ASSIGN_OWNER, parameters={"assigned_to": "lead"})
        ],
        enabled=True,
        organization_id="org_acme"
    ))
    assert wf.workflow_id.startswith("wf_")
    assert len(wf.actions) == 2
    assert wf.trigger == WorkflowTriggerType.RISK_ESCALATED


def test_10_condition_evaluation():
    context = {"severity": "CRITICAL", "risk_score": 85.0, "previous_value": 40.0, "current_value": 85.0}

    # Equals
    m1, _ = WorkflowEvaluator.evaluate_condition({"field": "severity", "operator": "equals", "value": "CRITICAL"}, context)
    assert m1 is True

    # Greater than
    m2, _ = WorkflowEvaluator.evaluate_condition({"field": "risk_score", "operator": "greater_than", "value": 75}, context)
    assert m2 is True

    # Crosses threshold
    m3, _ = WorkflowEvaluator.evaluate_condition({"field": "risk_score", "operator": "crosses_threshold", "threshold": 75.0}, context)
    assert m3 is True

    # Negative check
    m4, _ = WorkflowEvaluator.evaluate_condition({"field": "severity", "operator": "equals", "value": "LOW"}, context)
    assert m4 is False


def test_11_workflow_creation():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Test Workflow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CREATE_ALERT, parameters={"title": "Alert"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(
        workflow_id=wf.workflow_id,
        org_id="org_acme",
        context_data={"risk_id": "r_100"}
    )
    assert inst.instance_id.startswith("inst_")
    assert inst.status == WorkflowInstanceStatus.COMPLETED
    assert inst.current_step == 1


def test_12_step_execution():
    executor = StepExecutor()
    step = WorkflowActionStep(
        step_number=1,
        action_type=WorkflowActionType.CREATE_TASK,
        parameters={"title": "Urgent Audit Review", "assigned_to": "auditor"}
    )
    res = executor.execute_step("inst_1", step, {"organization_id": "org1"})
    assert res["status"] == WorkflowStepStatus.COMPLETED
    assert "Urgent Audit Review" in res["input_summary"] or "task" in res["result_summary"].lower()


def test_13_multi_step_workflow():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="3-Step Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CREATE_ALERT, parameters={"title": "Step 1"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CREATE_MITIGATION, parameters={"title": "Step 2"}),
            WorkflowActionStep(step_number=3, action_type=WorkflowActionType.CREATE_NOTIFICATION, parameters={"title": "Step 3"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    assert inst.status == WorkflowInstanceStatus.COMPLETED
    assert len(inst.steps) == 3
    assert all(s.status == WorkflowStepStatus.COMPLETED for s in inst.steps)


def test_14_approval_pause():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Sensitive Owner Change Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CREATE_ALERT, parameters={"title": "Alert 1"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CHANGE_RISK_OWNER, parameters={"new_owner": "external_lead"}),
            WorkflowActionStep(step_number=3, action_type=WorkflowActionType.CREATE_NOTIFICATION, parameters={"title": "Complete"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    assert inst.status == WorkflowInstanceStatus.WAITING_FOR_APPROVAL
    assert inst.current_step == 2
    assert inst.steps[0].status == WorkflowStepStatus.COMPLETED
    assert inst.steps[1].status == WorkflowStepStatus.WAITING
    assert inst.steps[2].status == WorkflowStepStatus.PENDING


def test_15_approval_resume():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Resume Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CHANGE_RISK_OWNER, parameters={"new_owner": "lead"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CREATE_NOTIFICATION, parameters={"title": "Done"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    assert inst.status == WorkflowInstanceStatus.WAITING_FOR_APPROVAL

    # Approve
    resumed = engine.approve_step(inst.instance_id, reviewer_id="LeadReviewer")
    assert resumed.status == WorkflowInstanceStatus.COMPLETED
    assert all(s.status == WorkflowStepStatus.COMPLETED for s in resumed.steps)


def test_16_approval_rejection():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Reject Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.DESTRUCTIVE_ACTION, parameters={"target": "record"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CREATE_NOTIFICATION, parameters={"title": "Done"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    assert inst.status == WorkflowInstanceStatus.WAITING_FOR_APPROVAL

    # Reject
    rejected = engine.reject_step(inst.instance_id, reviewer_id="SecurityAdmin", comment="Disallowed")
    assert rejected.status == WorkflowInstanceStatus.CANCELLED
    assert "Disallowed" in rejected.error or "rejection" in rejected.error


def test_17_cancellation():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Cancel Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CHANGE_RISK_OWNER, parameters={})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    cancelled = engine.cancel_instance(inst.instance_id, reason="Manual user abort")
    assert cancelled.status == WorkflowInstanceStatus.CANCELLED
    assert cancelled.error == "Manual user abort"


def test_18_retry():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="Retry Flow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.CREATE_ALERT, parameters={"title": "Step 1"}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CREATE_TASK, parameters={"title": "Step 2"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {})
    # Mark as failed manually for test
    inst.status = WorkflowInstanceStatus.FAILED
    inst.steps[1].status = WorkflowStepStatus.FAILED
    engine.instances[inst.instance_id] = inst

    retried = engine.retry_instance(inst.instance_id)
    assert retried.status == WorkflowInstanceStatus.COMPLETED


def test_19_failure_handling():
    executor = StepExecutor()
    # Malformed action that raises error
    step = WorkflowActionStep(
        step_number=1,
        action_type=WorkflowActionType.SET_DEADLINE,
        parameters={"duration_hours": "invalid_number"}
    )
    res = executor.execute_step("inst_err", step, {})
    assert res["status"] == WorkflowStepStatus.FAILED
    assert res["error"] is not None


def test_20_idempotency():
    idemp_mgr = IdempotencyManager()
    executor = StepExecutor(idempotency_mgr=idemp_mgr)

    step = WorkflowActionStep(
        step_number=1,
        action_type=WorkflowActionType.CREATE_ALERT,
        parameters={"title": "Idempotent Alert"}
    )
    # Execution 1
    res1 = executor.execute_step("inst_idem", step, {"organization_id": "org1", "risk_id": "r1"})
    assert res1.get("idempotent_cached") is not True

    # Execution 2 (Exact same action and parameters)
    res2 = executor.execute_step("inst_idem", step, {"organization_id": "org1", "risk_id": "r1"})
    assert res2.get("idempotent_cached") is True
    assert res2["status"] == WorkflowStepStatus.COMPLETED


# ==============================================================================
# 21-25: DEADLINE & ESCALATION TESTS
# ==============================================================================

def test_21_deadline_creation():
    start = datetime(2026, 9, 1, 10, 0, 0)
    deadline = EscalationEngine.calculate_deadline(
        started_at=start,
        duration_hours=24.0,
        warning_pct=75.0
    )
    assert deadline["duration_hours"] == 24.0
    assert deadline["due_at"] == "2026-09-02T10:00:00"
    assert deadline["warning_at"] == "2026-09-02T04:00:00"


def test_22_warning_threshold():
    start = datetime(2026, 9, 1, 0, 0, 0)
    deadline = EscalationEngine.calculate_deadline(started_at=start, duration_hours=24.0, warning_pct=75.0)

    # 18 hours elapsed (75%)
    now_75 = start + timedelta(hours=18.5)
    tier, should_escalate, reason = EscalationEngine.evaluate_escalation(deadline, now=now_75)
    assert tier == EscalationTier.WARNING
    assert should_escalate is True
    assert "approaching" in reason


def test_23_overdue_detection():
    start = datetime(2026, 9, 1, 0, 0, 0)
    deadline = EscalationEngine.calculate_deadline(started_at=start, duration_hours=24.0)

    # 25 hours elapsed (past 100%)
    now_overdue = start + timedelta(hours=25.0)
    tier, should_escalate, reason = EscalationEngine.evaluate_escalation(deadline, now=now_overdue)
    assert tier == EscalationTier.OVERDUE
    assert should_escalate is True


def test_24_escalation():
    start = datetime(2026, 9, 1, 0, 0, 0)
    deadline = EscalationEngine.calculate_deadline(started_at=start, duration_hours=24.0)

    # +25 hours past due (manager escalation)
    now_mgr = start + timedelta(hours=24.0 + 25.0)
    tier, should_escalate, _ = EscalationEngine.evaluate_escalation(deadline, now=now_mgr)
    assert tier == EscalationTier.MANAGER_ESCALATED
    assert should_escalate is True

    # +49 hours past due (critical escalation)
    now_crit = start + timedelta(hours=24.0 + 49.0)
    tier, should_escalate, _ = EscalationEngine.evaluate_escalation(deadline, now=now_crit)
    assert tier == EscalationTier.CRITICAL_ESCALATED
    assert should_escalate is True


def test_25_duplicate_escalation_prevention():
    start = datetime(2026, 9, 1, 0, 0, 0)
    deadline = EscalationEngine.calculate_deadline(started_at=start, duration_hours=24.0)

    now_overdue = start + timedelta(hours=25.0)
    tier1, should1, _ = EscalationEngine.evaluate_escalation(deadline, now=now_overdue)
    assert should1 is True

    # Record tier as already escalated
    deadline["escalated_tiers"].append(tier1)

    tier2, should2, _ = EscalationEngine.evaluate_escalation(deadline, now=now_overdue)
    assert should2 is False  # Duplicate escalation suppressed!


# ==============================================================================
# 26-28: NOTIFICATION TESTS
# ==============================================================================

def test_26_notification_creation():
    service = NotificationService()
    notif = service.create_notification(NotificationCreate(
        organization_id="org_acme",
        user_id="user_1",
        type=NotificationType.WORKFLOW_ASSIGNED,
        title="New Task Assigned",
        message="Please review mitigation"
    ))
    assert notif.notification_id.startswith("notif_")
    assert notif.read is False


def test_27_notification_read_state():
    service = NotificationService()
    notif = service.create_notification(NotificationCreate(
        organization_id="org_acme",
        user_id="user_1",
        title="Read State Test",
        message="Sample"
    ))
    marked = service.mark_as_read(notif.notification_id)
    assert marked.read is True


def test_28_notification_user_isolation():
    service = NotificationService()
    service.create_notification(NotificationCreate(
        organization_id="org_acme",
        user_id="user_alpha",
        title="For Alpha"
    ))
    service.create_notification(NotificationCreate(
        organization_id="org_acme",
        user_id="user_beta",
        title="For Beta"
    ))

    alpha_notifs = service.list_notifications(organization_id="org_acme", user_id="user_alpha")
    beta_notifs = service.list_notifications(organization_id="org_acme", user_id="user_beta")

    assert len(alpha_notifs) == 1
    assert alpha_notifs[0].title == "For Alpha"
    assert len(beta_notifs) == 1
    assert beta_notifs[0].title == "For Beta"


# ==============================================================================
# 29-31: AI INTEGRATION TESTS
# ==============================================================================

def test_29_event_triggers_agent():
    engine = WorkflowEngine()
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="AI Investigation Workflow",
        trigger=WorkflowTriggerType.CRITICAL_RISK_DETECTED,
        actions=[
            WorkflowActionStep(
                step_number=1,
                action_type=WorkflowActionType.TRIGGER_AI_AGENT,
                parameters={"goal": "Deep investigation into supply chain violation"}
            )
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(
        workflow_id=wf.workflow_id,
        org_id="org_acme",
        context_data={"risk_id": "r_supply_10"}
    )
    assert inst.status == WorkflowInstanceStatus.COMPLETED
    assert "agent_run" in inst.steps[0].result_summary.lower()


def test_30_agent_recommendation_creates_workflow_action():
    engine = WorkflowEngine()
    # Flow chaining AI trigger followed by proposed mitigation
    wf = engine.register_definition(WorkflowDefinitionCreate(
        name="AI Grounded Workflow",
        trigger=WorkflowTriggerType.MANUAL,
        actions=[
            WorkflowActionStep(step_number=1, action_type=WorkflowActionType.TRIGGER_AI_AGENT, parameters={}),
            WorkflowActionStep(step_number=2, action_type=WorkflowActionType.CREATE_MITIGATION, parameters={"title": "AI Recommended Scope 3 Filter"})
        ],
        organization_id="org_acme"
    ))
    inst = engine.create_and_execute_workflow(wf.workflow_id, "org_acme", {"risk_id": "r_5"})
    assert inst.status == WorkflowInstanceStatus.COMPLETED
    assert len(inst.steps) == 2
    assert inst.steps[1].action_type == WorkflowActionType.CREATE_MITIGATION


def test_31_sensitive_action_requires_approval():
    executor = StepExecutor()
    # Sensitive action without prior approval must return WAITING
    step = WorkflowActionStep(
        step_number=1,
        action_type=WorkflowActionType.CHANGE_COMPLIANCE_STATUS,
        parameters={"status": "WAIVED"}
    )
    res = executor.execute_step("inst_sens", step, {"organization_id": "org_acme"}, is_approved=False)
    assert res["status"] == WorkflowStepStatus.WAITING
    assert res["requires_approval"] is True


# ==============================================================================
# 32-35: SECURITY TESTS
# ==============================================================================

def test_32_security_tenant_isolation():
    engine = WorkflowEngine()
    engine.register_definition(WorkflowDefinitionCreate(
        name="Acme Only",
        trigger=WorkflowTriggerType.MANUAL,
        organization_id="org_acme"
    ))
    engine.register_definition(WorkflowDefinitionCreate(
        name="MSME Only",
        trigger=WorkflowTriggerType.MANUAL,
        organization_id="org_msme"
    ))

    acme_wfs = engine.list_definitions(org_id="org_acme")
    msme_wfs = engine.list_definitions(org_id="org_msme")
    assert len(acme_wfs) == 1
    assert acme_wfs[0].name == "Acme Only"
    assert len(msme_wfs) == 1
    assert msme_wfs[0].name == "MSME Only"


def test_33_security_project_isolation():
    engine = WorkflowEngine()
    engine.register_definition(WorkflowDefinitionCreate(
        name="Solar Project Flow",
        trigger=WorkflowTriggerType.MANUAL,
        organization_id="org_acme",
        project_id="proj_solar"
    ))
    engine.register_definition(WorkflowDefinitionCreate(
        name="Wind Project Flow",
        trigger=WorkflowTriggerType.MANUAL,
        organization_id="org_acme",
        project_id="proj_wind"
    ))

    solar_wfs = engine.list_definitions(org_id="org_acme", project_id="proj_solar")
    assert len(solar_wfs) == 1
    assert solar_wfs[0].name == "Solar Project Flow"


def test_34_unauthorized_workflow_execution():
    # Without X-Internal-Service-Key, execution endpoint rejects
    resp = client.post("/internal/workflows/execute", json={
        "organization_id": "org_acme",
        "context_data": {}
    })
    assert resp.status_code == 401


def test_35_unauthorized_approval():
    # Without authorization key, approve endpoint rejects
    resp = client.post("/internal/workflows/instances/inst_fake/approve", json={"action": "APPROVE"})
    assert resp.status_code == 401
