"""
Unit Tests for Risk Scoring Engine (Phase 2)
Verifies:
- Exact formula weighting: (P*0.35) + (I*0.35) + (E*0.20) + (U*0.10)
- Bounds validation (0 to 100)
- Severity classification boundaries: LOW (<25), MEDIUM (25-49.99), HIGH (50-74.99), CRITICAL (75-100)
- Rounding to two decimal places
- Default exposure/urgency handling
"""

import pytest
from app.services.risk_scoring_service import (
    validate_factor,
    calculate_risk_score,
    classify_severity,
    compute_authoritative_score
)


def test_validate_factor_valid():
    assert validate_factor("Prob", 0) == 0.0
    assert validate_factor("Prob", 50) == 50.0
    assert validate_factor("Prob", 100) == 100.0
    assert validate_factor("Prob", "75.5") == 75.5


def test_validate_factor_out_of_bounds():
    with pytest.raises(ValueError, match="must be between 0 and 100"):
        validate_factor("Prob", -1)

    with pytest.raises(ValueError, match="must be between 0 and 100"):
        validate_factor("Prob", 101)

    with pytest.raises(ValueError, match="must be a valid number"):
        validate_factor("Prob", "invalid_number")


def test_calculate_risk_score_formula():
    # P=80, I=70, E=60, U=40
    # 80*0.35 (28) + 70*0.35 (24.5) + 60*0.20 (12) + 40*0.10 (4) = 68.50
    score = calculate_risk_score(probability=80, impact=70, exposure=60, urgency=40)
    assert score == 68.50


def test_calculate_risk_score_boundaries():
    # Min boundary
    assert calculate_risk_score(0, 0, 0, 0) == 0.0
    # Max boundary
    assert calculate_risk_score(100, 100, 100, 100) == 100.0


def test_calculate_risk_score_defaults():
    # Defaults: exposure=50, urgency=50
    # P=50, I=50, E=50, U=50 -> 50*0.35 + 50*0.35 + 50*0.20 + 50*0.10 = 50.0
    assert calculate_risk_score(50, 50) == 50.0

    # P=100, I=0, defaults E=50, U=50 -> 35 + 0 + 10 + 5 = 50.0
    assert calculate_risk_score(100, 0) == 50.0


def test_calculate_risk_score_rounding():
    # 33.33 * 0.35 = 11.6655
    # 33.33 * 0.35 = 11.6655
    # 33.33 * 0.20 = 6.666
    # 33.33 * 0.10 = 3.333
    # Total = 33.33
    assert calculate_risk_score(33.33, 33.33, 33.33, 33.33) == 33.33


def test_classify_severity_boundaries():
    # LOW (< 25)
    assert classify_severity(0.0) == "LOW"
    assert classify_severity(24.99) == "LOW"

    # MEDIUM (25 to < 50)
    assert classify_severity(25.0) == "MEDIUM"
    assert classify_severity(49.99) == "MEDIUM"

    # HIGH (50 to < 75)
    assert classify_severity(50.0) == "HIGH"
    assert classify_severity(74.99) == "HIGH"

    # CRITICAL (75 to 100)
    assert classify_severity(75.0) == "CRITICAL"
    assert classify_severity(100.0) == "CRITICAL"


def test_classify_severity_out_of_bounds():
    with pytest.raises(ValueError):
        classify_severity(-0.1)

    with pytest.raises(ValueError):
        classify_severity(100.1)


def test_compute_authoritative_score():
    score, severity, breakdown = compute_authoritative_score(
        probability=90,
        impact=80,
        exposure=70,
        urgency=60
    )
    # 90*0.35 = 31.5, 80*0.35 = 28.0, 70*0.2 = 14.0, 60*0.1 = 6.0
    # Total = 31.5 + 28.0 + 14.0 + 6.0 = 79.5
    assert score == 79.5
    assert severity == "CRITICAL"
    assert breakdown["probability_contribution"] == 31.5
    assert breakdown["impact_contribution"] == 28.0
    assert breakdown["exposure_contribution"] == 14.0
    assert breakdown["urgency_contribution"] == 6.0
    assert breakdown["weights"]["probability"] == 0.35
    assert breakdown["weights"]["impact"] == 0.35
    assert breakdown["weights"]["exposure"] == 0.20
    assert breakdown["weights"]["urgency"] == 0.10
