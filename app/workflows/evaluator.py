"""
Deterministic Workflow Condition Evaluator
Phase 7: Alerts + Workflow Automation

Evaluates conditions using safe, strictly bounded mathematical and logical comparisons.
No arbitrary Python, JavaScript, shell, or database query execution is permitted.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from app.schemas.workflow import WorkflowCondition

logger = logging.getLogger("workflow.evaluator")


class WorkflowEvaluator:
    """Safe, deterministic condition evaluator for automated workflows."""

    @staticmethod
    def evaluate_condition(
        condition: Union[WorkflowCondition, Dict[str, Any]],
        context_data: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Evaluates a single condition against context fields.
        Returns (matched: bool, reason: str).
        """
        if isinstance(condition, dict):
            field_name = condition.get("field", "")
            op_val = str(condition.get("operator", "equals")).lower()
            target_val = condition.get("value")
            threshold = condition.get("threshold")
        else:
            field_name = condition.field
            op_val = str(condition.operator).lower()
            target_val = condition.value
            threshold = condition.threshold

        # Extract current value and previous value
        current_val = context_data.get(field_name)
        if current_val is None and "payload" in context_data and isinstance(context_data["payload"], dict):
            current_val = context_data["payload"].get(field_name)
        if current_val is None and "current_value" in context_data:
            current_val = context_data.get("current_value")

        previous_val = context_data.get("previous_value")

        try:
            # 1. Equals
            if op_val in ["equals", "equal"]:
                matched = str(current_val).strip().lower() == str(target_val).strip().lower()
                return matched, f"{field_name} ('{current_val}') == '{target_val}'"

            # 2. Not Equals
            elif op_val in ["not_equals", "not_equal"]:
                matched = str(current_val).strip().lower() != str(target_val).strip().lower()
                return matched, f"{field_name} ('{current_val}') != '{target_val}'"

            # 3. Greater Than
            elif op_val == "greater_than":
                c_num = float(current_val)
                t_num = float(target_val if target_val is not None else threshold or 0)
                matched = c_num > t_num
                return matched, f"{field_name} ({c_num}) > {t_num}"

            # 4. Greater Than Or Equal
            elif op_val == "greater_than_or_equal":
                c_num = float(current_val)
                t_num = float(target_val if target_val is not None else threshold or 0)
                matched = c_num >= t_num
                return matched, f"{field_name} ({c_num}) >= {t_num}"

            # 5. Less Than
            elif op_val == "less_than":
                c_num = float(current_val)
                t_num = float(target_val if target_val is not None else threshold or 0)
                matched = c_num < t_num
                return matched, f"{field_name} ({c_num}) < {t_num}"

            # 6. Less Than Or Equal
            elif op_val == "less_than_or_equal":
                c_num = float(current_val)
                t_num = float(target_val if target_val is not None else threshold or 0)
                matched = c_num <= t_num
                return matched, f"{field_name} ({c_num}) <= {t_num}"

            # 7. Crosses Threshold (previous < threshold <= current)
            elif op_val == "crosses_threshold":
                thresh = float(threshold if threshold is not None else target_val or 75.0)
                c_num = float(current_val if current_val is not None else 0.0)
                p_num = float(previous_val if previous_val is not None else 0.0)
                matched = (p_num < thresh) and (c_num >= thresh)
                return matched, f"{field_name} crossed threshold {thresh} (prev: {p_num}, curr: {c_num})"

            # 8. Increase Percentage
            elif op_val == "increase_percentage":
                pct_target = float(target_val if target_val is not None else threshold or 10.0)
                c_num = float(current_val if current_val is not None else 0.0)
                p_num = float(previous_val if previous_val is not None else 0.0)
                if p_num <= 0:
                    matched = c_num > 0
                    pct = 100.0 if matched else 0.0
                else:
                    pct = ((c_num - p_num) / p_num) * 100.0
                    matched = pct >= pct_target
                return matched, f"{field_name} increased by {pct:.1f}% (target: {pct_target}%)"

            # 9. Decrease Percentage
            elif op_val == "decrease_percentage":
                pct_target = float(target_val if target_val is not None else threshold or 10.0)
                c_num = float(current_val if current_val is not None else 0.0)
                p_num = float(previous_val if previous_val is not None else 0.0)
                if p_num <= 0:
                    matched = False
                    pct = 0.0
                else:
                    pct = ((p_num - c_num) / p_num) * 100.0
                    matched = pct >= pct_target
                return matched, f"{field_name} decreased by {pct:.1f}% (target: {pct_target}%)"

            # 10. Missing
            elif op_val == "missing":
                matched = (current_val is None) or (str(current_val).strip() in ["", "null", "none", "n/a"])
                return matched, f"{field_name} is missing or empty"

            # 11. Overdue
            elif op_val == "overdue":
                if not current_val:
                    return False, f"{field_name} has no date value to evaluate overdue"
                date_str = str(current_val).split("T")[0]
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
                now_date = datetime.utcnow()
                matched = now_date > target_date
                days_diff = (now_date - target_date).days
                return matched, f"{field_name} is overdue by {days_diff} days (deadline: {date_str})"

            return False, f"Unsupported operator '{op_val}'"

        except Exception as err:
            logger.warning(f"Condition evaluation failed for {field_name} with operator {op_val}: {err}")
            return False, f"Evaluation error: {str(err)}"

    @classmethod
    def evaluate_conditions(
        cls,
        conditions: List[Union[WorkflowCondition, Dict[str, Any]]],
        context_data: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """
        Evaluates a set of conditions against context data.
        Returns (all_matched: bool, reasons: List[str]).
        All conditions must match (AND logic).
        """
        if not conditions:
            return True, ["No conditions specified (always matches)"]

        reasons = []
        for cond in conditions:
            matched, reason = cls.evaluate_condition(cond, context_data)
            reasons.append(reason)
            if not matched:
                return False, reasons

        return True, reasons
