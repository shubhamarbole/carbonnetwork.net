"""
Risk Router for FastAPI
Provides endpoints for authoritative score recalculation and score history tracking.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.services.risk_scoring_service import (
    compute_authoritative_score,
    validate_factor
)
from app.services.risk_analytics_service import (
    _get_risks_collection,
    _get_history_collection,
    db
)

router = APIRouter()


class ScoreRequest(BaseModel):
    probability: Optional[float] = Field(None, ge=0, le=100, description="Probability factor between 0 and 100")
    impact: Optional[float] = Field(None, ge=0, le=100, description="Impact factor between 0 and 100")
    exposure: Optional[float] = Field(None, ge=0, le=100, description="Exposure factor between 0 and 100")
    urgency: Optional[float] = Field(None, ge=0, le=100, description="Urgency factor between 0 and 100")
    reason: Optional[str] = Field("Manual score recalculation", description="Reason for recalculation")


def _find_risk(risk_id: str) -> Optional[Dict[str, Any]]:
    """Helper to locate risk document by either ObjectId or string ID."""
    risks_col = _get_risks_collection()
    if ObjectId.is_valid(risk_id):
        doc = risks_col.find_one({"_id": ObjectId(risk_id)})
        if doc:
            return doc
    return risks_col.find_one({"_id": risk_id})


def _verify_tenant_access(user: Dict[str, Any], risk: Dict[str, Any]) -> None:
    """Verifies that non-global users only access risks in their organization."""
    role = user.get("role", "VIEWER")
    if role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        return

    user_org_id = user.get("organizationId")
    risk_org_id = risk.get("organizationId")
    if not user_org_id or str(risk_org_id) != str(user_org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have access to this risk record."
        )


@router.post("/{risk_id}/score")
def recalculate_score(
    risk_id: str,
    body: ScoreRequest = ScoreRequest(),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Recalculates authoritative risk score and updates severity, score_version, and score history.
    Enforces deterministic server-side formula:
    Score = (P * 0.35) + (I * 0.35) + (E * 0.20) + (U * 0.10)
    """
    risk = _find_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk record not found."
        )

    _verify_tenant_access(user, risk)

    # Extract or fallback factors
    prob = validate_factor("Probability", body.probability if body.probability is not None else risk.get("probability", 50))
    imp = validate_factor("Impact", body.impact if body.impact is not None else risk.get("impact", 50))
    exp = validate_factor("Exposure", body.exposure if body.exposure is not None else risk.get("exposure", 50))
    urg = validate_factor("Urgency", body.urgency if body.urgency is not None else risk.get("urgency", 50))

    new_score, new_severity, breakdown = compute_authoritative_score(prob, imp, exp, urg)

    old_score = risk.get("risk_score")
    old_severity = risk.get("severity")
    current_version = int(risk.get("score_version", 1))
    new_version = current_version + 1
    now_iso = datetime.now(timezone.utc).isoformat()

    risks_col = _get_risks_collection()
    history_col = _get_history_collection()
    audit_col = db["auditlogs"]

    # 1. Update risk in MongoDB
    risks_col.update_one(
        {"_id": risk["_id"]},
        {
            "$set": {
                "risk_score": new_score,
                "severity": new_severity,
                "probability": prob,
                "impact": imp,
                "exposure": exp,
                "urgency": urg,
                "score_version": new_version,
                "last_scored_at": now_iso,
                "updatedAt": now_iso
            }
        }
    )

    # 2. Insert RiskHistory record
    history_entry = {
        "risk_id": str(risk["_id"]),
        "old_score": old_score,
        "new_score": new_score,
        "old_severity": old_severity,
        "new_severity": new_severity,
        "probability": prob,
        "impact": imp,
        "exposure": exp,
        "urgency": urg,
        "changed_by": user.get("email") or user.get("name") or "User",
        "reason": body.reason or "Manual score recalculation",
        "timestamp": now_iso
    }
    history_col.insert_one(history_entry)

    # 3. Create AuditLog entry
    audit_col.insert_one({
        "organizationId": str(risk.get("organizationId", "")),
        "user": user.get("email") or user.get("name") or "User",
        "userId": str(user.get("userId", "")),
        "action": "RISK_SCORED",
        "riskId": str(risk["_id"]),
        "module": "RiskManager",
        "recordId": str(risk["_id"]),
        "oldValue": str(old_score),
        "newValue": str(new_score),
        "metadata": {
            "oldScore": old_score,
            "newScore": new_score,
            "oldSeverity": old_severity,
            "newSeverity": new_severity,
            "scoreVersion": new_version,
            "breakdown": breakdown,
            "reason": body.reason,
            "timestamp": now_iso
        },
        "timestamp": now_iso
    })

    if old_score is not None and old_score != new_score:
        audit_col.insert_one({
            "organizationId": str(risk.get("organizationId", "")),
            "user": user.get("email") or user.get("name") or "User",
            "userId": str(user.get("userId", "")),
            "action": "RISK_SCORE_CHANGED",
            "riskId": str(risk["_id"]),
            "module": "RiskManager",
            "recordId": str(risk["_id"]),
            "oldValue": str(old_score),
            "newValue": str(new_score),
            "metadata": {"difference": round(new_score - old_score, 2)},
            "timestamp": now_iso
        })

    if old_severity is not None and old_severity != new_severity:
        audit_col.insert_one({
            "organizationId": str(risk.get("organizationId", "")),
            "user": user.get("email") or user.get("name") or "User",
            "userId": str(user.get("userId", "")),
            "action": "RISK_SEVERITY_CHANGED",
            "riskId": str(risk["_id"]),
            "module": "RiskManager",
            "recordId": str(risk["_id"]),
            "oldValue": str(old_severity),
            "newValue": str(new_severity),
            "metadata": {"from": old_severity, "to": new_severity},
            "timestamp": now_iso
        })

    return {
        "success": True,
        "message": f"Authoritative score recalculated to {new_score} ({new_severity}).",
        "data": {
            "risk_id": str(risk["_id"]),
            "risk_score": new_score,
            "severity": new_severity,
            "score_version": new_version,
            "last_scored_at": now_iso,
            "breakdown": breakdown
        }
    }


@router.get("/{risk_id}/score-history")
def get_score_history(
    risk_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves the chronological audit log of score and severity changes for a risk.
    """
    risk = _find_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk record not found."
        )

    _verify_tenant_access(user, risk)

    history_col = _get_history_collection()
    cursor = history_col.find({"risk_id": str(risk["_id"])}).sort("timestamp", -1)

    items: List[Dict[str, Any]] = []
    for doc in cursor:
        item = {
            "_id": str(doc["_id"]),
            "risk_id": doc.get("risk_id"),
            "old_score": doc.get("old_score"),
            "new_score": doc.get("new_score"),
            "old_severity": doc.get("old_severity"),
            "new_severity": doc.get("new_severity"),
            "probability": doc.get("probability"),
            "impact": doc.get("impact"),
            "exposure": doc.get("exposure"),
            "urgency": doc.get("urgency"),
            "changed_by": doc.get("changed_by"),
            "reason": doc.get("reason"),
            "timestamp": doc.get("timestamp")
        }
        items.append(item)

    return {
        "success": True,
        "data": items
    }
