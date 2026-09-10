"""
Internal AI Model Gateway API Endpoints
Phase 17: AI Risk Platform 2.0
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.gateway import default_ai_gateway

router = APIRouter()


class RoutePromptRequest(BaseModel):
    system_prompt: str = Field(..., description="System prompt instructions")
    user_prompt: str = Field(..., description="User prompt context")
    policy: str = Field("LOW_COST", description="Routing policy: LOW_COST, LOW_LATENCY, HIGH_QUALITY, TASK_SPECIFIC")
    task_type: Optional[str] = Field(None, description="Task classification e.g. executive_briefing, anomaly_classification")
    preferred_provider: Optional[str] = None
    preferred_model: Optional[str] = None


@router.post("/route")
async def route_ai_request(request: RoutePromptRequest):
    """Routes an AI request through the provider-independent gateway."""
    return default_ai_gateway.generate(
        system_prompt=request.system_prompt,
        user_prompt=request.user_prompt,
        policy=request.policy,
        task_type=request.task_type,
        preferred_provider=request.preferred_provider,
        preferred_model=request.preferred_model,
    )


@router.get("/status")
async def get_gateway_status():
    """Returns runtime gateway health, active providers, and request metrics."""
    return default_ai_gateway.get_status()
