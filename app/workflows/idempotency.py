"""
Idempotency Manager for Workflow Actions
Phase 7: Alerts + Workflow Automation

Ensures retried steps, duplicate evaluation, or repeated workflows never duplicate:
- Alerts
- Mitigations
- Tasks
- Notifications
- Assignments
"""

import hashlib
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("workflow.idempotency")


class IdempotencyManager:
    """Manages deterministic action fingerprints to guarantee idempotency across workflow execution."""

    def __init__(self):
        # Store: fingerprint -> execution result dict
        self._executed_actions: Dict[str, Dict[str, Any]] = {}

    def generate_fingerprint(
        self,
        instance_id: str,
        step_number: int,
        action_type: str,
        resource_id: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> str:
        """Computes deterministic SHA-256 fingerprint for a workflow action step."""
        clean_res = str(resource_id or "").strip()
        params_str = ""
        if params:
            try:
                params_str = json.dumps(params, sort_keys=True, default=str)
            except Exception:
                params_str = str(sorted(params.items()))

        raw_payload = f"{instance_id}::{step_number}::{action_type}::{clean_res}::{params_str}"
        return hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

    def generate_entity_fingerprint(
        self,
        entity_type: str,
        org_id: str,
        resource_id: str,
        unique_key: str
    ) -> str:
        """Generates fingerprint for deduplicating alerts or mitigations directly."""
        raw = f"{entity_type}::{org_id}::{resource_id}::{unique_key}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def has_executed(self, fingerprint: str) -> bool:
        """Checks if the action fingerprint has already been executed."""
        return fingerprint in self._executed_actions

    def record_execution(self, fingerprint: str, result_data: Optional[Dict[str, Any]] = None) -> None:
        """Records that an action has been executed."""
        self._executed_actions[fingerprint] = result_data or {"status": "COMPLETED"}
        logger.debug(f"Recorded action fingerprint execution: {fingerprint[:12]}...")

    def get_execution_result(self, fingerprint: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached result of previously executed action."""
        return self._executed_actions.get(fingerprint)

    def clear(self) -> None:
        """Clears cache (for testing)."""
        self._executed_actions.clear()


# Default singleton
default_idempotency_manager = IdempotencyManager()
