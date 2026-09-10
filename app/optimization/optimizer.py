"""
Autonomous Risk Optimization Engine Coordinator
Phase 15: Autonomous Risk Optimization
"""

import uuid
from app.optimization.constraints import validate_constraints
from app.optimization.portfolio import optimize_portfolio
from app.optimization.schemas import OptimizationRequest, OptimizationResponse
from app.optimization.simulator import OptimizationSimulator


class OptimizationEngine:
    """High-level facade for deterministic risk optimization."""

    @staticmethod
    def run(request: OptimizationRequest) -> OptimizationResponse:
        # Validate constraint sanity
        validate_constraints(request.constraints)

        opt_id = f"opt_{uuid.uuid4().hex[:12]}"
        return optimize_portfolio(request, optimization_id=opt_id)

    @staticmethod
    def simulate(request: OptimizationRequest) -> OptimizationResponse:
        validate_constraints(request.constraints)
        return OptimizationSimulator.simulate(request)


default_optimization_engine = OptimizationEngine()
