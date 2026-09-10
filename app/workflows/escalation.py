"""
Workflow Deadline & Escalation Engine
Phase 7: Alerts + Workflow Automation

Evaluates deadlines and triggers configured escalations:
- 75% elapsed: Warning
- 100% elapsed: Overdue
- +24 hours past deadline: Manager escalation
- +48 hours past deadline: Critical escalation

Guarantees duplicate escalation prevention per tier.
"""

from datetime import datetime, timedelta
import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("workflow.escalation")


class EscalationTier:
    NONE = "NONE"
    WARNING = "WARNING"
    OVERDUE = "OVERDUE"
    MANAGER_ESCALATED = "MANAGER_ESCALATED"
    CRITICAL_ESCALATED = "CRITICAL_ESCALATED"


class EscalationEngine:
    """Calculates deadline states and executes multi-tier escalations idempotently."""

    @staticmethod
    def calculate_deadline(
        started_at: Optional[datetime] = None,
        duration_hours: float = 24.0,
        warning_pct: float = 75.0
    ) -> Dict[str, Any]:
        """Calculates due_at, warning_at, and overdue_at ISO timestamps."""
        start = started_at or datetime.utcnow()
        due = start + timedelta(hours=duration_hours)
        warning_delta = timedelta(hours=duration_hours * (warning_pct / 100.0))
        warning = start + warning_delta

        return {
            "started_at": start.isoformat(),
            "due_at": due.isoformat(),
            "warning_at": warning.isoformat(),
            "overdue_at": due.isoformat(),
            "duration_hours": duration_hours,
            "warning_pct": warning_pct,
            "current_tier": EscalationTier.NONE,
            "escalated_tiers": []
        }

    @staticmethod
    def evaluate_escalation(
        deadline_info: Dict[str, Any],
        now: Optional[datetime] = None,
        manager_escalation_hours: float = 24.0,
        critical_escalation_hours: float = 48.0
    ) -> Tuple[str, bool, str]:
        """
        Evaluates current status against deadline:
        Returns (new_tier, should_escalate, reason).
        Duplicate escalations are prevented if already in escalated_tiers.
        """
        curr_time = now or datetime.utcnow()
        escalated_tiers = deadline_info.get("escalated_tiers", [])

        try:
            due_dt = datetime.fromisoformat(deadline_info["due_at"])
            start_dt = datetime.fromisoformat(deadline_info.get("started_at", curr_time.isoformat()))
        except Exception:
            return EscalationTier.NONE, False, "Invalid deadline timestamps"

        total_duration = (due_dt - start_dt).total_seconds()
        elapsed = (curr_time - start_dt).total_seconds()
        pct_elapsed = (elapsed / total_duration * 100.0) if total_duration > 0 else 100.0

        # +48 hours past due
        critical_thresh = due_dt + timedelta(hours=critical_escalation_hours)
        if curr_time >= critical_thresh:
            tier = EscalationTier.CRITICAL_ESCALATED
            if tier not in escalated_tiers:
                return tier, True, f"Workflow critical escalation: {critical_escalation_hours}h past deadline"
            return deadline_info.get("current_tier", tier), False, "Already critical escalated"

        # +24 hours past due
        manager_thresh = due_dt + timedelta(hours=manager_escalation_hours)
        if curr_time >= manager_thresh:
            tier = EscalationTier.MANAGER_ESCALATED
            if tier not in escalated_tiers:
                return tier, True, f"Workflow manager escalation: {manager_escalation_hours}h past deadline"
            return deadline_info.get("current_tier", tier), False, "Already manager escalated"

        # 100% past due (Overdue)
        if curr_time >= due_dt:
            tier = EscalationTier.OVERDUE
            if tier not in escalated_tiers:
                return tier, True, f"Workflow deadline passed (due {deadline_info['due_at']})"
            return deadline_info.get("current_tier", tier), False, "Already overdue and escalated"

        # Warning threshold (default 75%)
        warn_pct = deadline_info.get("warning_pct", 75.0)
        if pct_elapsed >= warn_pct:
            tier = EscalationTier.WARNING
            if tier not in escalated_tiers:
                return tier, True, f"Workflow deadline approaching: {pct_elapsed:.1f}% elapsed"
            return deadline_info.get("current_tier", tier), False, "Already warned"

        return deadline_info.get("current_tier", EscalationTier.NONE), False, "Within normal operational window"


default_escalation_engine = EscalationEngine()
