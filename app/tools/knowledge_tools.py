"""
Knowledge Base RAG Tools for Agent
Phase 5: AI Agent + Tool Calling
"""

from app.schemas.tools import (
    ToolDefinition,
    ToolRiskLevel,
    SearchKnowledgeBaseInput
)
from app.tools.registry import default_tool_registry


def register_knowledge_tools():
    default_tool_registry.register(
        ToolDefinition(
            name="search_knowledge_base",
            description="Search the tenant organizational knowledge base using vector semantic search to retrieve policy and regulatory evidence.",
            input_schema=SearchKnowledgeBaseInput,
            permission_required="risk.read",
            risk_level=ToolRiskLevel.READ
        )
    )
