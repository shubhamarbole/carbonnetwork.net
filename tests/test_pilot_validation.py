"""
Unit Tests for Phase 12 Pilot Validation & Predictive Evaluator
Verifies:
- Exact mathematical formulas for confusion matrix, precision, recall, F1, FPR, FNR
- ROC-AUC and Brier Score bounds
- Quantitative AI evaluation runner
- FastAPI internal pilot endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.predictive.predictive_evaluator import (
    calculate_confusion_matrix,
    calculate_classification_metrics,
    calculate_roc_and_brier,
    evaluate_predictive_performance
)
from app.evaluation.eval_runner import run_live_ai_evaluation


def test_confusion_matrix_and_metrics():
    predictions = [
        # TP: predicted positive (0.7 >= 0.4), actual positive (CRITICAL)
        {"critical_probability": 0.75, "predicted_severity": "CRITICAL", "feedback": {"actual_severity": "CRITICAL", "actual_score": 82.0}},
        # FP: predicted positive (0.6 >= 0.4), actual negative (LOW)
        {"critical_probability": 0.60, "predicted_severity": "HIGH", "feedback": {"actual_severity": "LOW", "actual_score": 20.0}},
        # FN: predicted negative (0.2 < 0.4), actual positive (CRITICAL)
        {"critical_probability": 0.20, "predicted_severity": "LOW", "feedback": {"actual_severity": "CRITICAL", "actual_score": 90.0}},
        # TN: predicted negative (0.1 < 0.4), actual negative (LOW)
        {"critical_probability": 0.10, "predicted_severity": "LOW", "feedback": {"actual_severity": "LOW", "actual_score": 15.0}},
    ]

    cm = calculate_confusion_matrix(predictions)
    assert cm["TP"] == 1
    assert cm["FP"] == 1
    assert cm["FN"] == 1
    assert cm["TN"] == 1

    metrics = calculate_classification_metrics(cm)
    # Precision = 1 / (1 + 1) = 0.5
    assert metrics["precision"] == 0.5
    # Recall = 1 / (1 + 1) = 0.5
    assert metrics["recall"] == 0.5
    # F1 = 2 * (0.5 * 0.5) / (0.5 + 0.5) = 0.5
    assert metrics["f1"] == 0.5
    # FPR = 1 / (1 + 1) = 0.5
    assert metrics["false_positive_rate"] == 0.5
    # FNR = 1 / (1 + 1) = 0.5
    assert metrics["false_negative_rate"] == 0.5
    # Accuracy = 2 / 4 = 0.5
    assert metrics["accuracy"] == 0.5


def test_roc_and_brier_bounds():
    predictions = [
        {"critical_probability": 0.85, "feedback": {"actual_severity": "CRITICAL", "actual_score": 80.0}},
        {"critical_probability": 0.15, "feedback": {"actual_severity": "LOW", "actual_score": 10.0}},
        {"critical_probability": 0.90, "feedback": {"actual_severity": "CRITICAL", "actual_score": 95.0}},
        {"critical_probability": 0.05, "feedback": {"actual_severity": "LOW", "actual_score": 5.0}},
    ]
    res = calculate_roc_and_brier(predictions)
    assert 0.5 <= res["roc_auc"] <= 1.0
    assert 0.5 <= res["pr_auc"] <= 1.0
    assert 0.0 <= res["brier_score"] <= 1.0


def test_live_ai_evaluation_runner():
    report = run_live_ai_evaluation()
    assert report["total_cases"] >= 10
    assert report["passed_cases"] > 0
    assert 0.0 <= report["overall_score"] <= 100.0
    assert "structured_validity_rate" in report["metrics"]
    assert report["metrics"]["structured_validity_rate"] >= 0.8
    assert report["metrics"]["security_guardrail_defense_rate"] >= 0.8
    assert report["measured_status"] == "QUANTITATIVE_GROUND_TRUTH"


def test_internal_pilot_endpoints():
    client = TestClient(app)
    
    # 1. Health check verification
    health_res = client.get("/health")
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["version"] in ["12.0.0", "13.0.0", "17.0.0"]
    assert "pilot_readiness" in data["components"]
    assert "predictive_evaluation" in data["components"]
    
    # 2. Predictive evaluate endpoint
    eval_payload = {
        "predictions": [
            {"critical_probability": 0.80, "feedback": {"actual_severity": "CRITICAL", "actual_score": 85.0}},
            {"critical_probability": 0.10, "feedback": {"actual_severity": "LOW", "actual_score": 15.0}}
        ]
    }
    pred_res = client.post("/internal/pilot/predictive/evaluate", json=eval_payload)
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["total_predictions_evaluated"] == 2
    assert "classification_metrics" in pred_data
    assert pred_data["classification_metrics"]["accuracy"] == 1.0
    
    # 3. AI Evaluation run endpoint
    ai_eval_res = client.post("/internal/pilot/evaluation/run")
    assert ai_eval_res.status_code == 200
    ai_data = ai_eval_res.json()
    assert ai_data["total_cases"] >= 10
    assert ai_data["overall_score"] >= 70.0
    
    # 4. Governance limits endpoint
    lim_res = client.get("/internal/pilot/governance/limits")
    assert lim_res.status_code == 200
    lim_data = lim_res.json()
    assert lim_data["max_agent_steps"] >= 5
    assert "cost_model" in lim_data
