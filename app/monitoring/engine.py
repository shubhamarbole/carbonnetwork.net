"""
Monitoring Engine Core
Manages the evaluation pipeline, deduplication, alert dispatching,
and Phase 5 Agent autonomous trigger integration.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.monitoring import (
    EventStatus,
    MonitoredEventType,
    MonitoringAlertResponse,
    MonitoringEventCreate,
    MonitoringEventResponse,
    MonitoringHealthResponse,
    MonitoringHealthStatus,
    MonitoringOverviewResponse,
    MonitoringRuleCreate,
    MonitoringRuleResponse,
    MonitoringRunResponse,
    MonitoringRunStatus,
    RuleAction,
)
from app.monitoring.fingerprint import default_fingerprint_manager, FingerprintManager
from app.monitoring.evaluator import default_rule_evaluator, RuleEvaluator
from app.agents.orchestrator import default_orchestrator
from app.schemas.agent import AgentRunRequest, UserContext

logger = logging.getLogger("monitoring_engine")


class MonitoringEngine:
    """Core proactive monitoring engine executing deterministic checks, alerts, and AI triggers."""

    def __init__(
        self,
        fingerprint_manager: Optional[FingerprintManager] = None,
        rule_evaluator: Optional[RuleEvaluator] = None
    ):
        self.fingerprint_mgr = fingerprint_manager or default_fingerprint_manager
        self.evaluator = rule_evaluator or default_rule_evaluator

        # In-memory stores (synced with DB in API layer)
        self.rules: Dict[str, MonitoringRuleResponse] = {}
        self.events: Dict[str, MonitoringEventResponse] = {}
        self.alerts: List[Dict[str, Any]] = []
        self.runs: List[MonitoringRunResponse] = []

        # Operational metrics
        self.total_processed: int = 0
        self.total_failed: int = 0
        self.total_ai_triggers: int = 0
        self.last_run_time: Optional[str] = None
        self.last_run_duration_ms: float = 0.0

    def register_rule(self, rule_data: MonitoringRuleCreate, created_by: str = "System") -> MonitoringRuleResponse:
        """Registers a rule for deterministic condition matching."""
        rule_id = rule_data.rule_id or f"rule_{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow().isoformat()

        rule_resp = MonitoringRuleResponse(
            rule_id=rule_id,
            name=rule_data.name,
            description=rule_data.description,
            event_type=rule_data.event_type,
            conditions=rule_data.conditions,
            action=rule_data.action,
            enabled=rule_data.enabled,
            organization_id=rule_data.organization_id,
            project_id=rule_data.project_id,
            created_by=created_by,
            created_at=now,
            updated_at=now
        )
        self.rules[rule_id] = rule_resp
        return rule_resp

    def evaluate_event(
        self,
        event_create: MonitoringEventCreate,
        active_rules: Optional[List[MonitoringRuleResponse]] = None
    ) -> Tuple[MonitoringEventResponse, List[Dict[str, Any]]]:
        """
        Evaluates a detected event:
        1. Computes deterministic SHA-256 fingerprint.
        2. Deduplicates against sliding window (ignores duplicates).
        3. Matches against active rules.
        4. Executes actions (Alert / AI Agent / Log).
        """
        event_id = event_create.event_id or f"evt_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.utcnow().isoformat()

        # Step 1: Compute deterministic SHA-256 fingerprint
        fp = event_create.fingerprint or self.fingerprint_mgr.generate_fingerprint(
            resource_id=event_create.resource_id,
            event_type=event_create.event_type.value if hasattr(event_create.event_type, "value") else str(event_create.event_type)
        )

        # Step 2: Deduplication check
        if self.fingerprint_mgr.is_duplicate(fp):
            logger.info(f"Duplicate event suppressed by fingerprint {fp[:10]}... for resource {event_create.resource_id}")
            ignored_evt = MonitoringEventResponse(
                event_id=event_id,
                event_type=event_create.event_type,
                organization_id=event_create.organization_id,
                project_id=event_create.project_id,
                resource_type=event_create.resource_type,
                resource_id=event_create.resource_id,
                previous_value=event_create.previous_value,
                current_value=event_create.current_value,
                payload=event_create.payload,
                source=event_create.source,
                fingerprint=fp,
                status=EventStatus.IGNORED,
                detected_at=now_iso,
                processed_at=now_iso
            )
            self.events[event_id] = ignored_evt
            return ignored_evt, []

        # Record new fingerprint
        self.fingerprint_mgr.record_fingerprint(fp)

        # Candidate rules
        rules_to_check = active_rules if active_rules is not None else [
            r for r in self.rules.values() if r.enabled and r.organization_id == event_create.organization_id
        ]

        event_dict = event_create.dict()
        event_dict["event_type"] = event_create.event_type.value if hasattr(event_create.event_type, "value") else str(event_create.event_type)

        matched_rule: Optional[MonitoringRuleResponse] = None
        reasons_list: List[str] = []

        for rule in rules_to_check:
            matched, reasons = self.evaluator.evaluate_rule(rule, event_dict)
            if matched:
                matched_rule = rule
                reasons_list = reasons
                break

        created_alerts = []
        ai_agent_run_id = None
        action_to_take = matched_rule.action if matched_rule else RuleAction.LOG_ONLY

        try:
            # Action: CREATE_ALERT
            if action_to_take == RuleAction.CREATE_ALERT:
                alert_item = {
                    "alert_id": f"alt_{uuid.uuid4().hex[:10]}",
                    "organization_id": event_create.organization_id,
                    "project_id": event_create.project_id,
                    "event_id": event_id,
                    "rule_id": matched_rule.rule_id if matched_rule else None,
                    "title": f"Monitoring Alert: {event_create.event_type.value if hasattr(event_create.event_type, 'value') else event_create.event_type}",
                    "severity": self._derive_severity(event_create),
                    "message": f"Event detected on {event_create.resource_type} ({event_create.resource_id}): {', '.join(reasons_list) if reasons_list else 'Rule matched'}",
                    "created_at": now_iso
                }
                self.alerts.append(alert_item)
                created_alerts.append(alert_item)

            # Action: TRIGGER_AI_ANALYSIS or TRIGGER_AI_AGENT
            elif action_to_take in [RuleAction.TRIGGER_AI_ANALYSIS, RuleAction.TRIGGER_AI_AGENT]:
                ai_agent_run_id = self._trigger_agent_investigation(event_create, matched_rule)
                self.total_ai_triggers += 1

                # Also record an alert highlighting that an AI investigation was triggered
                alert_item = {
                    "alert_id": f"alt_{uuid.uuid4().hex[:10]}",
                    "organization_id": event_create.organization_id,
                    "project_id": event_create.project_id,
                    "event_id": event_id,
                    "rule_id": matched_rule.rule_id if matched_rule else None,
                    "title": f"AI Investigation Triggered: {event_create.event_type.value if hasattr(event_create.event_type, 'value') else event_create.event_type}",
                    "severity": "HIGH",
                    "message": f"Autonomous agent investigation initiated (Run ID: {ai_agent_run_id})",
                    "ai_agent_run_id": ai_agent_run_id,
                    "created_at": now_iso
                }
                self.alerts.append(alert_item)
                created_alerts.append(alert_item)

            final_status = EventStatus.PROCESSED
            self.total_processed += 1

        except Exception as ex:
            logger.error(f"Error handling event actions: {ex}")
            final_status = EventStatus.FAILED
            self.total_failed += 1

        resp = MonitoringEventResponse(
            event_id=event_id,
            event_type=event_create.event_type,
            organization_id=event_create.organization_id,
            project_id=event_create.project_id,
            resource_type=event_create.resource_type,
            resource_id=event_create.resource_id,
            previous_value=event_create.previous_value,
            current_value=event_create.current_value,
            payload=event_create.payload,
            source=event_create.source,
            fingerprint=fp,
            status=final_status,
            detected_at=now_iso,
            processed_at=datetime.utcnow().isoformat(),
            ai_agent_run_id=ai_agent_run_id,
            rule_id=matched_rule.rule_id if matched_rule else None
        )
        self.events[event_id] = resp
        return resp, created_alerts

    def process_batch(
        self,
        events: List[MonitoringEventCreate],
        active_rules: Optional[List[MonitoringRuleResponse]] = None
    ) -> MonitoringRunResponse:
        """Processes a batch of detected events (e.g. from a periodic or on-demand sweep)."""
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        start_time = time.time()
        now_iso = datetime.utcnow().isoformat()

        processed_count = 0
        failed_count = 0
        ai_triggers_count = 0

        for evt in events:
            try:
                resp, alerts = self.evaluate_event(evt, active_rules=active_rules)
                if resp.status == EventStatus.FAILED:
                    failed_count += 1
                elif resp.status in [EventStatus.PROCESSED, EventStatus.IGNORED]:
                    processed_count += 1
                if resp.ai_agent_run_id:
                    ai_triggers_count += 1
            except Exception as e:
                logger.error(f"Batch processing failed for event {evt.resource_id}: {e}")
                failed_count += 1

        duration_ms = (time.time() - start_time) * 1000.0
        self.last_run_time = datetime.utcnow().isoformat()
        self.last_run_duration_ms = duration_ms

        status = MonitoringRunStatus.COMPLETED if failed_count == 0 else (
            MonitoringRunStatus.PARTIAL_FAILURE if processed_count > 0 else MonitoringRunStatus.FAILED
        )

        run_resp = MonitoringRunResponse(
            run_id=run_id,
            started_at=now_iso,
            completed_at=self.last_run_time,
            events_processed=processed_count,
            events_failed=failed_count,
            ai_triggers=ai_triggers_count,
            status=status,
            metadata={"duration_ms": round(duration_ms, 2), "total_events": len(events)}
        )
        self.runs.append(run_resp)
        return run_resp

    def trigger_manual_investigation(
        self,
        event_id: str,
        user_id: str = "user_manual",
        notes: Optional[str] = None
    ) -> str:
        """Triggers on-demand AI investigation for a specific event."""
        event = self.events.get(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found.")

        # Construct synthetic rule with TRIGGER_AI_AGENT action
        synthetic_rule = MonitoringRuleResponse(
            rule_id=f"manual_inv_{event_id}",
            name="Manual AI Investigation",
            description=notes or "Operator initiated investigation",
            event_type=event.event_type,
            conditions=[],
            action=RuleAction.TRIGGER_AI_AGENT,
            enabled=True,
            organization_id=event.organization_id,
            project_id=event.project_id,
            created_by=user_id,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )

        evt_create = MonitoringEventCreate(
            event_type=event.event_type,
            organization_id=event.organization_id,
            project_id=event.project_id,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            previous_value=event.previous_value,
            current_value=event.current_value,
            payload=event.payload,
            source="ManualInvestigation"
        )

        run_id = self._trigger_agent_investigation(evt_create, synthetic_rule, user_id=user_id)
        # Update event record with agent run ID
        self.events[event_id] = MonitoringEventResponse(
            event_id=event.event_id,
            event_type=event.event_type,
            organization_id=event.organization_id,
            project_id=event.project_id,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            previous_value=event.previous_value,
            current_value=event.current_value,
            payload=event.payload,
            source=event.source,
            fingerprint=event.fingerprint,
            status=event.status,
            detected_at=event.detected_at,
            processed_at=datetime.utcnow().isoformat(),
            ai_agent_run_id=run_id,
            rule_id=event.rule_id
        )
        self.total_ai_triggers += 1
        return run_id

    def _trigger_agent_investigation(
        self,
        event: MonitoringEventCreate,
        rule: Optional[MonitoringRuleResponse] = None,
        user_id: str = "monitoring_engine"
    ) -> str:
        """Dispatches an autonomous Phase 5 AI Agent run with strict tenant boundaries."""
        event_name = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
        goal = (
            f"Proactive Monitoring detected event '{event_name}' on {event.resource_type} "
            f"(ID: {event.resource_id}). "
            f"Current value: {event.current_value}, Previous value: {event.previous_value}. "
            f"Context: {event.payload}. "
            f"Investigate the root cause, determine business risk exposure, and propose concrete mitigation steps."
        )

        user_ctx = UserContext(
            user_id=user_id,
            organization_id=event.organization_id,
            role="ESG_MANAGER",
            permissions=["read:risks", "read:compliance", "read:metrics", "propose:actions"]
        )

        req = AgentRunRequest(
            goal=goal,
            user_context=user_ctx
        )

        # Run Phase 5 Agent Orchestrator (step limits <= 10 and HITL approvals enforced)
        agent_res = default_orchestrator.run(req)
        logger.info(f"Triggered Agent run {agent_res.agent_run_id} for event on {event.resource_id}. Status: {agent_res.status}")
        return agent_res.agent_run_id

    def _derive_severity(self, event: MonitoringEventCreate) -> str:
        """Derives alert severity level from event metadata deterministically."""
        sev = (event.payload or {}).get("current_severity") or (event.payload or {}).get("severity")
        if sev:
            return str(sev).upper()
        ev_str = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
        if "MISSED" in ev_str or "CRITICAL" in ev_str or "EXCEEDED" in ev_str:
            return "HIGH"
        if "APPROACHING" in ev_str or "CHANGED" in ev_str or "INCREASED" in ev_str:
            return "MEDIUM"
        return "LOW"

    def get_health(self) -> MonitoringHealthResponse:
        """Returns health telemetry for the monitoring engine."""
        status = MonitoringHealthStatus.HEALTHY
        if self.total_failed > 0 and self.total_processed == 0:
            status = MonitoringHealthStatus.FAILED
        elif self.total_failed > (self.total_processed * 0.2):
            status = MonitoringHealthStatus.DEGRADED

        return MonitoringHealthResponse(
            status=status,
            last_successful_run=self.last_run_time,
            last_run_duration_ms=self.last_run_duration_ms,
            events_processed=self.total_processed,
            events_failed=self.total_failed,
            ai_triggers=self.total_ai_triggers,
            active_rules=len([r for r in self.rules.values() if r.enabled])
        )

    def get_overview(self, organization_id: Optional[str] = None) -> MonitoringOverviewResponse:
        """Aggregates overview statistics for the monitoring dashboard."""
        events_list = list(self.events.values())
        rules_list = list(self.rules.values())
        alerts_list = self.alerts

        if organization_id:
            events_list = [e for e in events_list if e.organization_id == organization_id]
            rules_list = [r for r in rules_list if r.organization_id == organization_id]
            alerts_list = [a for a in alerts_list if a.get("organization_id") == organization_id]

        critical = len([
            e for e in events_list
            if (e.payload or {}).get("current_severity") in ["CRITICAL", "HIGH"]
            or "MISSED" in str(e.event_type)
        ])

        return MonitoringOverviewResponse(
            events_today=len(events_list),
            active_rules=len([r for r in rules_list if r.enabled]),
            triggered_alerts=len(alerts_list),
            ai_investigations=len([e for e in events_list if e.ai_agent_run_id is not None]),
            critical_events=critical,
            failed_events=len([e for e in events_list if e.status == EventStatus.FAILED]),
            last_run=self.last_run_time,
            monitoring_status=MonitoringHealthStatus.HEALTHY
        )


default_monitoring_engine = MonitoringEngine()
