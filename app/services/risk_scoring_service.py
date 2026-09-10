"""
Risk Scoring Service
Deterministic Python engine for calculating authoritative risk score and severity.
"""

from typing import Tuple, Dict, Any


def validate_factor(name: str, value: float) -> float:
    """Validates that a scoring factor is a float/int within bounds 0 to 100."""
    try:
        val = float(value)
    except (ValueError, TypeError):
        raise ValueError(f"{name} must be a valid number between 0 and 100.")

    if val < 0 or val > 100:
        raise ValueError(f"{name} must be between 0 and 100. Received: {val}")

    return val


def calculate_risk_score(
    probability: float,
    impact: float,
    exposure: float = 50.0,
    urgency: float = 50.0
) -> float:
    """
    Authoritative Deterministic Risk Score Formula:
    Risk Score = (probability * 0.35) + (impact * 0.35) + (exposure * 0.20) + (urgency * 0.10)
    
    Consistently rounded to two decimal places.
    """
    prob_val = validate_factor("Probability", probability)
    imp_val = validate_factor("Impact", impact)
    exp_val = validate_factor("Exposure", exposure)
    urg_val = validate_factor("Urgency", urgency)

    raw_score = (prob_val * 0.35) + (imp_val * 0.35) + (exp_val * 0.20) + (urg_val * 0.10)
    return round(raw_score, 2)


def classify_severity(score: float) -> str:
    """
    Deterministic Severity Classification:
    - 0 <= score < 25: LOW
    - 25 <= score < 50: MEDIUM
    - 50 <= score < 75: HIGH
    - 75 <= score <= 100: CRITICAL
    """
    if score < 0 or score > 100:
        raise ValueError(f"Score must be between 0 and 100. Received: {score}")

    if score < 25.0:
        return "LOW"
    elif score < 50.0:
        return "MEDIUM"
    elif score < 75.0:
        return "HIGH"
    else:
        return "CRITICAL"


def compute_authoritative_score(
    probability: float,
    impact: float,
    exposure: float = 50.0,
    urgency: float = 50.0
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Computes score, severity, and exact factor breakdown.
    """
    prob_val = validate_factor("Probability", probability)
    imp_val = validate_factor("Impact", impact)
    exp_val = validate_factor("Exposure", exposure)
    urg_val = validate_factor("Urgency", urgency)

    score = calculate_risk_score(prob_val, imp_val, exp_val, urg_val)
    severity = classify_severity(score)

    breakdown = {
        "probability_contribution": round(prob_val * 0.35, 2),
        "impact_contribution": round(imp_val * 0.35, 2),
        "exposure_contribution": round(exp_val * 0.20, 2),
        "urgency_contribution": round(urg_val * 0.10, 2),
        "weights": {
            "probability": 0.35,
            "impact": 0.35,
            "exposure": 0.20,
            "urgency": 0.10
        }
    }

    return score, severity, breakdown
