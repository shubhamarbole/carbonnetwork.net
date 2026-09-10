"""
Phase 3 Python Unit Tests for LLM-Powered AI Risk Analysis
Tests:
1. Valid risk analysis request
2. Invalid request schema
3. Missing required fields
4. Confidence boundary 0.0 accepted
5. Confidence boundary 1.0 accepted
6. Confidence below 0.0 rejected
7. Confidence above 1.0 rejected
8. Malformed LLM response safely handled
9. Missing AI response safely handled
10. LLM timeout handled safely
11. LLM provider failure handled safely
12. Internal service authentication enforcement (missing & invalid key rejected)
13. Successful structured analysis output format
14. Recommendation array validation
"""

import json
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.schemas.ai_analysis import (
    RiskAnalysisInputContext,
    StructuredAIAnalysis
)
from app.agents.risk_analyzer import RiskAnalyzer
from app.agents.llm_client import BaseLLMClient, LLMClientError, LLMTimeoutError

client = TestClient(app)

AUTH_HEADERS = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}


# ---------------------------------------------------------------------------
# Test Mocks
# ---------------------------------------------------------------------------

class StaticResponseClient(BaseLLMClient):
    """Mock client returning predetermined JSON string."""
    def __init__(self, response_text: str):
        super().__init__(model="static-mock")
        self.response_text = response_text

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        return self.response_text


class TimeoutMockClient(BaseLLMClient):
    """Mock client simulating timeout."""
    def __init__(self):
        super().__init__(model="timeout-mock")

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        raise LLMTimeoutError("Request to LLM timed out after 30s")


class FailingMockClient(BaseLLMClient):
    """Mock client simulating provider failure (e.g. rate limit, 500)."""
    def __init__(self):
        super().__init__(model="failing-mock")

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        raise LLMClientError("Remote LLM Provider Error: Rate limit exceeded or 503")


# Sample valid context
SAMPLE_CONTEXT = RiskAnalysisInputContext(
    risk_id="609a6a669c0623eaa0ef829c",
    title="Unauthorized Data Exfiltration Threat",
    description="Risk of unauthorized exfiltration of sensitive telemetry data.",
    category="Cybersecurity",
    probability=60.0,
    impact=80.0,
    exposure=75.0,
    urgency=70.0,
    risk_score=71.0,
    severity="HIGH",
    status="OPEN",
    organization_name="Acme Environmental Corp",
    project_name="Telemetry Guard"
)


