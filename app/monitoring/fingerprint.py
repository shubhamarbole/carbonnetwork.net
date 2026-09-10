"""
Event Fingerprinting and Deduplication Engine
Generates deterministic SHA-256 fingerprints to ensure idempotency
and prevent alert flooding across recurring monitoring cycles.
Phase 6: Proactive Monitoring & Event Detection
"""

import hashlib
import time
from datetime import datetime
from typing import Dict, Optional, Set


class FingerprintManager:
    """Manages deterministic event fingerprinting and sliding-window deduplication."""

    def __init__(self, window_hours: int = 24):
        self.window_hours = window_hours
        # Store fingerprints with their expiration timestamp
        self._seen_fingerprints: Dict[str, float] = {}

    def generate_fingerprint(
        self,
        resource_id: str,
        event_type: str,
        rule_or_threshold: Optional[str] = None,
        time_window: Optional[str] = None
    ) -> str:
        """
        Computes deterministic SHA-256 fingerprint:
        SHA256(resource_id : event_type : rule_or_threshold : time_window)
        """
        window = time_window or datetime.utcnow().strftime("%Y-%m-%d")
        rule_tag = str(rule_or_threshold or "default")
        
        raw_key = f"{resource_id}:{event_type}:{rule_tag}:{window}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def is_duplicate(self, fingerprint: str) -> bool:
        """Checks whether fingerprint is currently active in the deduplication window."""
        self._prune_expired()
        return fingerprint in self._seen_fingerprints

    def record_fingerprint(self, fingerprint: str) -> None:
        """Records fingerprint with expiration in the deduplication cache."""
        expires_at = time.time() + (self.window_hours * 3600)
        self._seen_fingerprints[fingerprint] = expires_at

    def clear(self) -> None:
        """Clears cache (used primarily for test isolation)."""
        self._seen_fingerprints.clear()

    def _prune_expired(self) -> None:
        now = time.time()
        expired_keys = [k for k, exp in self._seen_fingerprints.items() if exp < now]
        for k in expired_keys:
            del self._seen_fingerprints[k]


default_fingerprint_manager = FingerprintManager()
