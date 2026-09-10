"""
Predictive AI Agent Tools
Phase 9: Tool allowing the Phase 5 multi-step AI Agent to query predictive risk forecasts
and examine trajectory projections during investigations.
"""

import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from app.schemas.tools import ToolDefinition, ToolRiskLevel, ToolResult
from app.schemas.prediction import PredictiveRiskRequest
from app.predictive.prediction import default_predictive_service

logger = logging.getLogger("predictive_tools")


class PredictRiskTrajectoryInput(BaseModel):
    """Input parameters for predict_risk_trajectory tool."""
    risk_id: str = Field(..., description="Target risk identifier")
    horizon_days: int = Field(30, description="Prediction horizon: 7, 30, or 90 days")


def execute_predict_risk_trajectory(
    parameters: Dict[str, Any],
    user_context: Any
) -> ToolResult:
    """Executes predictive trajectory forecast for the AI Agent."""
    import time
    start = time.time()
    try:
        risk_id = parameters.get("risk_id")
        horizon = int(parameters.get("horizon_days", 30))
        if horizon not in [7, 30, 90]:
            horizon = 30

        org_id = getattr(user_context, "organization_id", "org_default")

        req = PredictiveRiskRequest(
            risk_id=risk_id,
            prediction_horizon_days=horizon,
            organization_id=org_id,
            include_explainability=True
        )

        pred_resp = default_predictive_service.predict_risk(req)
        elapsed = (time.time() - start) * 1000.0

        return ToolResult(
            success=True,
            data=pred_resp.model_dump(),
            execution_time_ms=round(elapsed, 2)
        )
    except Exception as err:
        logger.error(f"Error executing predict_risk_trajectory: {err}")
        return ToolResult(
            success=False,
            error=f"Prediction trajectory evaluation failed: {str(err)}",
            execution_time_ms=round((time.time() - start) * 1000.0, 2)
        )


predict_risk_trajectory_tool = ToolDefinition(
    name="predict_risk_trajectory",
    description="Forecasts future risk trajectory using machine learning. Returns predicted score, severity, critical probability (0-1), trend (INCREASING/STABLE/DECREASING), and key predictive drivers over 7, 30, or 90 days. Does not alter authoritative deterministic scores.",
    input_schema=PredictRiskTrajectoryInput,
    permission_required="risk.read",
    risk_level=ToolRiskLevel.READ,
    requires_approval=False
)
