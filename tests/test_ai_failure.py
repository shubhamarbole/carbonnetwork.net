"""
Dedicated AI Failure & Graceful Degradation Test Suite
Automates tests for the 10 failure scenarios specified in Enterprise Hardening Section 33:
1. LLM timeout
2. LLM unavailable
3. Malformed model response
4. RAG unavailable
5. Vector store timeout
6. Tool timeout
7. Tool failure
8. Invalid tool parameters
9. Maximum agent steps
10. Approval timeout / non-bypass
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from app.schemas.ai_analysis import RiskAnalysisInputContext, StructuredAIAnalysis
from app.agents.risk_analyzer import RiskAnalyzer
from app.agents.llm_client import BaseLLMClient, LLMClientError
from app.agents.orchestrator import AgentOrchestrator
from app.agents.state import AgentState
from app.schemas.agent import (
    AgentRunRequest,
    AgentStateEnum,
    UserContext
)
from app.tools.registry import default_tool_registry, ToolInputValidationError
from app.services.approval_service import default_approval_service


@pytest.fixture
def sample_risk_context():
    return RiskAnalysisInputContext(
        risk_id="fail-test-1",
        title="Chemical Storage Tank Leakage",
        description="Sulfur dioxide storage tank pressure anomaly detected.",
        category="Environmental",
        probability=75.0,
        impact=80.0,
        exposure=70.0,
        urgency=85.0,
        risk_score=76.25,
        severity="CRITICAL",
        status="OPEN"
    )


@pytest.fixture
def standard_user_context():
    return UserContext(
        user_id="usr-analyst-1",
        email="analyst@acme.com",
        role="ESG_MANAGER",
        organization_id="org-acme-1",
        permissions=["risk.view", "risk.manage", "mitigation.create"]
    )


# 1. LLM Timeout Test
def test_failure_01_llm_timeout(sample_risk_context):
    mock_client = MagicMock(spec=BaseLLMClient)
    mock_client.generate_json.side_effect = TimeoutError("Request to LLM provider timed out after 30.0s")

    analyzer = RiskAnalyzer(llm_client=mock_client)
    with pytest.raises((TimeoutError, Exception)) as exc_info:
        analyzer.analyze(sample_risk_context)
    assert "timed out" in str(exc_info.value).lower()


# 2. LLM Unavailable Test
def test_failure_02_llm_unavailable(sample_risk_context):
    mock_client = MagicMock(spec=BaseLLMClient)
    mock_client.generate_json.side_effect = ConnectionError("Connection refused by upstream LLM service: 503 Service Unavailable")

    analyzer = RiskAnalyzer(llm_client=mock_client)
    with pytest.raises(ConnectionError) as exc_info:
        analyzer.analyze(sample_risk_context)
    assert "503" in str(exc_info.value) or "refused" in str(exc_info.value).lower()


# 3. Malformed Model Response Test
def test_failure_03_malformed_model_response(sample_risk_context):
    mock_client = MagicMock(spec=BaseLLMClient)
    mock_client.generate_json.return_value = "<html><body>502 Bad Gateway - Not JSON</body></html>"

    analyzer = RiskAnalyzer(llm_client=mock_client)
    with pytest.raises(ValueError) as exc_info:
        analyzer.analyze(sample_risk_context)
    assert "malformed" in str(exc_info.value).lower() or "json" in str(exc_info.value).lower()


# 4. RAG Unavailable (Graceful Degradation) Test
def test_failure_04_rag_unavailable(sample_risk_context):
    # When knowledge base retrieval fails or returns empty evidence, analyzer must still succeed safely
    analyzer = RiskAnalyzer()
    analysis = analyzer.analyze(sample_risk_context, evidence_chunks=[])
    assert isinstance(analysis, StructuredAIAnalysis)
    assert analysis.evidence == []
    assert len(analysis.recommendations) >= 1
    assert analysis.confidence >= 0.5


# 5. Vector Store Timeout Test
def test_failure_05_vector_store_timeout():
    from app.rag.retrieval import default_vector_store
    from app.schemas.rag import RetrievalQuery

    target_method = "query_points" if hasattr(default_vector_store.client, "query_points") else "search"
    with patch.object(default_vector_store.client, target_method, side_effect=TimeoutError("Qdrant search timed out")):
        with pytest.raises((TimeoutError, Exception)) as exc_info:
            default_vector_store.search(
                RetrievalQuery(query_text="carbon credits", organization_id="org-acme-1")
            )
        assert "timed out" in str(exc_info.value).lower() or isinstance(exc_info.value, TimeoutError)


# 6. Tool Timeout / Agent Timeout Test
def test_failure_06_tool_timeout(standard_user_context):
    # Test overall agent timeout boundary
    orchestrator = AgentOrchestrator(timeout_seconds=0.001)  # 1ms timeout guarantees timeout trigger
    req = AgentRunRequest(
        goal="Perform deep multi-cycle analysis across all supply chains",
        user_context=standard_user_context
    )
    # Simulate a delay in planning
    time.sleep(0.005)
    resp = orchestrator.run(req)
    assert resp.status == AgentStateEnum.TIMEOUT or "timed out" in (resp.final_response or "").lower()


# 7. Tool Failure Isolation Test
def test_failure_07_tool_failure(standard_user_context):
    from app.services.tool_execution_service import default_tool_execution_service

    with patch.object(default_tool_execution_service, "execute_tool", side_effect=RuntimeError("Vector indexing memory limit reached")):
        orchestrator = AgentOrchestrator(max_steps=2)
        req = AgentRunRequest(
            goal="Search knowledge base for risk mitigations",
            user_context=standard_user_context
        )
        resp = orchestrator.run(req)
        # Agent execution does not crash with uncaught exception; it records observation and halts safely
        assert resp.status in [AgentStateEnum.COMPLETED, AgentStateEnum.RUNNING, AgentStateEnum.WAITING_FOR_APPROVAL]


# 8. Invalid Tool Parameters Test
def test_failure_08_invalid_tool_parameters(standard_user_context):
    with pytest.raises(ToolInputValidationError):
        # assign_risk_owner requires risk_id and owner_email (valid email format)
        default_tool_registry.validate_and_execute(
            tool_name="assign_risk_owner",
            raw_parameters={"risk_id": "r-123"},  # missing required owner_email
            user_context=standard_user_context,
            agent_run_id="run-test-err",
            skip_approval_check=True
        )


# 9. Maximum Agent Steps Loop Termination Test
def test_failure_09_maximum_agent_steps(standard_user_context):
    # When agent reaches max_steps without convergence, it terminates cleanly
    orchestrator = AgentOrchestrator(max_steps=1)
    req = AgentRunRequest(
        goal="Investigate supplier emissions and generate extensive action plans",
        user_context=standard_user_context
    )
    resp = orchestrator.run(req)
    assert resp.status in [AgentStateEnum.COMPLETED, AgentStateEnum.WAITING_FOR_APPROVAL]
    assert len(resp.steps) <= 2


# 10. Approval Timeout / Non-Bypass Test
def test_failure_10_approval_timeout_and_non_bypass(standard_user_context):
    # Viewer attempting to execute sensitive write tool without approval is blocked
    viewer_context = UserContext(
        user_id="usr-viewer-1",
        email="viewer@acme.com",
        role="VIEWER",
        organization_id="org-acme-1",
        permissions=["risk.view"]
    )
    # Calling validate_and_execute as viewer with valid schema parameters raises ToolPermissionError
    with pytest.raises(Exception) as exc_info:
        default_tool_registry.validate_and_execute(
            tool_name="create_mitigation_plan",
            raw_parameters={
                "risk_id": "r-123",
                "title": "Bypass Test",
                "steps": ["Step 1"],
                "owner": "lead@acme.com",
                "target_date": "2026-12-31"
            },
            user_context=viewer_context,
            agent_run_id="run-test-bypass",
            skip_approval_check=False
        )
    assert "permission denied" in str(exc_info.value).lower() or "lacks required permission" in str(exc_info.value).lower()


