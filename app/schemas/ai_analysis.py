"""
Pydantic Schemas for AI Risk Analysis
Enforces strict input context validation and structured LLM output guarantees.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


from app.schemas.rag import EvidenceCitation, RetrievedChunk


class RiskAnalysisInputContext(BaseModel):
    """Authoritative risk context provided by Express gateway for AI analysis."""
    risk_id: str = Field(..., min_length=1, description="Unique risk identifier")
    title: str = Field(..., min_length=1, description="Risk title")
    description: str = Field(..., min_length=1, description="Risk description")
    category: str = Field(..., min_length=1, description="Risk category")
    probability: float = Field(..., ge=0.0, le=100.0, description="Authoritative probability (0-100)")
    impact: float = Field(..., ge=0.0, le=100.0, description="Authoritative impact (0-100)")
    exposure: float = Field(..., ge=0.0, le=100.0, description="Authoritative exposure (0-100)")
    urgency: float = Field(..., ge=0.0, le=100.0, description="Authoritative urgency (0-100)")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Authoritative Phase 2 score (0-100)")
    severity: str = Field(..., description="Authoritative severity (LOW, MEDIUM, HIGH, CRITICAL)")
    status: str = Field("OPEN", description="Current risk lifecycle status")
    organization_name: Optional[str] = Field(None, description="Organization name context")
    project_name: Optional[str] = Field(None, description="Project context")
    history_summary: Optional[str] = Field(None, description="Summary of past score transitions")
    retrieved_evidence: Optional[List[RetrievedChunk]] = Field(None, description="Optional RAG evidence chunks")
    embedding_model: Optional[str] = Field(None, description="Embedding model identifier used for RAG")


class StructuredAIAnalysis(BaseModel):
    """
    Validated structured analysis returned by the LLM.
    Strictly enforced with Pydantic:
    - Non-empty summary
    - Key factors array with non-empty items
    - Non-empty potential impact
    - Recommendations array with non-empty items
    - Confidence between 0.0 and 1.0 inclusive
    - Optional list of evidence citations grounded in knowledge documents
    """
    summary: str = Field(..., min_length=1, description="Concise executive risk summary")
    key_factors: List[str] = Field(..., min_length=1, description="Major contributing factors driving this risk")
    potential_impact: str = Field(..., min_length=1, description="Likely operational/business consequences")
    recommendations: List[str] = Field(..., min_length=1, description="Actionable, practical mitigation actions")
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI confidence estimate between 0.0 and 1.0")
    evidence: List[EvidenceCitation] = Field(default_factory=list, description="Knowledge base evidence citations")

    @field_validator("summary", "potential_impact")
    @classmethod
    def validate_non_blank_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or whitespace only.")
        return v.strip()

    @field_validator("key_factors", "recommendations")
    @classmethod
    def validate_list_items(cls, v: List[str]) -> List[str]:
        if not v or len(v) == 0:
            raise ValueError("Array must contain at least one item.")
        cleaned = [item.strip() for item in v if isinstance(item, str) and item.strip()]
        if not cleaned:
            raise ValueError("Array must contain valid non-empty string items.")
        return cleaned


class InternalAnalysisResponse(BaseModel):
    """Response payload returned by the internal /internal/risk/analyze endpoint."""
    success: bool = True
    data: StructuredAIAnalysis
    model: str
    embedding_model: Optional[str] = None
    prompt_version: str = "1.0.0"
