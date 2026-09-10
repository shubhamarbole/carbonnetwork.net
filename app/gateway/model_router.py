"""
AI Model Routing Policies and Fallback Dispatcher
Phase 17: AI Risk Platform 2.0
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from app.gateway.provider_adapters import (
    BaseProviderAdapter,
    GeminiProviderAdapter,
    MockProviderAdapter,
    OpenAIProviderAdapter,
)


class RoutingPolicy(str, Enum):
    LOW_COST = "LOW_COST"
    LOW_LATENCY = "LOW_LATENCY"
    HIGH_QUALITY = "HIGH_QUALITY"
    TASK_SPECIFIC = "TASK_SPECIFIC"


class ModelRouter:
    def __init__(self):
        self.adapters: Dict[str, BaseProviderAdapter] = {
            "google_gemini": GeminiProviderAdapter(),
            "openai": OpenAIProviderAdapter(),
            "mock_deterministic": MockProviderAdapter(),
        }

    def resolve_model_and_provider(
        self,
        policy: RoutingPolicy,
        task_type: Optional[str] = None
    ) -> Dict[str, str]:
        """Resolves optimal model and provider based on the chosen routing policy."""
        if policy == RoutingPolicy.LOW_COST:
            return {"provider": "google_gemini", "model": "gemini-2.5-flash"}
        elif policy == RoutingPolicy.LOW_LATENCY:
            return {"provider": "google_gemini", "model": "gemini-2.5-flash"}
        elif policy == RoutingPolicy.HIGH_QUALITY:
            return {"provider": "google_gemini", "model": "gemini-2.5-pro"}
        elif policy == RoutingPolicy.TASK_SPECIFIC:
            if task_type == "executive_briefing":
                return {"provider": "google_gemini", "model": "gemini-2.5-pro"}
            elif task_type == "anomaly_classification":
                return {"provider": "google_gemini", "model": "gemini-2.5-flash"}
            return {"provider": "google_gemini", "model": "gemini-2.5-flash"}
        return {"provider": "google_gemini", "model": "gemini-2.5-flash"}

    def route_request(
        self,
        system_prompt: str,
        user_prompt: str,
        policy: RoutingPolicy = RoutingPolicy.BALANCED_OPTIMIZATION if hasattr(RoutingPolicy, 'BALANCED_OPTIMIZATION') else RoutingPolicy.LOW_COST,
        task_type: Optional[str] = None,
        preferred_provider: Optional[str] = None,
        preferred_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes model routing with automatic fallback chain:
        Primary Provider -> Secondary Provider -> Mock Fallback
        """
        spec = self.resolve_model_and_provider(policy, task_type)
        provider_name = preferred_provider or spec["provider"]
        model_name = preferred_model or spec["model"]

        fallback_chain = [provider_name, "mock_deterministic"]

        last_error = None
        for prov in fallback_chain:
            adapter = self.adapters.get(prov, self.adapters["mock_deterministic"])
            try:
                result = adapter.invoke(model_name, system_prompt, user_prompt)
                result["routing_policy"] = policy.value if hasattr(policy, 'value') else str(policy)
                result["task_type"] = task_type
                result["resolved_provider"] = prov
                result["resolved_model"] = model_name
                return result
            except Exception as err:
                last_error = err
                continue

        # Ultimate safety fallback
        mock = self.adapters["mock_deterministic"]
        fallback_res = mock.invoke("deterministic-evaluator-v1", system_prompt, user_prompt)
        fallback_res["routing_policy"] = policy.value if hasattr(policy, 'value') else str(policy)
        fallback_res["fallback_triggered"] = True
        return fallback_res


default_model_router = ModelRouter()
