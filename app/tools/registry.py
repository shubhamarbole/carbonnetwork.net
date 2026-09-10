"""
Centralized Tool Registry for AI Agent
Manages tool registration, input validation, permission checking,
and execution dispatching.
Phase 5: AI Agent + Tool Calling
"""

import logging
from typing import Any, Dict, List, Optional, Type
from pydantic import ValidationError

from app.schemas.agent import UserContext
from app.schemas.tools import ToolDefinition, ToolResult, ToolRiskLevel
from app.services.approval_service import default_approval_service
from app.services.tool_execution_service import default_tool_execution_service

logger = logging.getLogger("tool_registry")

# Role-permission mapping for fallback checking
ROLE_PERMISSIONS = {
    "SUPER_ADMIN": ["*"],
    "PLATFORM_ADMIN": ["*"],
    "ADMIN": ["*"],
    "ORGANIZATION_ADMIN": ["*"],
    "ESG_MANAGER": ["risk.read", "risk.manage", "dashboard.read", "energy.read", "ghg.read"],
    "ENVIRONMENTAL_MANAGER": ["risk.read", "risk.manage", "dashboard.read", "energy.read", "ghg.read"],
    "COMPLIANCE_MANAGER": ["risk.read", "risk.manage", "dashboard.read"],
    "PROJECT_MANAGER": ["risk.read", "risk.manage", "dashboard.read"],
    "AUDITOR": ["risk.read", "dashboard.read", "energy.read", "ghg.read"],
    "DATA_ENTRY": ["risk.read", "dashboard.read"],
    "VIEWER": ["risk.read", "dashboard.read"],
}


class ToolRegistryError(Exception):
    pass


class ToolNotFoundError(ToolRegistryError):
    pass


class ToolPermissionError(ToolRegistryError):
    pass


class ToolInputValidationError(ToolRegistryError):
    pass


class ToolRegistry:
    """Central registry of tools accessible to the AI Agent."""

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        """Registers a tool definition into the versioned platform registry."""
        # Auto-infer category if default
        if tool.category == "Risk":
            n = tool.name.lower()
            if "carbon" in n:
                tool.category = "Carbon"
            elif "esg" in n:
                tool.category = "ESG"
            elif "compliance" in n:
                tool.category = "Compliance"
            elif "project" in n:
                tool.category = "Project"
            elif "scenario" in n:
                tool.category = "Scenario"
            elif "decision" in n:
                tool.category = "Decision"
            elif "optimize" in n or "optimization" in n:
                tool.category = "Optimization"
            elif "report" in n:
                tool.category = "Reporting"
            elif "executive" in n or "briefing" in n:
                tool.category = "Executive"
            elif "supplier" in n:
                tool.category = "Supplier"

        self._tools[tool.name] = tool
        logger.info(f"Registered versioned tool: {tool.name} v{tool.version} [{tool.category}] [{tool.risk_level.value}]")

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools(self, category: Optional[str] = None) -> List[ToolDefinition]:
        tools = list(self._tools.values())
        if category:
            tools = [t for t in tools if t.category.lower() == category.lower()]
        return tools

    def set_tool_enabled(self, name: str, enabled: bool) -> bool:
        """Enables or disables tool execution."""
        tool = self.get_tool(name)
        if not tool:
            return False
        tool.enabled = enabled
        return True

    def get_tools_manifest(self) -> List[Dict[str, Any]]:
        """Returns JSON-serializable tool descriptors for enabled tools."""
        manifest = []
        for tool in self._tools.values():
            if not tool.enabled:
                continue
            params = {}
            if hasattr(tool.input_schema, "model_json_schema"):
                json_schema = tool.input_schema.model_json_schema()
                params = {
                    "properties": json_schema.get("properties", {}),
                    "required": json_schema.get("required", [])
                }
            elif hasattr(tool.input_schema, "schema"):
                json_schema = tool.input_schema.schema()
                params = {
                    "properties": json_schema.get("properties", {}),
                    "required": json_schema.get("required", [])
                }

            manifest.append({
                "name": tool.name,
                "version": tool.version,
                "category": tool.category,
                "description": tool.description,
                "risk_level": tool.risk_level.value,
                "parameters": params
            })
        return manifest

    def check_permission(self, tool: ToolDefinition, user_context: UserContext) -> bool:
        """Verifies whether the user is authorized to execute this tool and tool is enabled."""
        if not tool.enabled:
            return False

        req_perm = tool.permission_required
        user_perms = user_context.permissions or []
        user_role = (user_context.role or "VIEWER").upper()

        if "*" in user_perms or req_perm in user_perms:
            return True

        role_perms = ROLE_PERMISSIONS.get(user_role, [])
        if "*" in role_perms or req_perm in role_perms:
            return True

        return False

    def validate_and_execute(
        self,
        tool_name: str,
        raw_parameters: Dict[str, Any],
        user_context: UserContext,
        agent_run_id: str,
        skip_approval_check: bool = False
    ) -> ToolResult:
        """
        Full tool execution pipeline:
        1. Validate tool exists
        2. Validate input schema
        3. Validate permissions
        4. Check approval policy
        5. Execute OR return approval request
        """
        tool = self.get_tool(tool_name)
        if not tool:
            raise ToolNotFoundError(f"Unknown tool '{tool_name}'. Tool is not registered.")

        # 1. Input schema validation
        try:
            validated_model = tool.input_schema(**raw_parameters)
            validated_dict = validated_model.dict()
        except ValidationError as val_err:
            error_details = "; ".join([f"{e['loc'][0]}: {e['msg']}" for e in val_err.errors()])
            raise ToolInputValidationError(f"Invalid parameters for '{tool_name}': {error_details}")
        except Exception as err:
            raise ToolInputValidationError(f"Invalid parameters for '{tool_name}': {str(err)}")

        # 2. Permission check
        if not self.check_permission(tool, user_context):
            raise ToolPermissionError(
                f"Permission denied. Role '{user_context.role}' lacks required permission '{tool.permission_required}' to execute '{tool_name}'."
            )

        # 3. Check approval policy (unless resumed after approval)
        if not skip_approval_check:
            needs_approval, reason = default_approval_service.requires_approval(tool, validated_dict, user_context)
            if needs_approval:
                appr_req = default_approval_service.create_approval_request(
                    agent_run_id=agent_run_id,
                    tool_name=tool_name,
                    reason=reason or f"Human approval required to execute {tool_name}.",
                    parameters=validated_dict
                )
                return ToolResult(
                    success=False,
                    requires_approval=True,
                    approval_reason=appr_req.reason,
                    approval_details=appr_req.dict(),
                    data={"approval_id": appr_req.approval_id, "status": "WAITING_FOR_APPROVAL"}
                )

        # 4. Dispatch execution
        return default_tool_execution_service.execute_tool(tool_name, validated_dict, user_context)


default_tool_registry = ToolRegistry()
