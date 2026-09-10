"""
Agent Orchestrator
Coordinates the bounded multi-step reasoning-action loop,
enforcing maximum step limits, timeouts, tool validations, and approval pauses.
Phase 5: AI Agent + Tool Calling
"""

import time
import logging
from typing import Any, Dict, Optional

from app.core.config import settings
from app.schemas.agent import (
    AgentStateEnum,
    AgentStepType,
    AgentRunRequest,
    AgentRunResponse,
    UserContext
)
from app.agents.state import AgentState
from app.agents.risk_agent import RiskAgent
from app.tools.registry import (
    default_tool_registry,
    ToolNotFoundError,
    ToolPermissionError,
    ToolInputValidationError
)
from app.services.approval_service import default_approval_service

logger = logging.getLogger("agent_orchestrator")


class AgentOrchestrator:
    """Bounded loop orchestrator for multi-step agent workflows."""

    def __init__(
        self,
        risk_agent: Optional[RiskAgent] = None,
        max_steps: Optional[int] = None,
        timeout_seconds: Optional[float] = None
    ):
        self.risk_agent = risk_agent or RiskAgent()
        self.max_steps = max_steps or settings.MAX_AGENT_STEPS
        self.timeout_seconds = timeout_seconds or settings.AGENT_TIMEOUT
        self._states: Dict[str, AgentState] = {}

    def run(
        self,
        request: AgentRunRequest,
        existing_state: Optional[AgentState] = None
    ) -> AgentRunResponse:
        """Executes or resumes an agent workflow."""
        start_time = time.time()

        # Initialize or resume state from cache or param
        state = existing_state or (self._states.get(request.agent_run_id) if request.agent_run_id else None) or AgentState(
            goal=request.goal,
            user_context=request.user_context,
            agent_run_id=request.agent_run_id
        )
        self._states[state.agent_run_id] = state
        state.status = AgentStateEnum.RUNNING

        # Handle resume from human approval
        if request.resume_approval_id and request.resume_decision:
            self._handle_approval_resume(request, state)
            if state.status == AgentStateEnum.COMPLETED or state.status == AgentStateEnum.FAILED:
                return state.to_response()

        # Main bounded loop
        while state.step_count < self.max_steps:
            # Check overall agent timeout
            if (time.time() - start_time) > self.timeout_seconds:
                logger.warning(f"Agent run {state.agent_run_id} timed out after {self.timeout_seconds}s")
                state.mark_timeout()
                return state.to_response()

            # 1. Planning Step
            state.status = AgentStateEnum.PLANNING
            decision = self.risk_agent.plan_next_step(state)

            # Case A: Final Response
            if decision.decision == "FINAL_RESPONSE":
                state.add_step(
                    step_type=AgentStepType.FINAL_RESPONSE,
                    input_summary=decision.thought,
                    output_summary=decision.final_response or decision.summary,
                    status="COMPLETED"
                )
                state.mark_completed(
                    final_text=decision.final_response or "Task concluded.",
                    summary=decision.summary
                )
                return state.to_response()

            # Case B: Tool Call
            if decision.decision == "TOOL_CALL" and decision.tool_name:
                state.status = AgentStateEnum.TOOL_EXECUTION
                tool_step = state.add_step(
                    step_type=AgentStepType.TOOL_CALL,
                    tool_name=decision.tool_name,
                    input_summary=f"Parameters: {decision.tool_parameters}",
                    output_summary="Executing tool...",
                    status="IN_PROGRESS"
                )

                try:
                    tool_res = default_tool_registry.validate_and_execute(
                        tool_name=decision.tool_name,
                        raw_parameters=decision.tool_parameters,
                        user_context=state.user_context,
                        agent_run_id=state.agent_run_id,
                        skip_approval_check=False
                    )

                    # Subcase B1: Approval Required (HITL Pause)
                    if tool_res.requires_approval and tool_res.approval_details:
                        tool_step.status = "APPROVAL_REQUIRED"
                        tool_step.output_summary = f"Paused for approval: {tool_res.approval_reason}"

                        approval_step = state.add_step(
                            step_type=AgentStepType.APPROVAL_REQUEST,
                            tool_name=decision.tool_name,
                            input_summary=str(decision.tool_parameters),
                            output_summary=tool_res.approval_reason or "Pending human review",
                            status="PENDING"
                        )

                        from app.schemas.approvals import ApprovalRequest
                        appr_obj = ApprovalRequest(**tool_res.approval_details)
                        state.add_approval(appr_obj)

                        state.add_tool_call(
                            step_id=tool_step.step_id,
                            tool_name=decision.tool_name,
                            validated_input=decision.tool_parameters,
                            result_summary="Execution paused: Awaiting human approval.",
                            status="APPROVAL_REQUIRED",
                            execution_time=tool_res.execution_time_ms
                        )

                        state.mark_waiting_approval(
                            reason=tool_res.approval_reason or "Human approval required",
                            pending_tool_action={
                                "tool_name": decision.tool_name,
                                "parameters": decision.tool_parameters,
                                "approval_id": appr_obj.approval_id
                            }
                        )
                        return state.to_response()

                    # Subcase B2: Tool executed successfully
                    if tool_res.success:
                        tool_step.status = "COMPLETED"
                        out_summary = self._summarize_data(tool_res.data)
                        tool_step.output_summary = out_summary

                        state.add_tool_call(
                            step_id=tool_step.step_id,
                            tool_name=decision.tool_name,
                            validated_input=decision.tool_parameters,
                            result_summary=out_summary,
                            status="SUCCESS",
                            execution_time=tool_res.execution_time_ms
                        )

                        obs = f"Observed from '{decision.tool_name}': {out_summary}"
                        state.context_history.append(obs)
                        state.status = AgentStateEnum.OBSERVING

                    else:
                        # Tool execution error
                        tool_step.status = "FAILED"
                        tool_step.output_summary = tool_res.error or "Tool returned failure"

                        state.add_tool_call(
                            step_id=tool_step.step_id,
                            tool_name=decision.tool_name,
                            validated_input=decision.tool_parameters,
                            result_summary=tool_res.error or "Failure",
                            status="FAILED",
                            execution_time=tool_res.execution_time_ms
                        )
                        state.context_history.append(f"Tool '{decision.tool_name}' failed: {tool_res.error}")
                        state.status = AgentStateEnum.OBSERVING

                except (ToolNotFoundError, ToolPermissionError, ToolInputValidationError) as err:
                    tool_step.status = "ERROR"
                    tool_step.output_summary = str(err)
                    state.context_history.append(f"Tool error: {str(err)}")
                    logger.warning(f"Tool validation/permission error: {err}")
                    state.status = AgentStateEnum.OBSERVING

                except Exception as ex:
                    tool_step.status = "ERROR"
                    tool_step.output_summary = f"Unexpected tool exception: {str(ex)}"
                    state.context_history.append(f"Tool error: {str(ex)}")
                    logger.error(f"Unexpected tool error: {ex}")
                    state.status = AgentStateEnum.OBSERVING

        # Step limit reached
        if state.status not in [AgentStateEnum.COMPLETED, AgentStateEnum.WAITING_FOR_APPROVAL]:
            logger.info(f"Agent run {state.agent_run_id} reached maximum step limit ({self.max_steps}).")
            fallback_summary = (
                f"Agent reached maximum execution bound ({self.max_steps} steps). "
                f"Completed {state.step_count} reasoning and observation cycles without final convergence."
            )
            state.mark_completed(
                final_text=fallback_summary,
                summary="Agent halted at maximum step limit."
            )

        return state.to_response()

    def _handle_approval_resume(self, request: AgentRunRequest, state: AgentState) -> None:
        """Resumes a paused agent execution with the human's approval or rejection decision."""
        decision = (request.resume_decision or "").upper()
        appr_id = request.resume_approval_id

        # Update approval service record
        resolved_appr = default_approval_service.resolve_approval(
            approval_id=appr_id,
            decision=decision,
            user_id=request.user_context.user_id
        )

        if decision == "APPROVE":
            logger.info(f"Resuming agent {state.agent_run_id}: Approval {appr_id} APPROVED.")
            # Execute the approved write tool with skip_approval_check=True
            if state.pending_action:
                tool_name = state.pending_action.get("tool_name")
                params = state.pending_action.get("parameters", {})
                
                step = state.add_step(
                    step_type=AgentStepType.TOOL_CALL,
                    tool_name=tool_name,
                    input_summary=f"Approved execution of: {params}",
                    output_summary="Executing approved write tool...",
                    status="IN_PROGRESS"
                )

                tool_res = default_tool_registry.validate_and_execute(
                    tool_name=tool_name,
                    raw_parameters=params,
                    user_context=state.user_context,
                    agent_run_id=state.agent_run_id,
                    skip_approval_check=True  # Human has authorized this action!
                )

                step.status = "COMPLETED" if tool_res.success else "FAILED"
                out_summary = self._summarize_data(tool_res.data) if tool_res.success else (tool_res.error or "Failed")
                step.output_summary = out_summary

                state.add_tool_call(
                    step_id=step.step_id,
                    tool_name=tool_name,
                    validated_input=params,
                    result_summary=out_summary,
                    status="SUCCESS" if tool_res.success else "FAILED",
                    execution_time=tool_res.execution_time_ms
                )
                state.context_history.append(f"Human APPROVED action '{tool_name}'. Result: {out_summary}")
                state.pending_action = None

        elif decision == "REJECT":
            logger.info(f"Resuming agent {state.agent_run_id}: Approval {appr_id} REJECTED.")
            state.add_step(
                step_type=AgentStepType.PLANNING,
                input_summary=f"Human operator REJECTED proposed action ({appr_id}).",
                output_summary="Halting proposed write operation and formulating safe completion response.",
                status="COMPLETED"
            )
            state.context_history.append(f"Human REJECTED the proposed action. Write operation aborted.")
            state.mark_completed(
                final_text="The proposed write action was rejected by the authorized reviewer. The agent safely concluded the workflow without modifying system state.",
                summary="Proposed action was rejected by human operator."
            )

    def _summarize_data(self, data: Any) -> str:
        """Produces concise, data-only representation of tool results."""
        if data is None:
            return "No data returned."
        if isinstance(data, list):
            return f"Retrieved {len(data)} record(s). Sample: {str(data[:2])}"
        if isinstance(data, dict):
            keys = list(data.keys())
            return f"Record returned with fields: {keys[:5]}."
        return str(data)[:250]


default_orchestrator = AgentOrchestrator()
