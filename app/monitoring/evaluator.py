"""
Deterministic Rule Condition Evaluator
Evaluates monitored events against rule conditions using safe, strictly bounded logic.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.monitoring import RuleCondition, RuleOperator, MonitoringRuleResponse, MonitoringRuleCreate

logger = logging.getLogger("monitoring_evaluator")


class RuleEvaluator:
    """Evaluates rule conditions against detected events deterministically."""

    @staticmethod
    def evaluate_condition(condition: RuleCondition, event_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Evaluates a single condition against event fields.
        Returns (matched: bool, reason: str).
        """
        field_name = condition.field
        op_val = getattr(condition.operator, "value", str(condition.operator)).lower()
        target_val = condition.value
        threshold = condition.threshold

        # Extract current value and previous value from event context
        current_val = event_data.get(field_name)
        if current_val is None and "payload" in event_data and isinstance(event_data["payload"], dict):
            current_val = event_data["payload"].get(field_name)
        if current_val is None:
            current_val = event_data.get("current_value")

        previous_val = event_data.get("previous_value")

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
                # Parse date
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
    def evaluate_rule(cls, rule: Any, event_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Evaluates an entire rule against event data.
        Returns (matched: bool, reasons: List[str]).
        All conditions must match (AND logic).
        """
        # Event type filter
        rule_event_type = getattr(rule, "event_type", None) or (rule.get("event_type") if isinstance(rule, dict) else None)
        event_type = event_data.get("event_type")
        r_type_clean = str(getattr(rule_event_type, "value", rule_event_type)).split(".")[-1]
        e_type_clean = str(getattr(event_type, "value", event_type)).split(".")[-1]
        if r_type_clean != e_type_clean:
            return False, [f"Event type mismatch: rule requires {r_type_clean}, got {e_type_clean}"]

        # Tenant filter
        rule_org = rule.get("organization_id") if isinstance(rule, dict) else getattr(rule, "organization_id", None)
        event_org = event_data.get("organization_id")
        if rule_org and event_org and str(rule_org) != str(event_org):
            return False, ["Tenant organization mismatch"]

        # Project filter
        rule_proj = rule.get("project_id") if isinstance(rule, dict) else getattr(rule, "project_id", None)
        event_proj = event_data.get("project_id")
        if rule_proj and event_proj and str(rule_proj) != str(event_proj):
            return False, ["Project scope mismatch"]

        conditions = rule.get("conditions", []) if isinstance(rule, dict) else getattr(rule, "conditions", [])
        if not conditions:
            return True, ["Rule has no conditions, matches by event type"]

        reasons = []
        for cond in conditions:
            if isinstance(cond, dict):
                cond_obj = RuleCondition(**cond)
            else:
                cond_obj = cond

            matched, reason = cls.evaluate_condition(cond_obj, event_data)
            reasons.append(reason)
            if not matched:
                return False, reasons

        return True, reasons


default_rule_evaluator = RuleEvaluator()
