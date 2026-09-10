"""
Integration Adapter Registry
Manages registration, discovery, and instantiation of domain integration adapters.
"""

from typing import Any, Dict, List, Optional, Type
from app.integrations.base import IntegrationAdapter
from app.integrations.carbon.grid_utility_adapter import GridUtilityAdapter
from app.integrations.esg.gri_metrics_adapter import GriMetricsAdapter
from app.integrations.supplier.supply_chain_adapter import SupplyChainAdapter
from app.integrations.compliance.regulatory_feed_adapter import RegulatoryFeedAdapter
from app.integrations.project.carbon_registry_adapter import CarbonRegistryAdapter


class AdapterRegistry:
    """Thread-safe registry for external integration adapters."""
    _registry: Dict[str, Type[IntegrationAdapter]] = {}

    @classmethod
    def register(cls, adapter_cls: Type[IntegrationAdapter]):
        cls._registry[adapter_cls.adapter_name] = adapter_cls

    @classmethod
    def get_adapter(cls, adapter_name: str, config: Optional[Dict[str, Any]] = None) -> Optional[IntegrationAdapter]:
        adapter_cls = cls._registry.get(adapter_name)
        if not adapter_cls:
            return None
        return adapter_cls(config or {})

    @classmethod
    def list_available_adapters(cls) -> List[Dict[str, Any]]:
        return [
            {
                "adapter_name": name,
                "provider_type": adapter_cls.provider_type.value,
                "supported_metrics": adapter_cls.supported_metrics
            }
            for name, adapter_cls in cls._registry.items()
        ]


# Auto-register default adapters
AdapterRegistry.register(GridUtilityAdapter)
AdapterRegistry.register(GriMetricsAdapter)
AdapterRegistry.register(SupplyChainAdapter)
AdapterRegistry.register(RegulatoryFeedAdapter)
AdapterRegistry.register(CarbonRegistryAdapter)


def get_adapter_registry() -> Type[AdapterRegistry]:
    return AdapterRegistry
