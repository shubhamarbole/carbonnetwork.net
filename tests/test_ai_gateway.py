"""
Unit Tests for Phase 17: AI Model Gateway & Tool Registry
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.gateway import default_ai_gateway, RoutingPolicy
from app.tools import default_tool_registry


def test_ai_gateway_routing_policies():
    policies = [
        RoutingPolicy.LOW_COST,
        RoutingPolicy.LOW_LATENCY,
        RoutingPolicy.HIGH_QUALITY,
        RoutingPolicy.TASK_SPECIFIC,
    ]
    for p in policies:
        resp = default_ai_gateway.generate(
            system_prompt="You are an ESG evaluator.",
            user_prompt="Evaluate risk.",
            policy=p.value,
        )
        assert "text" in resp
        assert "provider" in resp
        assert "latency_ms" in resp
        assert resp["estimated_cost_usd"] >= 0.0


def test_ai_gateway_status():
    status = default_ai_gateway.get_status()
    assert status["status"] == "HEALTHY"
    assert status["version"] == "ai-gateway-v2.0"
    assert "google_gemini" in status["active_providers"]
    assert "mock_deterministic" in status["active_providers"]


def test_tool_registry_categories_and_toggle():
    tools = default_tool_registry.list_tools()
    assert len(tools) >= 10

    categories = {t.category for t in tools}
    assert "Risk" in categories
    assert "Optimization" in categories

    # Test toggling tool
    assert default_tool_registry.set_tool_enabled("optimize_risk_portfolio", False) is True
    tool = default_tool_registry.get_tool("optimize_risk_portfolio")
    assert tool.enabled is False

    # Check manifest excludes disabled tool
    manifest = default_tool_registry.get_tools_manifest()
    assert not any(m["name"] == "optimize_risk_portfolio" for m in manifest)

    # Re-enable tool
    default_tool_registry.set_tool_enabled("optimize_risk_portfolio", True)
    assert tool.enabled is True


def test_internal_gateway_and_tools_endpoints():
    client = TestClient(app)

    # 1. Gateway Route
    route_res = client.post(
        "/internal/gateway/route",
        json={
            "system_prompt": "You are an audit reviewer.",
            "user_prompt": "Review compliance.",
            "policy": "LOW_COST"
        }
    )
    assert route_res.status_code == 200
    r_data = route_res.json()
    assert "text" in r_data

    # 2. Gateway Status
    status_res = client.get("/internal/gateway/status")
    assert status_res.status_code == 200
    s_data = status_res.json()
    assert s_data["version"] == "ai-gateway-v2.0"

    # 3. Tool Registry
    tools_res = client.get("/internal/tools/registry")
    assert tools_res.status_code == 200
    t_list = tools_res.json()
    assert len(t_list) >= 10

    # 4. Toggle Tool via API
    patch_res = client.patch(
        "/internal/tools/optimize_risk_portfolio",
        json={"enabled": True}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["enabled"] is True
