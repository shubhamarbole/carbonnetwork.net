"""
Unit & Integration Tests for Phase 10: Real ESG/Carbon Data Integrations + Scenario Intelligence
"""

import copy
import pytest
from datetime import datetime, timezone
from app.schemas.integration import IntegrationProviderType, SyncType, NormalizedDataRecordSchema
from app.schemas.scenario import ScenarioType, ScenarioParameters, ScenarioSimulationRequest
from app.integrations.registry import AdapterRegistry
from app.ingestion.validator import validate_record, validate_batch
from app.ingestion.deduplicator import compute_record_fingerprint, deduplicate_records
from app.ingestion.normalizer import normalize_record, normalize_unit
from app.scenarios.calculator import evaluate_scenario_risks, perturb_factors, clamp, ENGINE_VERSION
from app.scenarios.simulator import simulate_potential_events_and_alerts
from app.scenarios.comparison import build_comparison_matrix
from app.scenarios.engine import ScenarioEngine
from app.tools.scenario_tools import execute_simulate_risk_scenario, execute_compare_risk_scenarios
from app.services.risk_scoring_service import calculate_risk_score, classify_severity


class DummyUserContext:
    organization_id = "org_test_10"
    project_id = "proj_test_10"


def test_adapter_registry_and_domains():
    """Verify all 5 core domain adapters are registered."""
    adapters = AdapterRegistry.list_available_adapters()
    names = [a["adapter_name"] for a in adapters]
    assert "grid_utility" in names
    assert "gri_metrics" in names
    assert "supply_chain" in names
    assert "regulatory_feed" in names
    assert "carbon_registry" in names

    # Test retrieval
    util = AdapterRegistry.get_adapter("grid_utility")
    assert util is not None
    assert util.provider_type == IntegrationProviderType.CARBON
    assert "electricity_kwh" in util.supported_metrics


def test_adapter_connection_and_fetch():
    """Verify adapter connectivity and fetch/normalization."""
    adapter = AdapterRegistry.get_adapter("grid_utility")
    ok, msg = adapter.test_connection({})
    assert ok is True

    # Fetch and normalize
    raw = adapter.fetch_data("INCREMENTAL", datetime.now(timezone.utc))
    assert len(raw) > 0

    norm = adapter.normalize(raw, organization_id="org_test", project_id="proj_1")
    assert len(norm) > 0
    assert any(r["metric"] == "electricity_kwh" for r in norm)
    assert any(r["metric"] == "scope2_emissions_tco2e" for r in norm)


