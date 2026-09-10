"""
Internal Pilot & Validation Router
Phase 12: Microservice endpoints for live predictive model evaluation, AI benchmark runner, and resource limit status.
"""

import logging
from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List
from pydantic import BaseModel

from app.predictive.predictive_evaluator import evaluate_predictive_performance
from app.evaluation.eval_runner import run_live_ai_evaluation
from app.core.config import settings

logger = logging.getLogger("pilot_api")
router = APIRouter()


class PredictiveEvalRequest(BaseModel):
    predictions: List[Dict[str, Any]]


@router.post("/predictive/evaluate", tags=["Pilot Validation"])
def evaluate_predictions(payload: PredictiveEvalRequest):
    """Calculates live Precision, Recall, F1, ROC-AUC, PR-AUC, and Brier score."""
    try:
        return evaluate_predictive_performance(payload.predictions)
    except Exception as err:
        logger.error(f"Predictive evaluation error: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/evaluation/run", tags=["Pilot Validation"])
def execute_ai_evaluation():
    """Runs live quantitative AI evaluation against benchmark cases."""
    try:
        return run_live_ai_evaluation()
    except Exception as err:
        logger.error(f"AI evaluation runner error: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/governance/limits", tags=["Pilot Validation"])
def get_governance_limits():
    """Returns active AI resource limits and environment tier."""
    return {
        "environment_tier": settings.ENVIRONMENT_TIER,
        "max_agent_steps": settings.MAX_AGENT_STEPS,
        "max_tokens_per_request": settings.MAX_TOKENS_PER_REQUEST,
        "max_agent_runs_daily": settings.MAX_AGENT_RUNS_DAILY,
        "max_concurrent_agent_runs": settings.MAX_CONCURRENT_AGENT_RUNS,
        "cost_model": {
            "prompt_per_million": settings.ESTIMATED_COST_PER_MILLION_PROMPT,
            "completion_per_million": settings.ESTIMATED_COST_PER_MILLION_COMPLETION,
            "embedding_per_million": settings.ESTIMATED_COST_PER_MILLION_EMBEDDING
        }
    }
