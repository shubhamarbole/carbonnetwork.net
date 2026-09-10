"""
AI Risk Service
Orchestrates risk analysis requests, executes the RiskAnalyzer agent,
and returns validated Pydantic models to the API layer.
"""

import logging
from typing import Optional

from app.schemas.ai_analysis import (
    RiskAnalysisInputContext,
    StructuredAIAnalysis
)
from app.agents.risk_analyzer import RiskAnalyzer
from app.agents.llm_client import BaseLLMClient, get_llm_client

logger = logging.getLogger("ai_risk_service")


class AIRiskService:
    """Service layer managing AI risk evaluation workflows."""

    def __init__(self, analyzer: Optional[RiskAnalyzer] = None):
        self.analyzer = analyzer or RiskAnalyzer()

    def analyze(self, context: RiskAnalysisInputContext) -> StructuredAIAnalysis:
        """
        Executes an AI risk analysis on the provided context.
        Ensures deterministic score values are respected and output conforms to schema.
        """
        logger.info(f"Initiating AI risk analysis for risk_id: {context.risk_id}, category: {context.category}")
        return self.analyzer.analyze_risk(context)


# Global default service instance
default_ai_risk_service = AIRiskService()
