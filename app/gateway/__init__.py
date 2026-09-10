"""
Phase 17: AI Model Gateway Module
"""

from app.gateway.gateway import AIGateway, default_ai_gateway
from app.gateway.model_router import ModelRouter, RoutingPolicy, default_model_router
from app.gateway.provider_adapters import (
    BaseProviderAdapter,
    GeminiProviderAdapter,
    MockProviderAdapter,
    OpenAIProviderAdapter,
)

__all__ = [
    "AIGateway",
    "default_ai_gateway",
    "ModelRouter",
    "default_model_router",
    "RoutingPolicy",
    "BaseProviderAdapter",
    "GeminiProviderAdapter",
    "OpenAIProviderAdapter",
    "MockProviderAdapter",
]
