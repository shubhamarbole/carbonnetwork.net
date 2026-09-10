"""
Unit Tests for Phase 15: Autonomous Risk Optimization
Verifies deterministic portfolio optimization, constraints, objectives, and zero-mutation simulations.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.optimization import (
    CandidateMitigation,
    ObjectiveWeights,
    OptimizationConstraints,
    OptimizationEngine,
    OptimizationObjective,
    OptimizationRequest,
    RiskPortfolioItem,
    default_optimization_engine,
)
from app.optimization.objectives import resolve_weights
from app.services.tool_execution_service import default_tool_execution_service
from app.schemas.agent import UserContext


@pytest.fixture
def sample_portfolio_request():
    return OptimizationRequest(
        organization_id="org_test_15",
        objective=OptimizationObjective.BALANCED_OPTIMIZATION,
        constraints=OptimizationConstraints(
            budget=40000.0,
            deadline=60,
            resource_limit=10,
            risk_tolerance=45.0,
            mandatory_compliance=True,
            carbon_target=20.0,
            esg_target=10.0,
        ),
        portfolio_risks=[
            RiskPortfolioItem(
                risk_id="risk_001",
                risk_title="Effluent Spill Non-Compliance",
                current_score=85.0,
                category="Compliance",
                severity="CRITICAL",
                candidate_actions=[
                    CandidateMitigation(
                        action_id="act_001_a",
                        title="Emergency Secondary Containment Unit",
                        cost=15000.0,
                        implementation_days=20,
                        risk_reduction=55.0,
                        esg_gain=20.0,
                        carbon_reduction_tco2e=15.0,
                        compliance_covered=True,
                        resource_units=3,
                    ),
                    CandidateMitigation(
                        action_id="act_001_b",
                        title="Temporary Sorbent Barriers",
                        cost=4000.0,
                        implementation_days=7,
                        risk_reduction=25.0,
                        esg_gain=5.0,
                        carbon_reduction_tco2e=2.0,
                        compliance_covered=False,
                        resource_units=1,
                    ),
                ],
            ),
            RiskPortfolioItem(
                risk_id="risk_002",
                risk_title="Substation Transformer Carbon Leakage",
                current_score=72.0,
                category="Environmental",
                severity="HIGH",
                candidate_actions=[
                    CandidateMitigation(
                        action_id="act_002_a",
                        title="SF6 Dielectric Fluid Recovery System",
                        cost=18000.0,
                        implementation_days=35,
                        risk_reduction=42.0,
                        esg_gain=18.0,
                        carbon_reduction_tco2e=45.0,
                        compliance_covered=True,
                        resource_units=2,
                    ),
                    CandidateMitigation(
                        action_id="act_002_b",
                        title="Sealant Injection Patch",
                        cost=6000.0,
                        implementation_days=10,
                        risk_reduction=20.0,
                        esg_gain=8.0,
                        carbon_reduction_tco2e=15.0,
                        compliance_covered=False,
                        resource_units=1,
                    ),
                ],
            ),
        ],
    )


def test_objective_presets_and_weight_normalization():
    for obj in OptimizationObjective:
        weights = resolve_weights(obj)
        total = (
            weights.risk_reduction_weight
            + weights.cost_efficiency_weight
            + weights.compliance_weight
            + weights.esg_improvement_weight
            + weights.carbon_reduction_weight
            + weights.time_efficiency_weight
        )
        assert abs(total - 1.0) < 0.01, f"Weights for {obj} must sum to 1.0 (got {total})"
        assert weights.version == "opt-weights-v1.0.0"


def test_deterministic_portfolio_optimization(sample_portfolio_request):
    response = default_optimization_engine.run(sample_portfolio_request)

    assert response.organization_id == "org_test_15"
    assert response.objective == "BALANCED_OPTIMIZATION"
    assert response.total_risks_considered == 2
    assert response.selected_mitigations_count == 2
    assert response.total_budget_allocated <= sample_portfolio_request.constraints.budget
    assert response.max_implementation_days <= sample_portfolio_request.constraints.deadline
    assert response.constraints_satisfied is True
    assert len(response.constraint_violations) == 0

    # Ensure rankings are deterministic and 1-based
    priorities = [m.priority for m in response.ranked_strategies]
    assert priorities == [1, 2]

    # Verify post-mitigation scores never drop below 0
    for m in response.ranked_strategies:
        assert m.post_mitigation_score >= 0.0
        assert m.post_mitigation_score < m.current_risk_score


def test_mandatory_compliance_constraint_enforcement(sample_portfolio_request):
    # Mandatory compliance requires compliant action for critical compliance risk
    response = default_optimization_engine.run(sample_portfolio_request)
    act_1 = next(m for m in response.ranked_strategies if m.risk_id == "risk_001")
    assert act_1.action_id == "act_001_a"  # act_001_a covers compliance; act_001_b does not


def test_budget_constraint_violation_detection(sample_portfolio_request):
    # Set an impossible budget cap of $5,000 when compliance action costs $15,000
    sample_portfolio_request.constraints.budget = 5000.0
    response = default_optimization_engine.run(sample_portfolio_request)

    # Must detect constraint violation
    assert response.constraints_satisfied is False
    assert len(response.constraint_violations) > 0


def test_zero_mutation_simulation(sample_portfolio_request):
    sim_response = default_optimization_engine.simulate(sample_portfolio_request)
    assert sim_response.is_simulation is True
    assert sim_response.optimization_id.startswith("sim_")
    assert sim_response.total_risks_considered == 2


def test_fastapi_internal_endpoints(sample_portfolio_request):
    client = TestClient(app)

    # Health check registration
    h_res = client.get("/health")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert "optimization_engine" in h_data["components"]
    assert h_data["components"]["optimization_engine"]["status"] == "HEALTHY"

    # POST /internal/optimization/run
    run_res = client.post("/internal/optimization/run", json=sample_portfolio_request.model_dump())
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["scoring_version"] == "opt-score-v1.0.0"
    assert run_data["selected_mitigations_count"] >= 1

    # POST /internal/optimization/simulate
    sim_res = client.post("/internal/optimization/simulate", json=sample_portfolio_request.model_dump())
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["is_simulation"] is True


def test_agent_tool_execution_service():
    user_ctx = UserContext(
        user_id="usr_esg_01",
        organization_id="org_test_15",
        role="ESG_MANAGER",
        permissions=["risk.read", "risk.manage"],
    )
    result = default_tool_execution_service.execute_tool(
        tool_name="optimize_risk_portfolio",
        parameters={
            "objective": "BALANCED_OPTIMIZATION",
            "budget_cap": 80000.0,
            "deadline_days": 90,
            "resource_limit": 15,
            "risk_tolerance": 40.0,
            "mandatory_compliance": True,
        },
        user_context=user_ctx,
    )
    assert result.success is True
    data = result.data
    assert "optimization_id" in data
    assert data["selected_mitigations_count"] >= 1
    assert data["weights_version"] == "opt-weights-v1.0.0"
