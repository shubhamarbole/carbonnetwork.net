"""
Internal Decision Intelligence API Router
Phase 13: Advanced Decision Intelligence Microservice Endpoints
"""

import logging
from fastapi import APIRouter, HTTPException
from app.schemas.decision import (
    DecisionAnalysisRequest,
    DecisionAnalysisResponse,
    DecisionComparisonRequest,
    DecisionComparisonResponse,
    DecisionRecommendationRequest,
    DecisionRecommendationResponse,
    DecisionOutcomeEvaluationRequest,
    DecisionOutcomeEvaluationResponse,
)
from app.decision.engine import DecisionEngine
from app.decision.explainer import DecisionExplainer
from app.decision.quality_evaluator import DecisionQualityEvaluator

logger = logging.getLogger("decisions_api")
router = APIRouter()


@router.post("/analyze", response_model=DecisionAnalysisResponse, tags=["Decision Intelligence"])
def analyze_decision_options(request: DecisionAnalysisRequest):
    """Deterministically evaluates and ranks decision options."""
    try:
        return DecisionEngine.analyze(request)
    except Exception as err:
        logger.error(f"Error analyzing decision options: {err}")
        raise HTTPException(status_code=500, detail=f"Decision analysis failed: {str(err)}")


@router.post("/compare", response_model=DecisionComparisonResponse, tags=["Decision Intelligence"])
def compare_decision_options(request: DecisionComparisonRequest):
    """Builds a structured multi-option comparison matrix."""
    try:
        return DecisionEngine.compare(request)
    except Exception as err:
        logger.error(f"Error comparing decision options: {err}")
        raise HTTPException(status_code=500, detail=f"Decision comparison failed: {str(err)}")


@router.post("/recommend", response_model=DecisionRecommendationResponse, tags=["Decision Intelligence"])
def recommend_decision_option(request: DecisionRecommendationRequest):
    """Produces an evidence-grounded AI recommendation based on deterministic option scores."""
    try:
        return DecisionExplainer.generate_recommendation(request)
    except Exception as err:
        logger.error(f"Error generating decision recommendation: {err}")
        raise HTTPException(status_code=500, detail=f"Decision recommendation failed: {str(err)}")


@router.post("/quality", response_model=DecisionOutcomeEvaluationResponse, tags=["Decision Intelligence"])
def evaluate_decision_outcome(request: DecisionOutcomeEvaluationRequest):
    """Deterministically calculates forecast errors, risk reduction deltas, and cost variances."""
    try:
        return DecisionQualityEvaluator.evaluate_outcome(request)
    except Exception as err:
        logger.error(f"Error evaluating decision outcome: {err}")
        raise HTTPException(status_code=500, detail=f"Decision quality evaluation failed: {str(err)}")
