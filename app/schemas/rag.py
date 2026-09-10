"""
Pydantic Schemas for RAG Knowledge System
Defines models for document ingestion, semantic retrieval queries,
retrieved chunks, and structured evidence citations.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class EvidenceCitation(BaseModel):
    """Structured citation referencing ground-truth organizational knowledge."""
    document_id: str = Field(..., min_length=1, description="Unique ID of source document")
    filename: str = Field(..., min_length=1, description="Name of source file")
    page: Optional[int] = Field(None, ge=1, description="1-indexed page number if applicable")
    section: Optional[str] = Field(None, description="Section heading or numerical section identifier")
    chunk_id: str = Field(..., min_length=1, description="Identifier of the specific chunk")
    relevance: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity / relevance score (0-1)")

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Filename cannot be empty")
        return v.strip()


class RetrievedChunk(BaseModel):
    """Payload representing a chunk retrieved from vector search."""
    chunk_id: str
    document_id: str
    text: str
    score: float
    organization_id: str
    project_id: Optional[str] = None
    category: Optional[str] = None
    filename: str
    page: Optional[int] = None
    section: Optional[str] = None


class RetrievalQuery(BaseModel):
    """Semantic vector query parameters with mandatory tenant isolation."""
    query_text: str = Field(..., min_length=1, description="Search text or formulated risk query")
    organization_id: str = Field(..., min_length=1, description="Mandatory tenant isolation identifier")
    project_id: Optional[str] = None
    category: Optional[str] = None
    top_k: int = Field(5, ge=1, le=25, description="Maximum number of chunks to retrieve")
    min_score: float = Field(0.2, ge=0.0, le=1.0, description="Minimum relevance threshold")


class DocumentIngestRequest(BaseModel):
    """Request payload to extract, chunk, embed, and store document in Qdrant."""
    document_id: str = Field(..., min_length=1)
    file_path: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1)
    mime_type: str = Field(..., min_length=1)
    organization_id: str = Field(..., min_length=1)
    project_id: Optional[str] = None
    category: str = Field("Other")


class DocumentIngestResponse(BaseModel):
    """Response payload returned after document processing."""
    success: bool
    document_id: str
    chunk_count: int
    embedding_model: str
    status: str
    error: Optional[str] = None


class DocumentDeleteResponse(BaseModel):
    """Response payload returned after removing vectors for a document."""
    success: bool
    document_id: str
    deleted_points: int
