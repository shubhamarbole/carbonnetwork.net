"""
Risk Domain Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    ListRisksInput,
    GetRiskInput,
    GetRiskHistoryInput,
    GetProjectRisksInput
)
from app.tools.registry import default_tool_registry


def register_risk_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="list_risks",
            description="List authorized risk records for the tenant organization, with optional filtering by category or severity.",
            input_schema=ListRisksInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_risk",
            description="Retrieve an authoritative risk record by risk_id including its Phase 2 deterministic risk score.",
            input_schema=GetRiskInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_risk_history",
            description="Retrieve historical score calculation transitions and audit milestones for a specific risk.",
            input_schema=GetRiskHistoryInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_project_risks",
            description="Retrieve all risks associated with a specific decarbonization or ESG project.",
            input_schema=GetProjectRisksInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )
