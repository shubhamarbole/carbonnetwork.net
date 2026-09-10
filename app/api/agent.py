"""
Internal AI Agent API Router
Exposes /internal/agent/run for authenticated invocations from Express gateway.
Phase 5: AI Agent + Tool Calling
"""

import logging
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.agent import AgentRunRequest, AgentRunResponse
from app.services.agent_service import default_agent_service

logger = logging.getLogger("api_agent")

router = APIRouter()


@router.post("/run", response_model=AgentRunResponse)
def run_agent(
    request: AgentRunRequest,
    x_internal_service_key: str = Header(..., description="Shared internal service secret key")
):
    """
    Executes an autonomous agent run.
    Requires internal service key authentication from the Express gateway.
    """
    if x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
        logger.warning(f"Unauthorized internal agent call attempt.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Service-Key"
        )

    try:
        response = default_agent_service.run_agent(request)
        return response
    except Exception as err:
        logger.error(f"Error running agent for run '{request.agent_run_id}': {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent orchestrator error: {str(err)}"
        )
