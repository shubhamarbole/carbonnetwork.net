"""
Compliance, Supplier, and ESG Domain Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    GetComplianceRecordsInput,
    GetSupplierRecordsInput,
    GetESGRecordsInput,
    GetCarbonRecordsInput
)
from app.tools.registry import default_tool_registry


def register_compliance_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="get_compliance_records",
            description="Retrieve environmental compliance permits, regulatory filings, and violation status.",
            input_schema=GetComplianceRecordsInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_supplier_records",
            description="Retrieve supply chain audit profiles, vendor sustainability ratings, and vendor risk levels.",
            input_schema=GetSupplierRecordsInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_esg_records",
            description="Retrieve operational ESG telemetry records (energy, water, waste, pollution readings).",
            input_schema=GetESGRecordsInput,
            permission_required="energy.read",
            risk_level=ToolRiskLevel.READ
        )
    )

    default_tool_registry.register(
        ToolDefinition(
            name="get_carbon_records",
            description="Retrieve greenhouse gas emission records, scope breakdown, and carbon credit batches.",
            input_schema=GetCarbonRecordsInput,
            permission_required="ghg.read",
            risk_level=ToolRiskLevel.READ
        )
    )
