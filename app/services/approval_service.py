"""
HITL Approval Service
Evaluates approval policies for tool execution requests.
Manages approval requests, checks, and state transitions.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from app.schemas.approvals import ApprovalRequest, ApprovalStatus
from app.schemas.agent import UserContext
from app.schemas.tools import ToolDefinition, ToolRiskLevel


class ApprovalService:
    """Manages policy evaluation and approval lifecycles for agent write actions."""

    def __init__(self):
        # In-memory store for pending and historic approvals
        self._approvals: Dict[str, ApprovalRequest] = {}

    def requires_approval(
        self,
        tool: ToolDefinition,
        parameters: Dict[str, Any],
        user_context: UserContext
    ) -> Tuple[bool, Optional[str]]:
        """
        Determines whether tool execution must pause for human review.
        Returns: (requires_approval: bool, reason: Optional[str])
        """
        # Read tools never require human approval
        if tool.risk_level == ToolRiskLevel.READ:
            return False, None

        # Tool-specific policies (Section 17)
        if tool.name == "assign_risk_owner":
            return True, f"Policy requires human approval to reassign risk ownership to '{parameters.get('owner_name', parameters.get('owner_id'))}'."

        if tool.name == "update_mitigation_status":
            return True, f"Policy requires human approval to update risk mitigation status to '{parameters.get('status')}'."

        if tool.name == "create_mitigation_plan":
            return True, f"Policy requires human approval to create official mitigation plan '{parameters.get('title')}'."

        if tool.name == "create_alert":
            sev = str(parameters.get("severity", "")).upper()
            if sev in ["CRITICAL", "WARNING"]:
                return True, f"Policy requires human approval to broadcast {sev} system alert."
            return False, None

        # Default fallback for any unspecified write tool
        if tool.risk_level == ToolRiskLevel.WRITE:
            return True, f"Write operation '{tool.name}' requires human-in-the-loop authorization."

        return False, None

    def create_approval_request(
        self,
        agent_run_id: str,
        tool_name: str,
        reason: str,
        parameters: Dict[str, Any]
    ) -> ApprovalRequest:
        approval_id = f"appr_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat() + "Z"
        
        req = ApprovalRequest(
            approval_id=approval_id,
            agent_run_id=agent_run_id,
            tool_name=tool_name,
            reason=reason,
            requested_action=parameters,
            requested_by_agent="RiskAgent",
            status=ApprovalStatus.PENDING,
            created_at=now
        )
        self._approvals[approval_id] = req
        return req

    def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        return self._approvals.get(approval_id)

    def resolve_approval(
        self,
        approval_id: str,
        decision: str,
        user_id: Optional[str] = None
    ) -> Optional[ApprovalRequest]:
        req = self._approvals.get(approval_id)
        if not req:
            return None

        now = datetime.utcnow().isoformat() + "Z"
        decision_upper = decision.upper()

        if decision_upper == "APPROVE":
            req.status = ApprovalStatus.APPROVED
            req.approved_by = user_id or "HumanOperator"
            req.approved_at = now
        elif decision_upper == "REJECT":
            req.status = ApprovalStatus.REJECTED
            req.rejected_by = user_id or "HumanOperator"
            req.rejected_at = now

        return req


default_approval_service = ApprovalService()
