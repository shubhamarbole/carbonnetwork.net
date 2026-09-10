"""
Scenario Event and Alert Simulator
Determines potential Phase 6 monitoring events and Phase 7 alerts triggered under simulated conditions.
GUARANTEE: All emitted simulated records are explicitly flagged with `simulation: True`.
"""

from typing import Any, Dict, List, Optional, Tuple
from app.schemas.scenario import AffectedRiskItem, PotentialSimulatedEvent, ScenarioType


def simulate_potential_events_and_alerts(
    affected_risks: List[AffectedRiskItem],
    scenario_type: ScenarioType
) -> Tuple[List[PotentialSimulatedEvent], List[Dict[str, Any]]]:
    """
    Evaluates affected risks to project what events and alerts would occur.
    """
    events: List[PotentialSimulatedEvent] = []
    alerts: List[Dict[str, Any]] = []

    for item in affected_risks:
        # Event: Escalation to CRITICAL
        if item.projected_severity == "CRITICAL" and item.baseline_severity != "CRITICAL":
            events.append(PotentialSimulatedEvent(
                event_type="RISK_ESCALATED",
                title=f"[SIMULATION] Critical Risk Escalation: {item.title}",
                description=f"Simulated {scenario_type.value} pushes risk score to {item.projected_score} (CRITICAL).",
                severity="CRITICAL",
                simulation=True
            ))
            alerts.append({
                "title": f"[SIMULATED ALERT] Risk Escalated to CRITICAL: {item.title}",
                "severity": "CRITICAL",
                "risk_id": item.risk_id,
                "projected_score": item.projected_score,
                "simulation": True,
                "recommended_action": "Review and pre-approve emergency mitigation workflows."
            })

        # Event: Score shift > 15 points
        elif abs(item.score_delta) >= 15.0:
            ev_type = "RISK_SCORE_CHANGED"
            events.append(PotentialSimulatedEvent(
                event_type=ev_type,
                title=f"[SIMULATION] Significant Risk Shift: {item.title}",
                description=f"Score delta of {item.score_delta:+.2f} points observed under {scenario_type.value}.",
                severity=item.projected_severity,
                simulation=True
            ))

    # Scenario-wide domain potential events
    if scenario_type == ScenarioType.CARBON_INCREASE:
        events.append(PotentialSimulatedEvent(
            event_type="CARBON_THRESHOLD_EXCEEDED",
            title="[SIMULATION] Projected Scope 2 Emissions Exceedance",
            description="Scenario carbon increase breaches internal SBTi quarterly carbon budget.",
            severity="HIGH",
            simulation=True
        ))
    elif scenario_type == ScenarioType.COMPLIANCE_DELAY:
        events.append(PotentialSimulatedEvent(
            event_type="COMPLIANCE_DEADLINE_APPROACHING",
            title="[SIMULATION] Filing Penalty Exposure",
            description="Projected filing delay crosses statutory penalty threshold for EU CBAM/CSRD.",
            severity="HIGH",
            simulation=True
        ))
    elif scenario_type == ScenarioType.SUPPLIER_FAILURE:
        events.append(PotentialSimulatedEvent(
            event_type="SUPPLIER_RISK_INCREASED",
            title="[SIMULATION] Tier-1 Supply Chain Disruption",
            description="Vendor failure impacts delivery of verified carbon offsets.",
            severity="HIGH",
            simulation=True
        ))

    return events, alerts
