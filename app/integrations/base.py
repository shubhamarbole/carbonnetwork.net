"""
Integration Adapter Abstract Base Class
Phase 10: Extensible architecture for real external ESG & Carbon data connectors.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.integration import IntegrationProviderType


class IntegrationAdapter(ABC):
    """
    Standardized interface that all external ESG/Carbon data adapters must implement.
    Decouples core business logic from external schema variations and protocols.
    """
    adapter_name: str
    provider_type: IntegrationProviderType
    supported_metrics: List[str]

    @abstractmethod
    def connect(self, config: Dict[str, Any]) -> bool:
        """Establish live connection or authenticate with remote provider."""
        pass

    @abstractmethod
    def test_connection(self, config: Dict[str, Any]) -> Tuple[bool, str]:
        """Verify credentials, API endpoints, and connectivity."""
        pass

    @abstractmethod
    def fetch_data(self, sync_type: str = "INCREMENTAL", since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Fetch raw payloads from remote provider."""
        pass

    @abstractmethod
    def fetch_incremental(self, since: datetime) -> List[Dict[str, Any]]:
        """Fetch payloads newer than `since` timestamp."""
        pass

    @abstractmethod
    def fetch_full(self) -> List[Dict[str, Any]]:
        """Fetch complete historical dataset."""
        pass

    @abstractmethod
    def normalize(
        self,
        raw_data: List[Dict[str, Any]],
        organization_id: str,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Transform raw provider records into normalized schema items."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Inspect adapter status, rate limits, and latency."""
        pass
