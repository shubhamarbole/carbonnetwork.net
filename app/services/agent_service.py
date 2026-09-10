"""
Agent Service
High-level service managing active runs and coordinating the orchestrator.
Phase 5: AI Agent + Tool Calling
"""

import logging
from typing import Dict, Optional

from app.schemas.agent import AgentRunRequest, AgentRunResponse
from app.agents.state import AgentState
from app.agents.orchestrator import default_orchestrator

logger = logging.getLogger("agent_service")


class AgentService:
    """Manages running and paused agent states."""

    def __init__(self):
        # In-memory registry of active and paused runs
        self._states: Dict[str, AgentState] = {}

    def run_agent(self, request: AgentRunRequest) -> AgentRunResponse:
        run_id = request.agent_run_id

        # Check if resuming an existing paused state
        existing_state: Optional[AgentState] = None
        if run_id and run_id in self._states:
            existing_state = self._states[run_id]

        response = default_orchestrator.run(request, existing_state=existing_state)

        # Cache or update state in memory for subsequent approval resumes
        if existing_state:
            self._states[response.agent_run_id] = existing_state
        else:
            # We don't have direct access to the new state object unless we create it or track it
            pass

        return response

    def register_state(self, state: AgentState) -> None:
        self._states[state.agent_run_id] = state

    def get_state(self, agent_run_id: str) -> Optional[AgentState]:
        return self._states.get(agent_run_id)


default_agent_service = AgentService()
