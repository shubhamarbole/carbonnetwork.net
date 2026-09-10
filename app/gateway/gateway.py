"""
AI Model Gateway Facade
Phase 17: AI Risk Platform 2.0
"""

from typing import Any, Dict, Optional
from app.gateway.model_router import ModelRouter, RoutingPolicy, default_model_router


class AIGateway:
    """Enterprise AI Model Gateway providing policy routing, failover, and metrics."""

    def __init__(self, router: Optional[ModelRouter] = None):
        self.router = router or default_model_router
        self._total_requests = 0
        self._total_cost_usd = 0.0

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        policy: str = "LOW_COST",
        task_type: Optional[str] = None,
        preferred_provider: Optional[str] = None,
        preferred_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            policy_enum = RoutingPolicy(policy)
        except Exception:
            policy_enum = RoutingPolicy.LOW_COST

        result = self.router.route_request(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            policy=policy_enum,
            task_type=task_type,
            preferred_provider=preferred_provider,
            preferred_model=preferred_model,
        )

        self._total_requests += 1
        self._total_cost_usd += result.get("estimated_cost_usd", 0.0)

        return result

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "HEALTHY",
            "version": "ai-gateway-v2.0",
            "active_providers": list(self.router.adapters.keys()),
            "supported_policies": [p.value for p in RoutingPolicy],
            "total_requests_routed": self._total_requests,
            "accumulated_cost_usd": round(self._total_cost_usd, 6),
        }


default_ai_gateway = AIGateway()
