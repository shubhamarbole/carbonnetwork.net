"""
Internal API Router for Knowledge Base & RAG Operations
Exposes endpoints for document ingestion, semantic vector retrieval,
and vector deletion, protected with internal service key authentication.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.schemas.rag import (
    DocumentIngestRequest,
    DocumentIngestResponse,
    RetrievalQuery,
    RetrievedChunk,
    DocumentDeleteResponse
)
from app.services.document_service import default_document_service
from app.rag.retrieval import default_vector_store

logger = logging.getLogger("knowledge_api")

router = APIRouter()


def verify_internal_auth(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> None:
    """Verifies that the request originates from an authorized internal service (Express gateway)."""
    expected_key = settings.INTERNAL_SERVICE_KEY
    if not x_internal_service_key or x_internal_service_key != expected_key:
        logger.warning("Unauthorized access attempt to internal knowledge endpoint.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing or invalid internal service key."
        )


@router.post(
    "/ingest",
    response_model=DocumentIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest and Index Knowledge Document"
)
def ingest_document(
    body: DocumentIngestRequest,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> DocumentIngestResponse:
    verify_internal_auth(x_internal_service_key)
    res = default_document_service.ingest_document(body)
    return res


@router.post(
    "/search",
    response_model=List[RetrievedChunk],
    status_code=status.HTTP_200_OK,
    summary="Semantic Retrieval with Mandatory Tenant Scoping"
)
def search_knowledge(
    body: RetrievalQuery,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> List[RetrievedChunk]:
    verify_internal_auth(x_internal_service_key)
    try:
        results = default_vector_store.search(body)
        return results
    except ValueError as err:
        logger.error(f"Tenant isolation or query error: {err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )
    except Exception as err:
        logger.error(f"Vector search failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic retrieval error: {str(err)}"
        )


@router.delete(
    "/documents/{document_id}",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Document Vectors"
)
def delete_document_vectors(
    document_id: str,
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
) -> DocumentDeleteResponse:
    verify_internal_auth(x_internal_service_key)
    return default_document_service.delete_document_vectors(document_id)
