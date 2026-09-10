"""
Unit Tests for Executive Risk Intelligence (Phase 11)
Verifies:
- Executive Risk Index calculation (executive-index-v1.0.0)
- Component formulas: S_mean, C_penalty, H_conc, B_proj
- Bounds clamping and severity thresholds (<25, 25-49.99, 50-74.99, >=75)
- Executive Briefing generation and context consistency (zero metric hallucination)
- Internal FastAPI executive endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.executive.index_calculator import (
    calculate_executive_risk_index,
    classify_executive_severity,
    SEVERITY_WEIGHTS
)
from app.executive.briefing_generator import generate_executive_briefing
from app.schemas.executive import (
    ExecutiveIndexRequest,
    ExecutiveRiskItem,
    ExecutiveBriefingRequest,
    DomainMetrics
)


def test_classify_executive_severity():
    assert classify_executive_severity(0.0) == "LOW"
    assert classify_executive_severity(24.99) == "LOW"
    assert classify_executive_severity(25.0) == "MEDIUM"
    assert classify_executive_severity(49.99) == "MEDIUM"
    assert classify_executive_severity(50.0) == "HIGH"
    assert classify_executive_severity(74.99) == "HIGH"
    assert classify_executive_severity(75.0) == "CRITICAL"
    assert classify_executive_severity(100.0) == "CRITICAL"


def test_calculate_executive_index_empty():
    result = calculate_executive_risk_index([], total_projects_count=0)
    assert result.executive_index == 0.0
    assert result.severity == "LOW"
    assert result.total_risks == 0
    assert result.critical_risks == 0
    assert result.high_risks == 0


def test_calculate_executive_index_formula():
    risks = [
        ExecutiveRiskItem(risk_id="r1", score=80.0, severity="CRITICAL", category="Environmental", project_id="p1"),
        ExecutiveRiskItem(risk_id="r2", score=60.0, severity="HIGH", category="Compliance", project_id="p2"),
    ]
    result = calculate_executive_risk_index(risks, total_projects_count=4)
    
    assert result.total_risks == 2
    assert result.critical_risks == 1
    assert result.high_risks == 1
    assert round(result.components["severity_weighted_mean"], 2) == 71.43
    assert result.components["critical_penalty"] == 20.0
    assert result.components["category_concentration"] == 50.0
    assert result.components["project_breadth"] == 50.0
    assert result.executive_index == 50.64
    assert result.severity == "HIGH"
    assert result.model_version == "executive-index-v1.0.0"


def test_calculate_executive_index_concentration_single_category():
    risks = [
        ExecutiveRiskItem(risk_id="r1", score=30.0, severity="MEDIUM", category="Financial", project_id="p1"),
        ExecutiveRiskItem(risk_id="r2", score=40.0, severity="MEDIUM", category="Financial", project_id="p1"),
    ]
    result = calculate_executive_risk_index(risks, total_projects_count=1)
    assert result.components["category_concentration"] == 100.0
    assert result.components["project_breadth"] == 100.0
    assert result.executive_index == 40.75
    assert result.severity == "MEDIUM"


def test_calculate_executive_index_bounds_capping():
    risks = [
        ExecutiveRiskItem(risk_id=f"r{i}", score=95.0, severity="CRITICAL", category="Operational", project_id=f"p{i}")
        for i in range(10)
    ]
    result = calculate_executive_risk_index(risks, total_projects_count=10)
    assert result.components["critical_penalty"] == 100.0
    assert result.executive_index <= 100.0
    assert result.severity == "CRITICAL"


def test_generate_executive_briefing():
    req = ExecutiveBriefingRequest(
        organization_id="org-acme-1",
        executive_context={
            "overall_risk_index": 62.4,
            "overall_risk_severity": "HIGH",
            "risk_trend": "INCREASING",
            "total_risks": 12,
            "critical_risks": 2,
            "high_risks": 4,
            "medium_risks": 5,
            "low_risks": 1,
            "active_alerts": 3,
            "open_workflows": 2,
            "decisions_required": 1,
            "esg_exposure": {"composite_score": 48.5},
            "carbon_exposure": {"total_emissions_tco2e": 1420.0, "grid_carbon_intensity": 380.0},
            "compliance_exposure": {"cbam_exposure_eur": 25000.0, "csrd_gap_count": 2},
            "top_critical_risks": [
                {"title": "Grid Carbon Spike", "category": "Environmental", "score": 88.5, "severity": "CRITICAL"}
            ],
            "predictive_highlights": [
                {"title": "CSRD Disclosure Delay", "current_score": 64.0, "predicted_score_30d": 78.0, "probability": 0.82}
            ],
            "scenario_insights": [
                {"name": "EU ETS Carbon Price Spike", "worst_case_delta": 18.5}
            ]
        }
    )
    briefing = generate_executive_briefing(req)
    assert briefing.summary is not None
    assert "62.4" in briefing.summary or "62.4" in briefing.sections.executive_summary
    assert briefing.sections.top_risks_assessment is not None
    assert briefing.sections.emerging_risks_outlook is not None
    assert briefing.sections.compliance_exposure is not None
    assert briefing.sections.recommended_priorities is not None


def test_internal_executive_endpoints():
    client = TestClient(app)
    
    health_res = client.get("/health")
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["version"] in ["11.0.0", "12.0.0", "13.0.0", "17.0.0"]
    assert "executive_intelligence" in data["components"]
    assert data["components"]["executive_intelligence"]["status"] == "HEALTHY"
    
    payload = {
        "organization_id": "test-org",
        "risks": [
            {"risk_id": "rk-1", "score": 78.0, "severity": "CRITICAL", "category": "Environmental", "project_id": "pj-1"},
            {"risk_id": "rk-2", "score": 52.0, "severity": "HIGH", "category": "Compliance", "project_id": "pj-2"}
        ],
        "total_projects_count": 5
    }
    index_res = client.post("/internal/executive/index", json=payload)
    assert index_res.status_code == 200
    res_data = index_res.json()
    assert "executive_index" in res_data
    assert res_data["components"]["total_risks"] == 2
    assert res_data["components"]["critical_count"] == 1
    
    briefing_payload = {
        "organization_id": "test-org",
        "executive_context": {
            "overall_risk_index": res_data["executive_index"],
            "overall_risk_severity": res_data["overall_severity"],
            "risk_trend": res_data["trend"],
            "total_risks": 2,
            "critical_risks": 1,
            "high_risks": 1,
            "medium_risks": 0,
            "low_risks": 0,
            "active_alerts": 1,
            "open_workflows": 0,
            "decisions_required": 1
        }
    }
    brief_res = client.post("/internal/executive/briefing", json=briefing_payload)
    assert brief_res.status_code == 200
    brief_data = brief_res.json()
    assert "summary" in brief_data
    assert brief_data["sections"]["executive_summary"]

