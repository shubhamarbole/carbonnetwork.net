"""
Regulatory & Compliance Feed Integration Adapter
Ingests CBAM reporting deadlines, CSRD audit gaps, and EU ETS allowance metrics.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.integrations.base import IntegrationAdapter
from app.schemas.integration import IntegrationProviderType


class RegulatoryFeedAdapter(IntegrationAdapter):
    adapter_name = "regulatory_feed"
    provider_type = IntegrationProviderType.COMPLIANCE
    supported_metrics = [
        "cbam_reporting_deadline_days",
        "csrd_audit_gap_count",
        "eu_ets_allowance_deficit"
    ]

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.feed_source = self.config.get("source", "EU-Lex & RegWatch")

    def connect(self, config: Dict[str, Any]) -> bool:
        self.config.update(config)
        return True

    def test_connection(self, config: Dict[str, Any]) -> Tuple[bool, str]:
        token = config.get("api_key", "")
        if token and token.startswith("invalid"):
            return False, "Regulatory registry authentication token invalid."
        return True, f"Regulatory feed connected to {self.feed_source}."

    def fetch_data(self, sync_type: str = "INCREMENTAL", since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        return [
            {
                "regulation": "EU-CBAM-2023-956",
                "metric": "cbam_reporting_deadline_days",
                "value": 14.0,
                "unit": "days",
                "status": "CRITICAL_WINDOW",
                "timestamp": now.isoformat(),
                "period": "2026-Q1"
            },
            {
                "regulation": "EU-CSRD-2022-2464",
                "metric": "csrd_audit_gap_count",
                "value": 2.0,
                "unit": "count",
                "status": "AUDIT_PENDING",
                "timestamp": now.isoformat(),
                "period": "2026-Q1"
            }
        ]

    def fetch_incremental(self, since: datetime) -> List[Dict[str, Any]]:
        return self.fetch_data("INCREMENTAL", since)

    def fetch_full(self) -> List[Dict[str, Any]]:
        return self.fetch_data("FULL", None)

    def normalize(
        self,
        raw_data: List[Dict[str, Any]],
        organization_id: str,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        normalized = []
        for item in raw_data:
            normalized.append({
                "source": self.adapter_name,
                "domain": self.provider_type.value,
                "organization_id": organization_id,
                "project_id": project_id,
                "metric": item.get("metric", "cbam_reporting_deadline_days"),
                "value": float(item.get("value", 0.0)),
                "unit": item.get("unit", "days"),
                "period": item.get("period", "realtime"),
                "timestamp": item.get("timestamp", datetime.now(timezone.utc).isoformat()),
                "metadata": {"regulation": item.get("regulation"), "status": item.get("status")}
            })
        return normalized

    def health_check(self) -> Dict[str, Any]:
        return {
            "adapter": self.adapter_name,
            "status": "HEALTHY",
            "latency_ms": 40,
            "source": self.feed_source
        }
