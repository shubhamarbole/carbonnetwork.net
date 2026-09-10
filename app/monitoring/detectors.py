"""
Deterministic Domain Event Detectors
Inspects resource state transitions and triggers domain events.
Phase 6: Proactive Monitoring & Event Detection
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.schemas.monitoring import MonitoredEventType, MonitoringEventCreate

logger = logging.getLogger("monitoring_detectors")

SEVERITY_RANKS = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4
}


class EventDetector:
    """Detects domain events from current and previous entity snapshots deterministically."""

    @staticmethod
    def detect_risk_events(
        current_risk: Dict[str, Any],
        previous_risk: Optional[Dict[str, Any]] = None
    ) -> List[MonitoringEventCreate]:
        """Detects RISK_SCORE_CHANGED, RISK_ESCALATED, and RISK_DE_ESCALATED."""
        events = []
        org_id = str(current_risk.get("organization_id") or current_risk.get("organizationId") or "org_default")
        proj_id = current_risk.get("project_id") or current_risk.get("projectId")
        if proj_id:
            proj_id = str(proj_id)
        risk_id = str(current_risk.get("risk_id") or current_risk.get("_id") or "unknown_risk")

        curr_score = float(current_risk.get("risk_score") or current_risk.get("score") or 0.0)
        curr_sev = str(current_risk.get("severity") or "LOW").upper()

        if previous_risk:
            prev_score = float(previous_risk.get("risk_score") or previous_risk.get("score") or 0.0)
            prev_sev = str(previous_risk.get("severity") or "LOW").upper()

            # 1. RISK_SCORE_CHANGED
            if round(curr_score, 2) != round(prev_score, 2):
                events.append(MonitoringEventCreate(
                    event_type=MonitoredEventType.RISK_SCORE_CHANGED,
                    organization_id=org_id,
                    project_id=proj_id,
                    resource_type="Risk",
                    resource_id=risk_id,
                    previous_value=prev_score,
                    current_value=curr_score,
                    payload={
                        "title": current_risk.get("title", ""),
                        "category": current_risk.get("category", ""),
                        "score_delta": round(curr_score - prev_score, 2),
                        "previous_severity": prev_sev,
                        "current_severity": curr_sev
                    }
                ))

            # 2. RISK_ESCALATED / RISK_DE_ESCALATED
            curr_rank = SEVERITY_RANKS.get(curr_sev, 1)
            prev_rank = SEVERITY_RANKS.get(prev_sev, 1)

            if curr_rank > prev_rank:
                events.append(MonitoringEventCreate(
                    event_type=MonitoredEventType.RISK_ESCALATED,
                    organization_id=org_id,
                    project_id=proj_id,
                    resource_type="Risk",
                    resource_id=risk_id,
                    previous_value=prev_sev,
                    current_value=curr_sev,
                    payload={
                        "title": current_risk.get("title", ""),
                        "category": current_risk.get("category", ""),
                        "previous_severity": prev_sev,
                        "current_severity": curr_sev,
                        "risk_score": curr_score
                    }
                ))
            elif curr_rank < prev_rank:
                events.append(MonitoringEventCreate(
                    event_type=MonitoredEventType.RISK_DE_ESCALATED,
                    organization_id=org_id,
                    project_id=proj_id,
                    resource_type="Risk",
                    resource_id=risk_id,
                    previous_value=prev_sev,
                    current_value=curr_sev,
                    payload={
                        "title": current_risk.get("title", ""),
                        "category": current_risk.get("category", ""),
                        "previous_severity": prev_sev,
                        "current_severity": curr_sev,
                        "risk_score": curr_score
                    }
                ))
        else:
            # Baseline evaluation: if already HIGH or CRITICAL, register escalation check
            if curr_sev in ["HIGH", "CRITICAL"]:
                events.append(MonitoringEventCreate(
                    event_type=MonitoredEventType.RISK_ESCALATED,
                    organization_id=org_id,
                    project_id=proj_id,
                    resource_type="Risk",
                    resource_id=risk_id,
                    previous_value="NONE",
                    current_value=curr_sev,
                    payload={
                        "title": current_risk.get("title", ""),
                        "category": current_risk.get("category", ""),
                        "risk_score": curr_score,
                        "current_severity": curr_sev
                    }
                ))

        return events

    @staticmethod
    def detect_compliance_events(
        record: Dict[str, Any],
        reference_time: Optional[datetime] = None
    ) -> List[MonitoringEventCreate]:
        """Detects COMPLIANCE_DEADLINE_APPROACHING, COMPLIANCE_DEADLINE_MISSED, COMPLIANCE_DOCUMENT_MISSING."""
        events = []
        now = reference_time or datetime.utcnow()
        org_id = str(record.get("organization_id") or record.get("organizationId") or "org_default")
        proj_id = record.get("project_id") or record.get("projectId")
        rec_id = str(record.get("record_id") or record.get("_id") or "compliance_rec")

        status = str(record.get("status") or "PENDING").upper()
        deadline_str = record.get("deadline") or record.get("due_date")

        if deadline_str and status not in ["COMPLETED", "RESOLVED", "WAIVED"]:
            try:
                clean_deadline = str(deadline_str).split("T")[0]
                deadline_dt = datetime.strptime(clean_deadline, "%Y-%m-%d")
                delta_days = (deadline_dt.date() - now.date()).days

                if delta_days < 0:
                    events.append(MonitoringEventCreate(
                        event_type=MonitoredEventType.COMPLIANCE_DEADLINE_MISSED,
                        organization_id=org_id,
                        project_id=proj_id,
                        resource_type="ComplianceRecord",
                        resource_id=rec_id,
                        previous_value=clean_deadline,
                        current_value=f"Missed by {abs(delta_days)} days",
                        payload={
                            "title": record.get("title", "Compliance Obligation"),
                            "days_overdue": abs(delta_days),
                            "deadline": clean_deadline,
                            "status": status
                        }
                    ))
                elif 0 <= delta_days <= 14:
                    events.append(MonitoringEventCreate(
                        event_type=MonitoredEventType.COMPLIANCE_DEADLINE_APPROACHING,
                        organization_id=org_id,
                        project_id=proj_id,
                        resource_type="ComplianceRecord",
                        resource_id=rec_id,
                        previous_value=clean_deadline,
                        current_value=f"{delta_days} days remaining",
                        payload={
                            "title": record.get("title", "Compliance Obligation"),
                            "days_remaining": delta_days,
                            "deadline": clean_deadline,
                            "status": status
                        }
                    ))
            except Exception as e:
                logger.warning(f"Could not parse compliance deadline '{deadline_str}': {e}")

        # Missing documentation check
        docs = record.get("documents") or record.get("evidence")
        if docs is None or (isinstance(docs, list) and len(docs) == 0):
            events.append(MonitoringEventCreate(
                event_type=MonitoredEventType.COMPLIANCE_DOCUMENT_MISSING,
                organization_id=org_id,
                project_id=proj_id,
                resource_type="ComplianceRecord",
                resource_id=rec_id,
                previous_value=None,
                current_value="Missing",
                payload={
                    "title": record.get("title", "Compliance Obligation"),
                    "status": status,
                    "requirement": record.get("requirement", "Mandatory certification documentation")
                }
            ))

        return events

    @staticmethod
    def detect_esg_events(
        metric: Dict[str, Any],
        threshold: float = 100.0
    ) -> List[MonitoringEventCreate]:
        """Detects ESG_THRESHOLD_EXCEEDED, ESG_DATA_MISSING, ESG_DATA_OVERDUE."""
        events = []
        org_id = str(metric.get("organization_id") or metric.get("organizationId") or "org_default")
        proj_id = metric.get("project_id") or metric.get("projectId")
        metric_id = str(metric.get("metric_id") or metric.get("_id") or "esg_metric")
        metric_name = str(metric.get("name") or metric.get("indicator") or "ESG Metric")

        val = metric.get("value")
        if val is None or str(val).strip() in ["", "null", "none"]:
            events.append(MonitoringEventCreate(
                event_type=MonitoredEventType.ESG_DATA_MISSING,
                organization_id=org_id,
                project_id=proj_id,
                resource_type="ESGMetric",
                resource_id=metric_id,
                previous_value=None,
                current_value=None,
                payload={"metric_name": metric_name, "category": metric.get("category", "ESG")}
            ))
        else:
            try:
                num_val = float(val)
                limit = float(metric.get("threshold", threshold))
                if num_val > limit:
                    events.append(MonitoringEventCreate(
                        event_type=MonitoredEventType.ESG_THRESHOLD_EXCEEDED,
                        organization_id=org_id,
                        project_id=proj_id,
                        resource_type="ESGMetric",
                        resource_id=metric_id,
                        previous_value=limit,
                        current_value=num_val,
                        payload={
                            "metric_name": metric_name,
                            "exceeded_by": round(num_val - limit, 2),
                            "threshold": limit,
                            "current_value": num_val
                        }
                    ))
            except (ValueError, TypeError):
                pass

        return events

    @staticmethod
    def detect_carbon_events(
        carbon_record: Dict[str, Any],
        target_limit: Optional[float] = None
    ) -> List[MonitoringEventCreate]:
        """Detects CARBON_THRESHOLD_EXCEEDED, CARBON_DATA_MISSING, CARBON_TARGET_DEVIATION."""
        events = []
        org_id = str(carbon_record.get("organization_id") or carbon_record.get("organizationId") or "org_default")
        proj_id = carbon_record.get("project_id") or carbon_record.get("projectId")
        rec_id = str(carbon_record.get("record_id") or carbon_record.get("_id") or "carbon_rec")

        emissions = carbon_record.get("emissions") or carbon_record.get("value")
        target = carbon_record.get("target") or target_limit

        if emissions is None:
            events.append(MonitoringEventCreate(
                event_type=MonitoredEventType.CARBON_DATA_MISSING,
                organization_id=org_id,
                project_id=proj_id,
                resource_type="CarbonRecord",
                resource_id=rec_id,
                previous_value=None,
                current_value=None,
                payload={"source": carbon_record.get("source", "Scope 1/2/3 emissions")}
            ))
        else:
            try:
                curr_emissions = float(emissions)
                if target is not None:
                    target_val = float(target)
                    if curr_emissions > target_val:
                        pct_dev = ((curr_emissions - target_val) / target_val) * 100.0 if target_val > 0 else 100.0
                        events.append(MonitoringEventCreate(
                            event_type=MonitoredEventType.CARBON_TARGET_DEVIATION,
                            organization_id=org_id,
                            project_id=proj_id,
                            resource_type="CarbonRecord",
                            resource_id=rec_id,
                            previous_value=target_val,
                            current_value=curr_emissions,
                            payload={
                                "target": target_val,
                                "emissions": curr_emissions,
                                "deviation_percentage": round(pct_dev, 2)
                            }
                        ))
            except (ValueError, TypeError):
                pass

        return events

    @staticmethod
    def detect_supplier_events(
        supplier: Dict[str, Any],
        previous_supplier: Optional[Dict[str, Any]] = None
    ) -> List[MonitoringEventCreate]:
        """Detects SUPPLIER_RISK_INCREASED, SUPPLIER_DOCUMENT_EXPIRING, SUPPLIER_PERFORMANCE_DETERIORATED."""
        events = []
        org_id = str(supplier.get("organization_id") or supplier.get("organizationId") or "org_default")
        supp_id = str(supplier.get("supplier_id") or supplier.get("_id") or "supplier_1")
        name = supplier.get("name", "Supplier")

        curr_risk = float(supplier.get("risk_score") or supplier.get("riskScore") or 0.0)
        if previous_supplier:
            prev_risk = float(previous_supplier.get("risk_score") or previous_supplier.get("riskScore") or 0.0)
            if curr_risk > prev_risk:
                events.append(MonitoringEventCreate(
                    event_type=MonitoredEventType.SUPPLIER_RISK_INCREASED,
                    organization_id=org_id,
                    project_id=supplier.get("project_id"),
                    resource_type="Supplier",
                    resource_id=supp_id,
                    previous_value=prev_risk,
                    current_value=curr_risk,
                    payload={"supplier_name": name, "increase": round(curr_risk - prev_risk, 2)}
                ))
        return events

    @staticmethod
    def detect_project_events(
        project: Dict[str, Any],
        reference_time: Optional[datetime] = None
    ) -> List[MonitoringEventCreate]:
        """Detects PROJECT_DELAYED, PROJECT_MILESTONE_MISSED, PROJECT_DATA_MISSING."""
        events = []
        now = reference_time or datetime.utcnow()
        org_id = str(project.get("organization_id") or project.get("organizationId") or "org_default")
        proj_id = str(project.get("project_id") or project.get("_id") or "project_1")
        name = project.get("name", "Project")

        end_date_str = project.get("target_end_date") or project.get("endDate")
        status = str(project.get("status") or "ACTIVE").upper()

        if end_date_str and status not in ["COMPLETED", "CANCELLED"]:
            try:
                clean_end = str(end_date_str).split("T")[0]
                end_dt = datetime.strptime(clean_end, "%Y-%m-%d")
                if now.date() > end_dt.date():
                    days_delayed = (now.date() - end_dt.date()).days
                    events.append(MonitoringEventCreate(
                        event_type=MonitoredEventType.PROJECT_DELAYED,
                        organization_id=org_id,
                        project_id=proj_id,
                        resource_type="Project",
                        resource_id=proj_id,
                        previous_value=clean_end,
                        current_value=f"Delayed by {days_delayed} days",
                        payload={"project_name": name, "days_delayed": days_delayed}
                    ))
            except Exception:
                pass
        return events

    @staticmethod
    def detect_predictive_events(
        prediction: Dict[str, Any],
        risk_metadata: Optional[Dict[str, Any]] = None
    ) -> List[MonitoringEventCreate]:
        """Detects PREDICTIVE_RISK_DETECTED and PREDICTIVE_RISK_ESCALATION from forecasts."""
        events = []
        org_id = str(prediction.get("organization_id") or prediction.get("organizationId") or "org_default")
        proj_id = prediction.get("project_id") or prediction.get("projectId")
        if proj_id:
            proj_id = str(proj_id)
        risk_id = str(prediction.get("risk_id") or "unknown_risk")
        critical_prob = float(prediction.get("critical_probability") or 0.0)
        curr_score = float(prediction.get("current_score") or 0.0)
        pred_score = float(prediction.get("predicted_score") or 0.0)
        curr_sev = str(prediction.get("current_severity") or "LOW").upper()
        pred_sev = str(prediction.get("predicted_severity") or "LOW").upper()
        trend = str(prediction.get("trend") or "STABLE").upper()
        factors = prediction.get("top_predictive_factors") or []

        # 1. Critical probability exceeded threshold or high/critical forecast
        if critical_prob >= 0.70 or (pred_sev in ["HIGH", "CRITICAL"] and curr_sev in ["LOW", "MEDIUM"]):
            events.append(MonitoringEventCreate(
                event_type=MonitoredEventType.PREDICTIVE_RISK_DETECTED,
                organization_id=org_id,
                project_id=proj_id,
                resource_type="Risk",
                resource_id=risk_id,
                previous_value=curr_sev,
                current_value=f"Predicted {pred_sev} ({round(critical_prob * 100, 1)}% probability)",
                payload={
                    "risk_id": risk_id,
                    "title": (risk_metadata or {}).get("title", ""),
                    "current_score": curr_score,
                    "predicted_score": pred_score,
                    "current_severity": curr_sev,
                    "predicted_severity": pred_sev,
                    "critical_probability": critical_prob,
                    "trend": trend,
                    "top_predictive_factors": factors,
                    "prediction_horizon_days": prediction.get("prediction_horizon_days", 30)
                }
            ))

        # 2. Significant escalation trajectory forecast
        if trend == "INCREASING" and (pred_score - curr_score) >= 15.0:
            events.append(MonitoringEventCreate(
                event_type=MonitoredEventType.PREDICTIVE_RISK_ESCALATION,
                organization_id=org_id,
                project_id=proj_id,
                resource_type="Risk",
                resource_id=risk_id,
                previous_value=curr_score,
                current_value=pred_score,
                payload={
                    "risk_id": risk_id,
                    "score_increase": round(pred_score - curr_score, 2),
                    "current_severity": curr_sev,
                    "predicted_severity": pred_sev,
                    "trend": trend,
                    "top_predictive_factors": factors
                }
            ))

        return events


default_event_detector = EventDetector()
