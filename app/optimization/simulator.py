"""
Zero-Mutation Optimization Simulator
Performs what-if constraint and objective simulations without database side effects.
Phase 15: Autonomous Risk Optimization
"""

import uuid
from typing import Dict, List
from app.optimization.portfolio import optimize_portfolio
from app.optimization.schemas import (
    OptimizationConstraints,
    OptimizationRequest,
    OptimizationResponse,
)


class OptimizationSimulator:
    """Simulates optimization outcomes in memory."""

    @staticmethod
    def simulate(request: OptimizationRequest) -> OptimizationResponse:
        sim_req = request.model_copy(deep=True)
        sim_req.simulation_only = True
        sim_id = f"sim_{uuid.uuid4().hex[:12]}"
        return optimize_portfolio(sim_req, optimization_id=sim_id)

    @staticmethod
    def compare_scenarios(
        base_request: OptimizationRequest,
        constraint_variations: List[Dict[str, float]],
    ) -> List[OptimizationResponse]:
        """
        Runs multiple what-if simulations against varied constraints (e.g. budgets, deadlines).
        """
        results = []
        for idx, var in enumerate(constraint_variations):
            req_dict = base_request.model_dump()
            constraints_dict = req_dict["constraints"]
            constraints_dict.update(var)
            modified_req = OptimizationRequest(**req_dict)
            modified_req.simulation_only = True
            sim_id = f"sim_var_{idx+1}_{uuid.uuid4().hex[:8]}"
            results.append(optimize_portfolio(modified_req, optimization_id=sim_id))
        return results
