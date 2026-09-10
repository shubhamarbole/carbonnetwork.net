"""
Tools Module Initialization
Registers all read and write tools into the default Tool Registry.
"""

from app.tools.registry import default_tool_registry
from app.tools.risk_tools import register_risk_tools
from app.tools.project_tools import register_project_tools
from app.tools.knowledge_tools import register_knowledge_tools
from app.tools.compliance_tools import register_compliance_tools
from app.tools.mitigation_tools import register_mitigation_tools
from app.tools.reporting_tools import register_reporting_tools
from app.tools.predictive_tools import predict_risk_trajectory_tool
from app.tools.scenario_tools import simulate_risk_scenario_tool, compare_risk_scenarios_tool
from app.tools.decision_tools import (
    analyze_decision_options_tool,
    compare_decision_options_tool,
    recommend_decision_option_tool,
)
from app.tools.optimization_tools import optimize_risk_portfolio_tool

# Register all built-in tools
register_risk_tools()
register_project_tools()
register_knowledge_tools()
register_compliance_tools()
register_mitigation_tools()
register_reporting_tools()
default_tool_registry.register(predict_risk_trajectory_tool)
default_tool_registry.register(simulate_risk_scenario_tool)
default_tool_registry.register(compare_risk_scenarios_tool)
default_tool_registry.register(analyze_decision_options_tool)
default_tool_registry.register(compare_decision_options_tool)
default_tool_registry.register(recommend_decision_option_tool)
default_tool_registry.register(optimize_risk_portfolio_tool)

__all__ = ["default_tool_registry"]
