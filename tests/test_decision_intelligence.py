"""
Unit & Integration Tests for Advanced Decision Intelligence
Phase 13: Mathematical bounds, constraint enforcement, deterministic ranking,
explainer generation, and quality evaluation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.decision import (
    DecisionObjective,
    DecisionConstraints,
    DecisionOptionInput,
    DecisionAnalysisRequest,
    DecisionComparisonRequest,
    DecisionRecommendationRequest,
    DecisionOutcomeEvaluationRequest,
    EvaluatedOptionSchema,
)
from app.decision.scoring import DecisionScorer, SCORING_VERSION
from app.decision.engine import DecisionEngine
from app.decision.explainer import DecisionExplainer
from app.decision.quality_evaluator import DecisionQualityEvaluator


@pytest.fixture
def client():
    return TestClient(app)


def test_decision_weights_and_objectives():
    """Verifies that each objective has a distinct, valid mathematical weight set."""
    for obj in DecisionObjective:
        weights = DecisionScorer.get_weights_for_objective(obj)
        assert weights.weight_version == "weight-v1.0.0"
        total_weights = (
            weights.risk_reduction +
            weights.cost +
            weights.esg_impact +
            weights.carbon_impact +
            weights.compliance +
            weights.implementation_time +
            weights.operational_impact
        )
        assert round(total_weights, 2) == 1.0


def test_deterministic_scoring_bounds():
    """Ensures decision scores are strictly bounded within [0.0, 100.0]."""
    options = [
        DecisionOptionInput(
            option_id="opt-a",
            name="Comprehensive Supplier Audit & Equipment Upgrade",
            projected_risk=25.0,
            projected_cost=15000.0,
            projected_esg_impact=85.0,
            projected_carbon_impact=450.0,
            projected_compliance_exposure=5.0,
            implementation_time=30.0,
            operational_impact=15.0
        ),
        DecisionOptionInput(
            option_id="opt-b",
            name="Alternative Supplier Dual-Sourcing",
            projected_risk=38.0,
            projected_cost=8000.0,
            projected_esg_impact=70.0,
            projected_carbon_impact=200.0,
            projected_compliance_exposure=15.0,
            implementation_time=20.0,
            operational_impact=10.0
        ),
        DecisionOptionInput(
            option_id="opt-c",
            name="Status Quo with Enhanced Monitoring",
            projected_risk=72.0,
            projected_cost=2000.0,
            projected_esg_impact=50.0,
            projected_carbon_impact=0.0,
            projected_compliance_exposure=40.0,
            implementation_time=5.0,
            operational_impact=5.0
        ),
    ]

    evaluated = DecisionScorer.evaluate_options(
        options=options,
        baseline_risk=75.0,
        objective=DecisionObjective.BALANCED_OUTCOME
    )

    assert len(evaluated) == 3
    for opt in evaluated:
        assert 0.0 <= opt.decision_score <= 100.0
        assert opt.rank in [1, 2, 3]

    # Rank 1 must have the highest score
    assert evaluated[0].rank == 1
    assert evaluated[0].decision_score >= evaluated[1].decision_score >= evaluated[2].decision_score


def test_constraint_penalties_and_feasibility():
    """Tests that options violating hard constraints are penalized and flagged."""
    options = [
        DecisionOptionInput(
            option_id="opt-cheap",
            name="Low-Cost Filter",
            projected_risk=50.0,
            projected_cost=5000.0,
            implementation_time=15.0
        ),
        DecisionOptionInput(
            option_id="opt-expensive",
            name="Exorbitant Scrubber",
            projected_risk=20.0,
            projected_cost=50000.0,  # Breaches max_cost
            implementation_time=60.0  # Breaches max_time
        )
    ]

    constraints = DecisionConstraints(
        max_cost=20000.0,
        max_implementation_time_days=30.0
    )

    evaluated = DecisionScorer.evaluate_options(
        options=options,
        baseline_risk=70.0,
        constraints=constraints
    )

    feasible_opt = next(o for o in evaluated if o.option_id == "opt-cheap")
    breached_opt = next(o for o in evaluated if o.option_id == "opt-expensive")

    assert feasible_opt.is_feasible is True
    assert len(feasible_opt.constraint_violations) == 0

    assert breached_opt.is_feasible is False
    assert len(breached_opt.constraint_violations) == 2
    # Feasible option is ranked higher than infeasible
    assert feasible_opt.rank < breached_opt.rank


def test_comparison_matrix_generation():
    """Verifies that the comparison matrix builds complete multi-metric side-by-side rows."""
    options = [
        DecisionOptionInput(option_id="opt-1", name="Option 1", projected_risk=30.0, projected_cost=10000.0),
        DecisionOptionInput(option_id="opt-2", name="Option 2", projected_risk=45.0, projected_cost=5000.0),
    ]

    req = DecisionComparisonRequest(
        decision_id="dec-comp-01",
        organization_id="org-test",
        baseline_risk_score=80.0,
        options=options
    )

    res = DecisionEngine.compare(req)
    assert res.decision_id == "dec-comp-01"
    assert len(res.metrics) >= 8
    assert "opt-1" in res.summary_matrix
    assert "opt-2" in res.summary_matrix


def test_ai_recommendation_grounding():
    """Verifies that AI recommendation reflects the top-ranked deterministic option with citations."""
    evaluated = [
        EvaluatedOptionSchema(
            option_id="opt-win",
            name="Best Mitigation Pathway",
            projected_risk=25.0,
            projected_cost=12000.0,
            projected_esg_impact=80.0,
            projected_carbon_impact=300.0,
            projected_compliance_exposure=10.0,
            implementation_time=25.0,
            operational_impact=10.0,
            decision_score=78.5,
            rank=1,
            is_feasible=True
        ),
        EvaluatedOptionSchema(
            option_id="opt-sub",
            name="Sub-optimal Alternative",
            projected_risk=55.0,
            projected_cost=6000.0,
            decision_score=45.2,
            rank=2,
            is_feasible=True
        )
    ]

    req = DecisionRecommendationRequest(
        decision_id="dec-rec-01",
        title="Supplier Decarbonization Choice",
        organization_id="org-test",
        baseline_risk={"id": "risk-01", "title": "Scope 3 Supplier Default", "risk_score": 75.0, "severity": "CRITICAL"},
        predictions={"prediction_id": "pred-01", "critical_probability": 0.88},
        rag_citations=[{"document_id": "doc-01", "title": "Corporate CSRD Guidelines"}],
        evaluated_options=evaluated
    )

    rec = DecisionExplainer.generate_recommendation(req)
    assert rec.recommended_option_id == "opt-win"
    assert rec.recommended_option_name == "Best Mitigation Pathway"
    assert len(rec.evidence_references) >= 2
    assert len(rec.risks_of_options) == 2
    assert "Optimal" in rec.executive_rationale or "optimal" in rec.executive_rationale


def test_quality_evaluator_expected_vs_actual():
    """Verifies pure mathematical calculation of forecast errors and cost variances."""
    req = DecisionOutcomeEvaluationRequest(
        outcome_id="out-01",
        decision_id="dec-01",
        option_id="opt-01",
        expected_risk=30.0,
        expected_cost=10000.0,
        expected_esg=75.0,
        expected_carbon=200.0,
        expected_compliance=10.0,
        actual_risk=32.0,
        actual_cost=10500.0,
        actual_esg=74.0,
        actual_carbon=210.0,
        actual_compliance=8.0,
        baseline_risk=70.0
    )

    res = DecisionQualityEvaluator.evaluate_outcome(req)
    assert res.forecast_error == 2.0  # |30 - 32|
    assert res.cost_variance == 500.0  # 10500 - 10000
    assert res.cost_variance_percentage == 5.0  # 500 / 10000 * 100
    assert res.expected_risk_reduction == 40.0  # 70 - 30
    assert res.actual_risk_reduction == 38.0  # 70 - 32
    assert res.evaluation_rating == "EXEMPLARY_ACCURACY"


def test_internal_decision_api_endpoints(client):
    """Tests FastAPI /internal/decisions/* HTTP endpoints."""
    # 1. Health check includes decision_intelligence
    h_res = client.get("/health")
    assert h_res.status_code == 200
    data = h_res.json()
    assert "decision_intelligence" in data["components"]
    assert data["components"]["decision_intelligence"]["status"] == "HEALTHY"

    # 2. Analyze endpoint
    payload = {
        "decision_id": "dec-api-01",
        "title": "API Test Decision",
        "organization_id": "org-api-test",
        "baseline_risk_score": 65.0,
        "objective": "RISK_REDUCTION",
        "options": [
            {
                "option_id": "opt-1",
                "name": "Option 1",
                "projected_risk": 30.0,
                "projected_cost": 10000.0,
                "projected_esg_impact": 70.0,
                "projected_carbon_impact": 150.0,
                "projected_compliance_exposure": 10.0,
                "implementation_time": 20.0,
                "operational_impact": 15.0
            },
            {
                "option_id": "opt-2",
                "name": "Option 2",
                "projected_risk": 50.0,
                "projected_cost": 4000.0,
                "projected_esg_impact": 60.0,
                "projected_carbon_impact": 50.0,
                "projected_compliance_exposure": 25.0,
                "implementation_time": 10.0,
                "operational_impact": 5.0
            }
        ]
    }

    res = client.post("/internal/decisions/analyze", json=payload)
    assert res.status_code == 200
    an_data = res.json()
    assert an_data["top_recommended_option_id"] == an_data["ranked_options"][0]["option_id"]
    assert an_data["ranked_options"][0]["rank"] == 1
