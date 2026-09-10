"""
Monitoring Service
High-level service coordinating rule management, event evaluation,
default production rules, and sweep execution.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.schemas.monitoring import (
    MonitoredEventType,
    MonitoringEventCreate,
    MonitoringEventResponse,
    MonitoringHealthResponse,
    MonitoringOverviewResponse,
    MonitoringRuleCreate,
    MonitoringRuleResponse,
    MonitoringRuleUpdate,
    MonitoringRunResponse,
    RuleAction,
    RuleCondition,
    RuleOperator,
)
from app.monitoring.engine import default_monitoring_engine, MonitoringEngine
from app.monitoring.detectors import default_event_detector, EventDetector
from app.monitoring.scheduler import default_monitoring_scheduler, MonitoringScheduler

logger = logging.getLogger("monitoring_service")


class MonitoringService:
    """Service layer coordinating rules, detectors, engine, and scheduling."""

    def __init__(
        self,
        engine: Optional[MonitoringEngine] = None,
        detector: Optional[EventDetector] = None,
        scheduler: Optional[MonitoringScheduler] = None
    ):
        self.engine = engine or default_monitoring_engine
        self.detector = detector or default_event_detector
        self.scheduler = scheduler or default_monitoring_scheduler

        # Seed default rules
        self._seed_default_rules()

    def _seed_default_rules(self) -> None:
        """Seeds standard enterprise monitoring rules for default organizations."""
        default_rules = [
            MonitoringRuleCreate(
                rule_id="rule_risk_escalated_default",
                name="High/Critical Risk Escalation",
                description="Triggers AI analysis when any risk severity escalates to HIGH or CRITICAL",
                event_type=MonitoredEventType.RISK_ESCALATED,
                conditions=[
                    RuleCondition(
                        field="current_severity",
                        operator=RuleOperator.EQUALS,
                        value="HIGH"
                    )
                ],
                action=RuleAction.TRIGGER_AI_ANALYSIS,
                enabled=True,
                organization_id="org_default"
            ),
            MonitoringRuleCreate(
                rule_id="rule_compliance_approaching_default",
                name="Compliance Deadline Approaching",
                description="Creates an alert when compliance deadline is within 14 days",
                event_type=MonitoredEventType.COMPLIANCE_DEADLINE_APPROACHING,
                conditions=[
                    RuleCondition(
                        field="days_remaining",
                        operator=RuleOperator.LESS_THAN_OR_EQUAL,
                        value=14
                    )
                ],
                action=RuleAction.CREATE_ALERT,
                enabled=True,
                organization_id="org_default"
            ),
            MonitoringRuleCreate(
                rule_id="rule_carbon_target_deviation_default",
                name="Carbon Target Deviation Alert",
                description="Triggers AI investigation if carbon emissions exceed reduction targets by 10% or more",
                event_type=MonitoredEventType.CARBON_TARGET_DEVIATION,
                conditions=[
                    RuleCondition(
                        field="deviation_percentage",
                        operator=RuleOperator.GREATER_THAN_OR_EQUAL,
                        value=10.0
                    )
                ],
                action=RuleAction.TRIGGER_AI_AGENT,
                enabled=True,
                organization_id="org_default"
            )
        ]

        for r in default_rules:
            if r.rule_id not in self.engine.rules:
                self.engine.register_rule(r)

    # ==========================================
    # Rule Management
    # ==========================================

    def create_rule(self, rule_data: MonitoringRuleCreate, user_id: str = "System") -> MonitoringRuleResponse:
        """Registers a new monitoring rule with tenant scoping."""
        return self.engine.register_rule(rule_data, created_by=user_id)

    def get_rules(self, organization_id: str, project_id: Optional[str] = None) -> List[MonitoringRuleResponse]:
        """Lists active and inactive rules for an organization and optional project."""
        results = [
            r for r in self.engine.rules.values()
            if r.organization_id == organization_id or r.organization_id == "org_default"
        ]
        if project_id:
            results = [r for r in results if r.project_id is None or r.project_id == project_id]
        return results

    def get_rule_by_id(self, rule_id: str) -> Optional[MonitoringRuleResponse]:
        """Retrieves a rule by ID."""
        return self.engine.rules.get(rule_id)

    def update_rule(self, rule_id: str, updates: MonitoringRuleUpdate) -> Optional[MonitoringRuleResponse]:
        """Updates rule configuration."""
        existing = self.engine.rules.get(rule_id)
        if not existing:
            return None

        data = existing.dict()
        if updates.name is not None:
            data["name"] = updates.name
        if updates.description is not None:
            data["description"] = updates.description
        if updates.conditions is not None:
            data["conditions"] = updates.conditions
        if updates.action is not None:
            data["action"] = updates.action
        if updates.enabled is not None:
            data["enabled"] = updates.enabled
        if updates.project_id is not None:
            data["project_id"] = updates.project_id
        data["updated_at"] = datetime.utcnow().isoformat()

        updated_resp = MonitoringRuleResponse(**data)
        self.engine.rules[rule_id] = updated_resp
        return updated_resp

    def delete_rule(self, rule_id: str) -> bool:
        """Deletes a rule by ID."""
        if rule_id in self.engine.rules:
            del self.engine.rules[rule_id]
            return True
        return False

    # ==========================================
    # Event Evaluation & Sweeps
    # ==========================================

    def process_event(self, event_create: MonitoringEventCreate) -> MonitoringEventResponse:
        """Evaluates a single detected event through the monitoring engine."""
        resp, _ = self.engine.evaluate_event(event_create)
        return resp

    def process_batch(self, events: List[MonitoringEventCreate]) -> MonitoringRunResponse:
        """Evaluates a batch of detected events."""
        return self.engine.process_batch(events)

    def get_events(
        self,
        organization_id: str,
        project_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50
    ) -> List[MonitoringEventResponse]:
        """Lists events matching tenant and optional query filters."""
        results = [
            e for e in self.engine.events.values()
            if e.organization_id == organization_id or e.organization_id == "org_default"
        ]
        if project_id:
            results = [e for e in results if e.project_id == project_id]
        if event_type:
            results = [e for e in results if str(e.event_type) == event_type]

        # Sort newest first
        results.sort(key=lambda x: x.detected_at, reverse=True)
        return results[:limit]

    def get_event_by_id(self, event_id: str) -> Optional[MonitoringEventResponse]:
        """Fetches a specific event by ID."""
        return self.engine.events.get(event_id)

    def trigger_investigation(self, event_id: str, user_id: str = "operator", notes: Optional[str] = None) -> str:
        """Dispatches an on-demand AI investigation for an event."""
        return self.engine.trigger_manual_investigation(event_id, user_id=user_id, notes=notes)

    # ==========================================
    # Health & Metrics
    # ==========================================

    def get_health(self) -> MonitoringHealthResponse:
        """Returns health telemetry."""
        return self.engine.get_health()

    def get_overview(self, organization_id: Optional[str] = None) -> MonitoringOverviewResponse:
        """Returns overview dashboard statistics."""
        return self.engine.get_overview(organization_id=organization_id)


default_monitoring_service = MonitoringService()
