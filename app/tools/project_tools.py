"""
Project Domain Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    GetProjectInput
)
from app.tools.registry import default_tool_registry


def register_project_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="get_project",
            description="Retrieve detailed specifications and decarbonization targets for a specific project.",
            input_schema=GetProjectInput,
            permission_required="dashboard.read",
            risk_level=ToolRiskLevel.READ
        )
    )