def test_ingestion_validation_and_deduplication():
    """Verify bounds, type checking, and deterministic SHA-256 deduplication."""
    valid_record = {
        "source": "grid_utility",
        "domain": "CARBON",
        "organization_id": "org_abc",
        "project_id": "proj_1",
        "metric": "electricity_kwh",
        "value": 15000.0,
        "unit": "kWh",
        "period": "2026-Q1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    is_valid, err = validate_record(valid_record)
    assert is_valid is True
    assert err == ""

    # Invalid value
    invalid_record = dict(valid_record, value="not-a-number")
    is_valid2, err2 = validate_record(invalid_record)
    assert is_valid2 is False

    # Fingerprint
    fp1 = compute_record_fingerprint(valid_record)
    fp2 = compute_record_fingerprint(valid_record)
    assert fp1 == fp2
    assert len(fp1) == 64

    # Deduplication across batch
    batch = [copy.deepcopy(valid_record), copy.deepcopy(valid_record)]
    unique, dup_count = deduplicate_records(batch)
    assert len(unique) == 1
    assert dup_count == 1
    assert unique[0]["fingerprint"] == fp1


def test_deterministic_scenario_risk_formula_parity():
    """Ensure scenario engine preserves Phase 2 deterministic risk score formula parity."""
    p, i, e, u = 60.0, 70.0, 50.0, 40.0
    expected = round((60.0 * 0.35) + (70.0 * 0.35) + (50.0 * 0.20) + (40.0 * 0.10), 2)
    actual = calculate_risk_score(p, i, e, u)
    assert actual == expected
    assert actual == 59.50
    assert classify_severity(actual) == "HIGH"


def test_scenario_perturbation_and_zero_mutation():
    """Verify scenario perturbation never mutates baseline risk inputs."""
    original_risks = [
        {
            "id": "risk-101",
            "title": "EU ETS Carbon Cost Surge",
            "category": "ENVIRONMENTAL",
            "probability": 50.0,
            "impact": 60.0,
            "exposure": 50.0,
            "urgency": 50.0
        },
        {
            "id": "risk-102",
            "title": "Data Center Power Failure",
            "category": "OPERATIONAL",
            "probability": 30.0,
            "impact": 40.0,
            "exposure": 40.0,
            "urgency": 30.0
        }
    ]

    immutability_clone = copy.deepcopy(original_risks)

    params = ScenarioParameters(carbon_emission_pct_change=30.0)
    affected = evaluate_scenario_risks(original_risks, ScenarioType.CARBON_INCREASE, params)

    # Zero-mutation check
    assert original_risks == immutability_clone, "Baseline risks were mutated by scenario evaluation!"

    # Verification of calculations
    assert len(affected) == 2
    carbon_risk = next(r for r in affected if r.risk_id == "risk-101")
    assert carbon_risk.projected_score > carbon_risk.baseline_score
    assert carbon_risk.score_delta > 0
    assert carbon_risk.projected_impact > carbon_risk.baseline_impact


def test_scenario_engine_simulation_and_citations():
    """Verify complete simulation pipeline and policy citations."""
    req = ScenarioSimulationRequest(
        scenario_name="Grid Shock Simulation",
        scenario_type=ScenarioType.CARBON_INCREASE,
        organization_id="org_test_10",
        parameters=ScenarioParameters(carbon_emission_pct_change=25.0),
        include_ai_explanation=True
    )

    result = ScenarioEngine.simulate(req)
    assert result.engine_version == ENGINE_VERSION
    assert result.projected_average_score >= result.baseline_average_score
    assert len(result.affected_risks) > 0
    assert len(result.policy_citations) >= 2
    assert any("CSRD" in c["source"] or "GHG Protocol" in c["source"] for c in result.policy_citations)

    # Potential events marked with simulation=True
    for ev in result.potential_events:
        assert ev.simulation is True


def test_multi_scenario_comparison_matrix():
    """Verify comparison matrix construction across multiple perturbations."""
    req1 = ScenarioSimulationRequest(
        scenario_name="Carbon Increase",
        scenario_type=ScenarioType.CARBON_INCREASE,
        organization_id="org_test_10",
        parameters=ScenarioParameters(carbon_emission_pct_change=40.0)
    )
    req2 = ScenarioSimulationRequest(
        scenario_name="Carbon Reduction",
        scenario_type=ScenarioType.CARBON_REDUCTION,
        organization_id="org_test_10",
        parameters=ScenarioParameters(carbon_emission_pct_change=30.0)
    )

    res1 = ScenarioEngine.simulate(req1)
    res2 = ScenarioEngine.simulate(req2)

    comp = build_comparison_matrix("org_test_10", None, [res1, res2])
    assert len(comp.scenarios) == 2
    assert comp.comparison_matrix["worst_case"]["scenario_name"] == "Carbon Increase"
    assert comp.comparison_matrix["best_case"]["scenario_name"] == "Carbon Reduction"
    assert "worst-case trajectory" in comp.ai_synthesis.lower()


def test_ai_agent_scenario_tools():
    """Verify AI Agent scenario tools execute and return valid data."""
    ctx = DummyUserContext()

    # 1. simulate_risk_scenario tool
    sim_res = execute_simulate_risk_scenario(
        {"scenario_type": "COMPLIANCE_DELAY", "compliance_delay_days": 45},
        ctx
    )
    assert sim_res.success is True
    assert sim_res.data["scenario_type"] == "COMPLIANCE_DELAY"
    assert sim_res.data["score_delta"] > 0

    # 2. compare_risk_scenarios tool
    comp_res = execute_compare_risk_scenarios(
        {"scenario_types": ["CARBON_INCREASE", "CARBON_REDUCTION"]},
        ctx
    )
    assert comp_res.success is True
    assert len(comp_res.data["scenarios"]) == 2
