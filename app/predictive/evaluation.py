"""
Model Evaluation and Feedback Engine
Phase 9: Prediction accuracy validation when prediction horizon expires,
model drift detection, and historical performance tracking.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class FeedbackEvaluator:
    """Evaluates prediction accuracy against observed real-world outcomes."""

    def __init__(self):
        self._feedback_history: List[Dict[str, Any]] = []

    def evaluate_prediction(
        self,
        prediction_record: Dict[str, Any],
        actual_score: float,
        actual_severity: str,
        evaluation_timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compares prediction forecast with actual observed risk state.
        Determines:
        1. Whether binary critical prediction was correct (prob >= 0.5 <-> actual >= 70)
        2. Absolute error between predicted_score and actual_score
        3. Severity match
        """
        now_str = evaluation_timestamp or datetime.now(timezone.utc).isoformat()
        pred_score = float(prediction_record.get("predicted_score", 50.0))
        critical_prob = float(prediction_record.get("critical_probability", 0.5))

        predicted_critical = critical_prob >= 0.50 or pred_score >= 70.0
        actually_critical = actual_score >= 70.0 or actual_severity in ["HIGH", "CRITICAL"]

        prediction_correct = (predicted_critical == actually_critical)
        score_error = round(abs(pred_score - actual_score), 2)
        severity_match = (prediction_record.get("predicted_severity") == actual_severity)

        feedback_entry = {
            "prediction_id": prediction_record.get("prediction_id"),
            "risk_id": prediction_record.get("risk_id"),
            "predicted_score": pred_score,
            "actual_score": actual_score,
            "predicted_severity": prediction_record.get("predicted_severity"),
            "actual_severity": actual_severity,
            "critical_probability": critical_prob,
            "prediction_correct": prediction_correct,
            "severity_match": severity_match,
            "score_error": score_error,
            "evaluated_at": now_str
        }

        self._feedback_history.append(feedback_entry)
        return feedback_entry

    def record_feedback(self, feedback: Any) -> Dict[str, Any]:
        """Convenience method accepting a PredictionFeedbackRequest or dict."""
        pid = getattr(feedback, "prediction_id", None) or (feedback.get("prediction_id") if isinstance(feedback, dict) else "pred_unknown")
        rid = getattr(feedback, "risk_id", None) or (feedback.get("risk_id") if isinstance(feedback, dict) else "risk_unknown")
        score = getattr(feedback, "actual_score", None) or (feedback.get("actual_score") if isinstance(feedback, dict) else 50.0)
        sev = getattr(feedback, "actual_severity", None) or (feedback.get("actual_severity") if isinstance(feedback, dict) else "MEDIUM")
        ts = getattr(feedback, "evaluation_timestamp", None) or (feedback.get("evaluation_timestamp") if isinstance(feedback, dict) else None)

        entry = self.evaluate_prediction(
            prediction_record={"prediction_id": pid, "risk_id": rid, "predicted_score": score, "predicted_severity": sev},
            actual_score=float(score),
            actual_severity=str(sev),
            evaluation_timestamp=ts
        )
        return {
            "status": "SUCCESS",
            "feedback_count": len(self._feedback_history),
            "entry": entry
        }

    def get_summary_metrics(self) -> Dict[str, Any]:
        """Computes aggregate historical accuracy across evaluated feedback."""
        if not self._feedback_history:
            return {
                "total_evaluated": 0,
                "accuracy": 1.0,
                "mean_absolute_error": 0.0,
                "drift_status": "STABLE"
            }

        total = len(self._feedback_history)
        correct_count = sum(1 for f in self._feedback_history if f["prediction_correct"])
        mae = sum(f["score_error"] for f in self._feedback_history) / total
        accuracy = round(correct_count / total, 4)

        # Basic drift heuristic: if accuracy drops below 65% over recent 20 samples
        recent = self._feedback_history[-20:]
        recent_acc = sum(1 for f in recent if f["prediction_correct"]) / len(recent)
        drift_status = "DRIFT_DETECTED" if recent_acc < 0.65 else "STABLE"

        return {
            "total_evaluated": total,
            "accuracy": accuracy,
            "mean_absolute_error": round(mae, 2),
            "recent_accuracy": round(recent_acc, 4),
            "drift_status": drift_status
        }


default_feedback_evaluator = FeedbackEvaluator()
