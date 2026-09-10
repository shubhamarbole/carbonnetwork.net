"""
Internal API Endpoints for Autonomous Risk Optimization
Phase 15: Autonomous Risk Optimization
"""

import logging
from fastapi import APIRouter, HTTPException, status
from app.optimization import (
    OptimizationEngine,
    OptimizationRequest,
    OptimizationResponse,
    default_optimization_engine,
)
from app.optimization.constraints import ConstraintValidationError

logger = logging.getLogger("optimization_api")

router = APIRouter()


@router.post("/run", response_model=OptimizationResponse)
async def run_optimization(request: OptimizationRequest):
    """
    Executes deterministic multi-objective risk optimization across candidate portfolio items.
    """
    try:
        response = default_optimization_engine.run(request)
        return response
    except ConstraintValidationError as c_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(c_err)
        )
    except Exception as err:
        logger.error(f"Optimization run failed: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(err)}"
        )


@router.post("/simulate", response_model=OptimizationResponse)
async def simulate_optimization(request: OptimizationRequest):
    """
    Simulates optimization in-memory without mutating any state.
    """
    try:
        response = default_optimization_engine.simulate(request)
        return response
    except ConstraintValidationError as c_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(c_err)
        )
    except Exception as err:
        logger.error(f"Optimization simulation failed: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(err)}"
        )
