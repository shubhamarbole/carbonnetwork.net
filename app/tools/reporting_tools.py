"""
Reporting Domain Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    GenerateRiskReportInput
)
from app.tools.registry import default_tool_registry


def register_reporting_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="generate_risk_report",
            description="Generate a formatted audit report or executive summary of organizational risk exposures.",
            input_schema=GenerateRiskReportInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )
