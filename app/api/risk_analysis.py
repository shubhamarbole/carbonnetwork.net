"""
Internal API Router for AI Risk Analysis
Exposes POST /internal/risk/analyze protected with internal service key authentication.
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.ai_analysis import (
    RiskAnalysisInputContext,
    InternalAnalysisResponse
)
from app.services.ai_risk_service import default_ai_risk_service

logger = logging.getLogger("risk_analysis_api")

router = APIRouter()


def verify_internal_auth(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> None:
    """Verifies that the request originates from an authorized internal service (Express gateway)."""
    expected_key = settings.INTERNAL_SERVICE_KEY
    if not x_internal_service_key or x_internal_service_key != expected_key:
        logger.warning("Unauthorized access attempt to internal risk analysis endpoint.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing or invalid internal service key."
        )


@router.post(
    "/risk/analyze",
    response_model=InternalAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Risk with AI (Internal Only)",
    description="Internal endpoint called exclusively by the Express backend gateway to generate structured AI analysis."
)
def analyze_risk_internal(
    body: RiskAnalysisInputContext,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> InternalAnalysisResponse:
    # 1. Enforce internal service authentication
    verify_internal_auth(x_internal_service_key)

    # 2. Execute analysis via service layer
    try:
        analysis_result = default_ai_risk_service.analyze(body)
        return InternalAnalysisResponse(
            success=True,
            data=analysis_result,
            model=settings.AI_MODEL,
            embedding_model=body.embedding_model or os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"),
            prompt_version=settings.PROMPT_VERSION
        )
    except ValueError as err:
        logger.error(f"Validation or format error during AI analysis: {err}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI model produced invalid response: {str(err)}"
        )
    except Exception as err:
        logger.error(f"Internal error processing AI risk analysis: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal AI service error: {str(err)}"
        )
