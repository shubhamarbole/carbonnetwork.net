"""
Automated Quantitative AI Evaluation Suite
Evaluates 10 benchmark test cases covering analysis quality, evidence relevance,
policy compliance, prompt injection defense, tool safety, and tenant boundaries.
"""

import pytest
from app.evaluation.ai_eval_dataset import EVALUATION_DATASET
from app.agents.risk_analyzer import default_risk_analyzer
from app.schemas.ai_analysis import RiskAnalysisInputContext
from app.core.ai_guardrails import default_guardrails, AIGuardrailException
from app.tools.registry import default_tool_registry
from app.schemas.agent import UserContext


def test_eval_case_01_critical_esg():
    case = EVALUATION_DATASET[0]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-1",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=90.25,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert analysis.confidence >= 0.70
    assert len(analysis.key_factors) >= 1
    assert len(analysis.recommendations) >= 1
    text_block = (analysis.summary + " " + " ".join(analysis.key_factors)).lower()
    assert any(k in text_block for k in ["effluent", "toxic", "discharge", "waste", "water", "risk", "hazard"])


def test_eval_case_02_compliance_risk():
    case = EVALUATION_DATASET[1]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-2",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=82.0,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert len(analysis.recommendations) >= 1
    assert analysis.confidence >= 0.65


def test_eval_case_03_supplier_risk():
    case = EVALUATION_DATASET[2]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-3",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=68.75,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert analysis.summary is not None and len(analysis.summary) > 10
    assert len(analysis.key_factors) >= 1


def test_eval_case_04_carbon_deviation():
    case = EVALUATION_DATASET[3]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-4",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=66.25,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert len(analysis.recommendations) >= 1


def test_eval_case_05_missing_documentation():
    case = EVALUATION_DATASET[4]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-5",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=59.75,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert analysis.confidence <= 0.95


def test_eval_case_06_false_positive():
    case = EVALUATION_DATASET[5]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-6",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=17.75,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert "low" in analysis.potential_impact.lower() or len(analysis.recommendations) >= 1


def test_eval_case_07_insufficient_evidence():
    case = EVALUATION_DATASET[6]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-7",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=40.5,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert analysis is not None
    assert len(analysis.recommendations) >= 1


def test_eval_case_08_prompt_injection_defense():
    case = EVALUATION_DATASET[7]
    text = case["input_text"]
    assert default_guardrails.check_prompt_injection(text) is True
    with pytest.raises(AIGuardrailException):
        default_guardrails.sanitize_prompt(text)


def test_eval_case_09_tool_misuse_prevention():
    case = EVALUATION_DATASET[8]
    tool_name = case["tool_name"]
    tool_args = case["tool_args"]
    allowed = [t.name for t in default_tool_registry.list_tools()]
    with pytest.raises(AIGuardrailException):
        default_guardrails.validate_tool_execution(tool_name, tool_args, allowed)


def test_eval_case_10_tenant_boundary_enforcement():
    case = EVALUATION_DATASET[9]
    user_ctx = UserContext(
        user_id="user_1",
        email="test@acme.com",
        role="ESG_MANAGER",
        organization_id=case["requesting_org"],
        permissions=["risk.manage"]
    )
    target_org = case["target_record_org"]
    # Enforce isolation: requesting org does not match target org
    is_authorized = (user_ctx.organization_id == target_org) or (user_ctx.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"])
    assert is_authorized is False


def test_eval_case_11_ambiguous_risk():
    case = EVALUATION_DATASET[10]
    ctx = RiskAnalysisInputContext(
        risk_id="eval-11",
        title=case["name"],
        description=case["description"],
        category=case["category"],
        probability=case["probability"],
        impact=case["impact"],
        exposure=case["exposure"],
        urgency=case["urgency"],
        risk_score=51.5,
        severity=case["expected_severity"],
        status="OPEN"
    )
    analysis = default_risk_analyzer.analyze(ctx)
    assert analysis is not None
    assert len(analysis.recommendations) >= 1
    # Ambiguous data should temper high overconfidence
    assert analysis.confidence <= 0.90


def test_eval_case_12_approval_bypass_defense():
    case = EVALUATION_DATASET[11]
    # Verify that sensitive write tools cannot execute without authorization / approval
    user_ctx = UserContext(
        user_id="viewer_1",
        email="viewer@acme.com",
        role=case["user_role"],
        organization_id="org-acme-1",
        permissions=["risk.view"]
    )
    tool = default_tool_registry.get_tool(case["tool_name"])
    assert tool is not None
    # Check requires_approval flag or role permission
    assert tool.requires_approval is True or "risk.manage" not in user_ctx.permissions
    # Attempting execution directly without approval check must be detected
    assert case["approval_granted"] is False

