"""
Internal Tool Registry Endpoints
Phase 17: AI Risk Platform 2.0
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.tools import default_tool_registry

router = APIRouter()


class ToolItemResponse(BaseModel):
    name: str
    version: str
    category: str
    description: str
    risk_level: str
    permission_required: str
    requires_approval: bool
    enabled: bool


class ToggleToolRequest(BaseModel):
    enabled: bool = Field(..., description="Set true to enable or false to disable")


@router.get("/registry", response_model=List[ToolItemResponse])
async def list_registry_tools(category: Optional[str] = None):
    tools = default_tool_registry.list_tools(category)
    return [
        ToolItemResponse(
            name=t.name,
            version=t.version,
            category=t.category,
            description=t.description,
            risk_level=t.risk_level.value,
            permission_required=t.permission_required,
            requires_approval=t.requires_approval,
            enabled=t.enabled,
        )
        for t in tools
    ]


@router.patch("/{name}")
async def toggle_tool(name: str, req: ToggleToolRequest):
    success = default_tool_registry.set_tool_enabled(name, req.enabled)
    if not success:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found in registry")
    return {"success": True, "name": name, "enabled": req.enabled}