# ---------------------------------------------------------------------------
# 1. Valid Risk Analysis Request
# ---------------------------------------------------------------------------
def test_valid_risk_analysis_request():
    payload = SAMPLE_CONTEXT.model_dump()
    response = client.post("/internal/risk/analyze", headers=AUTH_HEADERS, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data["data"]
    assert len(data["data"]["key_factors"]) > 0
    assert len(data["data"]["recommendations"]) > 0
    assert 0.0 <= data["data"]["confidence"] <= 1.0


# ---------------------------------------------------------------------------
# 2. Invalid Request Schema (Negative Probability)
# ---------------------------------------------------------------------------
def test_invalid_request_schema():
    payload = SAMPLE_CONTEXT.model_dump()
    payload["probability"] = -5.0  # Invalid bound (<0)
    response = client.post("/internal/risk/analyze", headers=AUTH_HEADERS, json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 3. Missing Required Fields (Missing title)
# ---------------------------------------------------------------------------
def test_missing_required_fields():
    payload = SAMPLE_CONTEXT.model_dump()
    del payload["title"]
    response = client.post("/internal/risk/analyze", headers=AUTH_HEADERS, json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Confidence Boundary 0.0 Accepted
# ---------------------------------------------------------------------------
def test_confidence_boundary_zero():
    data = {
        "summary": "Low confidence analysis due to sparse context.",
        "key_factors": ["Sparse context"],
        "potential_impact": "Uncertain impact",
        "recommendations": ["Gather more telemetry"],
        "confidence": 0.0
    }
    obj = StructuredAIAnalysis.model_validate(data)
    assert obj.confidence == 0.0


# ---------------------------------------------------------------------------
# 5. Confidence Boundary 1.0 Accepted
# ---------------------------------------------------------------------------
def test_confidence_boundary_one():
    data = {
        "summary": "High confidence comprehensive analysis.",
        "key_factors": ["Well documented factor"],
        "potential_impact": "Critical operational halt",
        "recommendations": ["Immediate mitigation"],
        "confidence": 1.0
    }
    obj = StructuredAIAnalysis.model_validate(data)
    assert obj.confidence == 1.0


# ---------------------------------------------------------------------------
# 6. Confidence Below 0.0 Rejected
# ---------------------------------------------------------------------------
def test_confidence_below_zero_rejected():
    data = {
        "summary": "Valid summary",
        "key_factors": ["Factor 1"],
        "potential_impact": "Impact 1",
        "recommendations": ["Rec 1"],
        "confidence": -0.01
    }
    with pytest.raises(ValidationError):
        StructuredAIAnalysis.model_validate(data)


# ---------------------------------------------------------------------------
# 7. Confidence Above 1.0 Rejected
# ---------------------------------------------------------------------------
def test_confidence_above_one_rejected():
    data = {
        "summary": "Valid summary",
        "key_factors": ["Factor 1"],
        "potential_impact": "Impact 1",
        "recommendations": ["Rec 1"],
        "confidence": 1.05
    }
    with pytest.raises(ValidationError):
        StructuredAIAnalysis.model_validate(data)


# ---------------------------------------------------------------------------
# 8. Malformed LLM Response Safely Handled
# ---------------------------------------------------------------------------
def test_malformed_llm_response():
    bad_json_client = StaticResponseClient("NOT A VALID JSON TEXT")
    analyzer = RiskAnalyzer(llm_client=bad_json_client)
    with pytest.raises(ValueError, match="malformed JSON"):
        analyzer.analyze_risk(SAMPLE_CONTEXT)


# ---------------------------------------------------------------------------
# 9. Missing AI Response Safely Handled (Empty string)
# ---------------------------------------------------------------------------
def test_missing_ai_response():
    empty_client = StaticResponseClient("   ")
    analyzer = RiskAnalyzer(llm_client=empty_client)
    with pytest.raises(ValueError, match="empty response"):
        analyzer.analyze_risk(SAMPLE_CONTEXT)


# ---------------------------------------------------------------------------
# 10. LLM Timeout Handled Safely
# ---------------------------------------------------------------------------
def test_llm_timeout():
    timeout_client = TimeoutMockClient()
    analyzer = RiskAnalyzer(llm_client=timeout_client)
    with pytest.raises(LLMTimeoutError, match="timed out"):
        analyzer.analyze_risk(SAMPLE_CONTEXT)


# ---------------------------------------------------------------------------
# 11. LLM Provider Failure Handled Safely
# ---------------------------------------------------------------------------
def test_llm_provider_failure():
    failing_client = FailingMockClient()
    analyzer = RiskAnalyzer(llm_client=failing_client)
    with pytest.raises(LLMClientError, match="Remote LLM Provider Error"):
        analyzer.analyze_risk(SAMPLE_CONTEXT)


# ---------------------------------------------------------------------------
# 12. Internal Service Authentication Enforcement
# ---------------------------------------------------------------------------
def test_internal_service_authentication():
    payload = SAMPLE_CONTEXT.model_dump()

    # 1. Missing header -> 401
    res_no_auth = client.post("/internal/risk/analyze", json=payload)
    assert res_no_auth.status_code == 401

    # 2. Invalid header key -> 401
    res_bad_auth = client.post(
        "/internal/risk/analyze",
        headers={"X-Internal-Service-Key": "completely-invalid-secret-key"},
        json=payload
    )
    assert res_bad_auth.status_code == 401

    # 3. Valid key -> 200
    res_good_auth = client.post(
        "/internal/risk/analyze",
        headers=AUTH_HEADERS,
        json=payload
    )
    assert res_good_auth.status_code == 200


# ---------------------------------------------------------------------------
# 13. Successful Structured Analysis Format
# ---------------------------------------------------------------------------
def test_successful_structured_analysis():
    structured_json = json.dumps({
        "summary": "Structured evaluation confirms compliance vulnerability.",
        "key_factors": ["High penalty risk", "Audit latency"],
        "potential_impact": "Financial sanctions and operational pause.",
        "recommendations": ["Conduct internal audit", "Engage legal counsel"],
        "confidence": 0.88
    })
    custom_client = StaticResponseClient(structured_json)
    analyzer = RiskAnalyzer(llm_client=custom_client)
    result = analyzer.analyze_risk(SAMPLE_CONTEXT)

    assert result.summary == "Structured evaluation confirms compliance vulnerability."
    assert len(result.key_factors) == 2
    assert result.potential_impact == "Financial sanctions and operational pause."
    assert len(result.recommendations) == 2
    assert result.confidence == 0.88


# ---------------------------------------------------------------------------
# 14. Recommendation Array Validation (Empty list rejected)
# ---------------------------------------------------------------------------
def test_recommendation_array_validation():
    data = {
        "summary": "Valid summary",
        "key_factors": ["Factor 1"],
        "potential_impact": "Valid impact",
        "recommendations": [],  # Empty list must fail
        "confidence": 0.5
    }
    with pytest.raises(ValidationError):
        StructuredAIAnalysis.model_validate(data)

    # Blank string items in recommendations list rejected
    data_blank_items = {
        "summary": "Valid summary",
        "key_factors": ["Factor 1"],
        "potential_impact": "Valid impact",
        "recommendations": ["   "],  # Whitespace only must fail
        "confidence": 0.5
    }
    with pytest.raises(ValidationError):
        StructuredAIAnalysis.model_validate(data_blank_items)
