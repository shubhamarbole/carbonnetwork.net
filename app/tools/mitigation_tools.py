"""
Mitigation and Action Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    GetMitigationPlanInput,
    CreateMitigationPlanInput,
    AssignRiskOwnerInput,
    UpdateMitigationStatusInput,
    CreateAlertInput
)
from app.tools.registry import default_tool_registry


def register_mitigation_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="get_mitigation_plan",
            description="Retrieve an active or proposed mitigation plan for a specific risk.",
            input_schema=GetMitigationPlanInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="create_mitigation_plan",
            description="Propose and create a structured remediation action plan for a verified risk. Requires human approval.",
            input_schema=CreateMitigationPlanInput,
            permission_required="risk.manage",
            risk_level=ToolRiskLevel.WRITE,
            requires_approval=True
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="assign_risk_owner",
            description="Assign or update the responsible owner for an identified risk. Requires human approval.",
            input_schema=AssignRiskOwnerInput,
            permission_required="risk.manage",
            risk_level=ToolRiskLevel.WRITE,
            requires_approval=True
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="update_mitigation_status",
            description="Transition the lifecycle status of a risk (e.g. to MITIGATION_IN_PROGRESS or MITIGATED). Requires human approval.",
            input_schema=UpdateMitigationStatusInput,
            permission_required="risk.manage",
            risk_level=ToolRiskLevel.WRITE,
            requires_approval=True
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="create_alert",
            description="Generate a system notification or warning alert regarding risk conditions. Critical alerts require human approval.",
            input_schema=CreateAlertInput,
            permission_required="risk.manage",
            risk_level=ToolRiskLevel.WRITE,
            requires_approval=True
        )
    )
