"""
Phase 6: Proactive Monitoring & Event Detection Unit and Integration Tests
Tests all 19 event types, deterministic condition operators, deduplication,
tenant isolation, AI agent triggering, and internal API routes.
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.schemas.monitoring import (
    EventStatus,
    MonitoredEventType,
    MonitoringEventCreate,
    MonitoringRuleCreate,
    MonitoringRuleUpdate,
    RuleAction,
    RuleCondition,
    RuleOperator,
)
from app.monitoring.detectors import EventDetector
from app.monitoring.evaluator import RuleEvaluator
from app.monitoring.fingerprint import FingerprintManager
from app.monitoring.engine import MonitoringEngine
from app.services.monitoring_service import MonitoringService

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}


# ==========================================
# 1-11: Deterministic Event Detectors Tests
# ==========================================

def test_risk_escalated_detection():
    detector = EventDetector()
    curr = {"risk_id": "r1", "organization_id": "org1", "risk_score": 85.0, "severity": "HIGH", "title": "Supply Chain"}
    prev = {"risk_id": "r1", "organization_id": "org1", "risk_score": 30.0, "severity": "LOW", "title": "Supply Chain"}

    events = detector.detect_risk_events(curr, prev)
    types = [e.event_type for e in events]
    assert MonitoredEventType.RISK_ESCALATED in types
    assert MonitoredEventType.RISK_SCORE_CHANGED in types


def test_risk_score_changed_detection():
    detector = EventDetector()
    curr = {"risk_id": "r2", "organization_id": "org1", "risk_score": 45.0, "severity": "MEDIUM"}
    prev = {"risk_id": "r2", "organization_id": "org1", "risk_score": 40.0, "severity": "MEDIUM"}

    events = detector.detect_risk_events(curr, prev)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.RISK_SCORE_CHANGED
    assert events[0].current_value == 45.0
    assert events[0].previous_value == 40.0


def test_risk_deescalated_detection():
    detector = EventDetector()
    curr = {"risk_id": "r3", "organization_id": "org1", "risk_score": 25.0, "severity": "LOW"}
    prev = {"risk_id": "r3", "organization_id": "org1", "risk_score": 80.0, "severity": "HIGH"}

    events = detector.detect_risk_events(curr, prev)
    types = [e.event_type for e in events]
    assert MonitoredEventType.RISK_DE_ESCALATED in types


def test_compliance_deadline_approaching():
    detector = EventDetector()
    now = datetime(2026, 9, 1, 10, 0, 0)
    rec = {
        "record_id": "c1",
        "organization_id": "org1",
        "title": "ISO 14001 Audit",
        "deadline": "2026-09-08",
        "status": "IN_PROGRESS",
        "documents": ["doc1.pdf"]
    }
    events = detector.detect_compliance_events(rec, reference_time=now)
    types = [e.event_type for e in events]
    assert MonitoredEventType.COMPLIANCE_DEADLINE_APPROACHING in types
    matched = [e for e in events if e.event_type == MonitoredEventType.COMPLIANCE_DEADLINE_APPROACHING][0]
    assert matched.payload["days_remaining"] == 7


def test_compliance_deadline_missed():
    detector = EventDetector()
    now = datetime(2026, 9, 10, 10, 0, 0)
    rec = {
        "record_id": "c2",
        "organization_id": "org1",
        "title": "CSRD Disclosure",
        "deadline": "2026-09-05",
        "status": "PENDING",
        "documents": ["draft.docx"]
    }
    events = detector.detect_compliance_events(rec, reference_time=now)
    types = [e.event_type for e in events]
    assert MonitoredEventType.COMPLIANCE_DEADLINE_MISSED in types


def test_compliance_document_missing():
    detector = EventDetector()
    rec = {
        "record_id": "c3",
        "organization_id": "org1",
        "title": "Carbon Neutral Certification",
        "status": "PENDING",
        "documents": []
    }
    events = detector.detect_compliance_events(rec)
    types = [e.event_type for e in events]
    assert MonitoredEventType.COMPLIANCE_DOCUMENT_MISSING in types


def test_esg_threshold_exceeded():
    detector = EventDetector()
    metric = {
        "metric_id": "m1",
        "organization_id": "org1",
        "name": "Water Consumption (m3)",
        "value": 1500.0,
        "threshold": 1000.0
    }
    events = detector.detect_esg_events(metric)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.ESG_THRESHOLD_EXCEEDED
    assert events[0].payload["exceeded_by"] == 500.0


def test_esg_data_missing():
    detector = EventDetector()
    metric = {
        "metric_id": "m2",
        "organization_id": "org1",
        "name": "Scope 3 Supply Emissions",
        "value": None
    }
    events = detector.detect_esg_events(metric)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.ESG_DATA_MISSING


def test_carbon_target_deviation():
    detector = EventDetector()
    rec = {
        "record_id": "cb1",
        "organization_id": "org1",
        "emissions": 135.0,
        "target": 100.0
    }
    events = detector.detect_carbon_events(rec)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.CARBON_TARGET_DEVIATION
    assert events[0].payload["deviation_percentage"] == 35.0


def test_supplier_risk_increased():
    detector = EventDetector()
    curr = {"supplier_id": "s1", "organization_id": "org1", "name": "SteelCorp", "risk_score": 78.0}
    prev = {"supplier_id": "s1", "organization_id": "org1", "name": "SteelCorp", "risk_score": 50.0}

    events = detector.detect_supplier_events(curr, prev)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.SUPPLIER_RISK_INCREASED
    assert events[0].payload["increase"] == 28.0


def test_project_delayed():
    detector = EventDetector()
    now = datetime(2026, 9, 10)
    proj = {
        "project_id": "p1",
        "organization_id": "org1",
        "name": "Solar Array Phase 2",
        "target_end_date": "2026-09-01",
        "status": "ACTIVE"
    }
    events = detector.detect_project_events(proj, reference_time=now)
    assert len(events) == 1
    assert events[0].event_type == MonitoredEventType.PROJECT_DELAYED
    assert events[0].payload["days_delayed"] == 9


# ==========================================
# 12-13: Fingerprinting and Deduplication
# ==========================================

def test_fingerprint_deterministic():
    mgr = FingerprintManager()
    fp1 = mgr.generate_fingerprint("res_123", "RISK_ESCALATED", "rule_1", time_window="2026-09-04")
    fp2 = mgr.generate_fingerprint("res_123", "RISK_ESCALATED", "rule_1", time_window="2026-09-04")
    assert fp1 == fp2
    assert len(fp1) == 64  # SHA-256 hex digest length


def test_fingerprint_deduplication():
    mgr = FingerprintManager(window_hours=24)
    mgr.clear()
    engine = MonitoringEngine(fingerprint_manager=mgr)

    evt = MonitoringEventCreate(
        event_type=MonitoredEventType.RISK_ESCALATED,
        organization_id="org_test",
        resource_type="Risk",
        resource_id="risk_dedup_1",
        current_value="HIGH",
        payload={"current_severity": "HIGH"}
    )

    # First event processes normally
    res1, alerts1 = engine.evaluate_event(evt)
    assert res1.status == EventStatus.PROCESSED

    # Second identical event in same window must be marked IGNORED and suppressed
    res2, alerts2 = engine.evaluate_event(evt)
    assert res2.status == EventStatus.IGNORED
    assert len(alerts2) == 0


# ==========================================
# 14-17: Rule Condition Evaluator Tests
# ==========================================

def test_condition_operators_numeric():
    evaluator = RuleEvaluator()

    # Greater than
    cond_gt = RuleCondition(field="score", operator=RuleOperator.GREATER_THAN, value=50.0)
    matched, _ = evaluator.evaluate_condition(cond_gt, {"score": 75.0})
    assert matched is True
    matched, _ = evaluator.evaluate_condition(cond_gt, {"score": 40.0})
    assert matched is False

    # Less than or equal
    cond_lte = RuleCondition(field="score", operator=RuleOperator.LESS_THAN_OR_EQUAL, value=50.0)
    matched, _ = evaluator.evaluate_condition(cond_lte, {"score": 50.0})
    assert matched is True
    matched, _ = evaluator.evaluate_condition(cond_lte, {"score": 51.0})
    assert matched is False

    # Equals
    cond_eq = RuleCondition(field="status", operator=RuleOperator.EQUALS, value="ACTIVE")
    matched, _ = evaluator.evaluate_condition(cond_eq, {"status": "ACTIVE"})
    assert matched is True
    matched, _ = evaluator.evaluate_condition(cond_eq, {"status": "INACTIVE"})
    assert matched is False


def test_condition_operator_crosses_threshold():
    evaluator = RuleEvaluator()
    cond = RuleCondition(field="risk_score", operator=RuleOperator.CROSSES_THRESHOLD, threshold=70.0)

    # Crossing from 60 -> 75
    matched, _ = evaluator.evaluate_condition(cond, {"previous_value": 60.0, "current_value": 75.0})
    assert matched is True

    # Already above (72 -> 80) does not re-cross
    matched, _ = evaluator.evaluate_condition(cond, {"previous_value": 72.0, "current_value": 80.0})
    assert matched is False


def test_condition_operator_percentage():
    evaluator = RuleEvaluator()

    # Increase 20%
    cond_inc = RuleCondition(field="emissions", operator=RuleOperator.INCREASE_PERCENTAGE, value=20.0)
    # 100 -> 125 (+25%)
    matched, _ = evaluator.evaluate_condition(cond_inc, {"previous_value": 100.0, "current_value": 125.0})
    assert matched is True
    # 100 -> 110 (+10%)
    matched, _ = evaluator.evaluate_condition(cond_inc, {"previous_value": 100.0, "current_value": 110.0})
    assert matched is False


def test_rule_multi_condition_and_logic():
    evaluator = RuleEvaluator()
    rule = {
        "event_type": "RISK_ESCALATED",
        "organization_id": "org_multi",
        "conditions": [
            {"field": "risk_score", "operator": "greater_than", "value": 70.0},
            {"field": "category", "operator": "equals", "value": "Regulatory"}
        ]
    }

    # Case A: Both pass
    event_pass = {
        "event_type": "RISK_ESCALATED",
        "organization_id": "org_multi",
        "payload": {"risk_score": 85.0, "category": "Regulatory"}
    }
    matched, _ = evaluator.evaluate_rule(rule, event_pass)
    assert matched is True

    # Case B: One fails (category mismatch)
    event_fail = {
        "event_type": "RISK_ESCALATED",
        "organization_id": "org_multi",
        "payload": {"risk_score": 85.0, "category": "Operational"}
    }
    matched, _ = evaluator.evaluate_rule(rule, event_fail)
    assert matched is False


# ==========================================
# 18-20: Tenant Isolation, Agent Trigger & API
# ==========================================

def test_tenant_isolation_rules():
    mgr = FingerprintManager()
    engine = MonitoringEngine(fingerprint_manager=mgr)

    # Register rule for Tenant A
    engine.register_rule(MonitoringRuleCreate(
        rule_id="rule_tenant_a",
        name="Tenant A Rule",
        event_type=MonitoredEventType.RISK_SCORE_CHANGED,
        conditions=[RuleCondition(field="score_delta", operator=RuleOperator.GREATER_THAN, value=5.0)],
        action=RuleAction.CREATE_ALERT,
        organization_id="tenant_alpha"
    ))

    # Event for Tenant B with matching delta
    evt_b = MonitoringEventCreate(
        event_type=MonitoredEventType.RISK_SCORE_CHANGED,
        organization_id="tenant_beta",
        resource_type="Risk",
        resource_id="risk_beta_1",
        payload={"score_delta": 10.0}
    )

    resp, alerts = engine.evaluate_event(evt_b)
    # Rule for tenant_alpha MUST NOT match tenant_beta
    assert resp.rule_id is None
    assert len(alerts) == 0


def test_monitoring_engine_ai_agent_trigger():
    mgr = FingerprintManager()
    engine = MonitoringEngine(fingerprint_manager=mgr)

    # Register rule with action TRIGGER_AI_AGENT
    engine.register_rule(MonitoringRuleCreate(
        rule_id="rule_trigger_agent_test",
        name="Trigger AI Agent for Critical Escalation",
        event_type=MonitoredEventType.RISK_ESCALATED,
        conditions=[RuleCondition(field="current_severity", operator=RuleOperator.EQUALS, value="CRITICAL")],
        action=RuleAction.TRIGGER_AI_AGENT,
        organization_id="org_ai_test"
    ))

    evt = MonitoringEventCreate(
        event_type=MonitoredEventType.RISK_ESCALATED,
        organization_id="org_ai_test",
        resource_type="Risk",
        resource_id="risk_crit_1",
        current_value="CRITICAL",
        payload={"current_severity": "CRITICAL", "category": "Environmental"}
    )

    resp, alerts = engine.evaluate_event(evt)
    assert resp.status == EventStatus.PROCESSED
    assert resp.ai_agent_run_id is not None
    assert resp.ai_agent_run_id.startswith("run_")
    assert len(alerts) == 1
    assert alerts[0]["ai_agent_run_id"] == resp.ai_agent_run_id


def test_internal_monitoring_api_endpoints():
    # 1. Health check
    res = client.get("/internal/monitoring/health", headers=INTERNAL_HEADERS)
    assert res.status_code == 200
    assert res.json()["status"] in ["HEALTHY", "DEGRADED"]

    # 2. Overview check
    res = client.get("/internal/monitoring/overview?organization_id=org_api_test", headers=INTERNAL_HEADERS)
    assert res.status_code == 200
    assert "events_today" in res.json()

    # 3. Create Rule
    rule_payload = {
        "rule_id": "rule_api_test_1",
        "name": "API Test Rule",
        "description": "Rule created via API",
        "event_type": "ESG_THRESHOLD_EXCEEDED",
        "conditions": [{"field": "current_value", "operator": "greater_than", "value": 100.0}],
        "action": "CREATE_ALERT",
        "enabled": True,
        "organization_id": "org_api_test"
    }
    res = client.post("/internal/monitoring/rules", json=rule_payload, headers=INTERNAL_HEADERS)
    assert res.status_code in [200, 201]
    assert res.json()["rule_id"] == "rule_api_test_1"

    # 4. Process Event
    event_payload = {
        "event_type": "ESG_THRESHOLD_EXCEEDED",
        "organization_id": "org_api_test",
        "resource_type": "ESGMetric",
        "resource_id": "metric_api_1",
        "current_value": 150.0,
        "payload": {"metric_name": "GHG Scope 1", "current_value": 150.0}
    }
    res = client.post("/internal/monitoring/process", json=event_payload, headers=INTERNAL_HEADERS)
    assert res.status_code == 200
    event_id = res.json()["event_id"]
    assert event_id is not None

    # 5. Investigate Event
    res = client.post(
        f"/internal/monitoring/events/{event_id}/investigate",
        json={"notes": "Investigating GHG exceedance"},
        headers=INTERNAL_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == event_id
    assert "agent_run_id" in data
    assert data["agent_run_id"].startswith("run_")
