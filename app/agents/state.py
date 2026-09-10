"""
Agent Execution State and Lifecycle Management
Tracks step sequences, tool invocations, approvals, and context history.
Phase 5: AI Agent + Tool Calling
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.schemas.agent import (
    AgentStateEnum,
    AgentStepType,
    AgentStepResponse,
    AgentToolCallResponse,
    AgentRunResponse,
    UserContext
)
from app.schemas.approvals import ApprovalRequest


class AgentState:
    """Encapsulates the live state of an agent execution run."""

    def __init__(
        self,
        goal: str,
        user_context: UserContext,
        agent_run_id: Optional[str] = None
    ):
        self.agent_run_id = agent_run_id or f"run_{uuid.uuid4().hex[:12]}"
        self.goal = goal
        self.user_context = user_context
        self.status = AgentStateEnum.QUEUED
        self.step_count = 0
        self.steps: List[AgentStepResponse] = []
        self.tool_calls: List[AgentToolCallResponse] = []
        self.approvals: List[ApprovalRequest] = []
        self.context_history: List[str] = []
        self.result_summary: str = ""
        self.final_response: Optional[str] = None
        self.error_category: Optional[str] = None
        self.pending_action: Optional[Dict[str, Any]] = None
        self.started_at = datetime.utcnow().isoformat() + "Z"
        self.completed_at: Optional[str] = None

    def add_step(
        self,
        step_type: AgentStepType,
        tool_name: Optional[str] = None,
        input_summary: str = "",
        output_summary: str = "",
        status: str = "COMPLETED"
    ) -> AgentStepResponse:
        self.step_count += 1
        step_id = f"step_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat() + "Z"
        step = AgentStepResponse(
            step_id=step_id,
            agent_run_id=self.agent_run_id,
            step_number=self.step_count,
            step_type=step_type,
            tool_name=tool_name,
            input_summary=input_summary,
            output_summary=output_summary,
            status=status,
            created_at=now
        )
        self.steps.append(step)
        return step

    def add_tool_call(
        self,
        step_id: str,
        tool_name: str,
        validated_input: Dict[str, Any],
        result_summary: str = "",
        status: str = "SUCCESS",
        execution_time: float = 0.0
    ) -> AgentToolCallResponse:
        call_id = f"call_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat() + "Z"
        call = AgentToolCallResponse(
            tool_call_id=call_id,
            agent_run_id=self.agent_run_id,
            step_id=step_id,
            tool_name=tool_name,
            validated_input=validated_input,
            result_summary=result_summary,
            status=status,
            execution_time=execution_time,
            created_at=now
        )
        self.tool_calls.append(call)
        return call

    def add_approval(self, approval_req: ApprovalRequest) -> None:
        self.approvals.append(approval_req)

    def mark_completed(self, final_text: str, summary: str = "") -> None:
        self.status = AgentStateEnum.COMPLETED
        self.final_response = final_text
        self.result_summary = summary or (final_text[:200] + "..." if len(final_text) > 200 else final_text)
        self.completed_at = datetime.utcnow().isoformat() + "Z"

    def mark_waiting_approval(self, reason: str, pending_tool_action: Dict[str, Any]) -> None:
        self.status = AgentStateEnum.WAITING_FOR_APPROVAL
        self.result_summary = f"Execution paused: {reason}"
        self.pending_action = pending_tool_action

    def mark_failed(self, error_msg: str, category: str = "EXECUTION_ERROR") -> None:
        self.status = AgentStateEnum.FAILED
        self.error_category = category
        self.result_summary = f"Agent failed: {error_msg}"
        self.final_response = f"Agent halted due to an error: {error_msg}"
        self.completed_at = datetime.utcnow().isoformat() + "Z"

    def mark_timeout(self) -> None:
        self.status = AgentStateEnum.TIMEOUT
        self.error_category = "TIMEOUT"
        self.result_summary = "Agent execution timed out."
        self.final_response = "The task exceeded the maximum execution timeout before completing."
        self.completed_at = datetime.utcnow().isoformat() + "Z"

    def to_response(self) -> AgentRunResponse:
        return AgentRunResponse(
            agent_run_id=self.agent_run_id,
            goal=self.goal,
            status=self.status,
            step_count=self.step_count,
            steps=self.steps,
            tool_calls=self.tool_calls,
            approvals=self.approvals,
            result_summary=self.result_summary,
            final_response=self.final_response,
            error_category=self.error_category,
            started_at=self.started_at,
            completed_at=self.completed_at
        )
