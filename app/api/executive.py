"""
Executive Risk Intelligence API Router
Phase 11: Internal microservice endpoints for deterministic index calculation and briefing generation.
"""

import logging
from fastapi import APIRouter, HTTPException

from app.schemas.executive import (
    ExecutiveIndexRequest,
    ExecutiveIndexResponse,
    ExecutiveBriefingRequest,
    ExecutiveBriefingResponse
)
from app.executive.index_calculator import calculate_executive_risk_index
from app.executive.briefing_generator import generate_executive_briefing

logger = logging.getLogger("executive_api")
router = APIRouter()


@router.post("/index", response_model=ExecutiveIndexResponse, tags=["Executive Intelligence"])
def compute_executive_index(request: ExecutiveIndexRequest):
    """Calculates deterministic organization-level Executive Risk Index."""
    try:
        return calculate_executive_risk_index(
            risks=request.risks,
            previous_index=request.previous_index,
            total_projects_count=request.total_projects_count
        )
    except Exception as err:
        logger.error(f"Error computing executive risk index: {err}")
        raise HTTPException(status_code=500, detail=f"Index calculation error: {str(err)}")


@router.post("/briefing", response_model=ExecutiveBriefingResponse, tags=["Executive Intelligence"])
def create_executive_briefing(request: ExecutiveBriefingRequest):
    """Generates structured AI Executive Briefing grounded strictly in backend context."""
    try:
        return generate_executive_briefing(request)
    except Exception as err:
        logger.error(f"Error generating executive briefing: {err}")
        raise HTTPException(status_code=500, detail=f"Briefing synthesis error: {str(err)}")
