"""
Document Service
Orchestrates document ingestion, extraction, chunking, embedding,
storage in Qdrant, reprocessing, and deletion.
"""

import os
import logging
from typing import Dict, Any, Optional

from app.schemas.rag import DocumentIngestRequest, DocumentIngestResponse, DocumentDeleteResponse
from app.rag.chunking import extract_document_content, chunk_document, ExtractionError
from app.rag.retrieval import QdrantVectorStore, default_vector_store
from app.rag.embeddings import BaseEmbeddingService, default_embedding_service

logger = logging.getLogger("document_service")


class DocumentService:
    """Service handling document lifecycle in vector database."""

    def __init__(
        self,
        vector_store: Optional[QdrantVectorStore] = None,
        embedding_service: Optional[BaseEmbeddingService] = None
    ):
        self.embedder = embedding_service or default_embedding_service
        self.vector_store = vector_store or default_vector_store

    def ingest_document(self, req: DocumentIngestRequest) -> DocumentIngestResponse:
        """
        Processes document:
        1. Validates file existence
        2. Clears any existing vectors for document_id (idempotent re-indexing)
        3. Extracts text sections preserving structure
        4. Chunks text into semantic overlapping chunks
        5. Embeds and writes chunks to Qdrant
        """
        logger.info(f"Starting ingestion for document {req.document_id} ({req.filename})")

        # 1. Clean up obsolete vectors if reprocessing
        self.vector_store.delete_by_document_id(req.document_id)

        # 2. Extract sections
        try:
            sections = extract_document_content(
                file_path=req.file_path,
                filename=req.filename,
                mime_type=req.mime_type
            )
        except ExtractionError as err:
            logger.error(f"Extraction failed for {req.document_id}: {err}")
            return DocumentIngestResponse(
                success=False,
                document_id=req.document_id,
                chunk_count=0,
                embedding_model=self.embedder.model_name,
                status="FAILED",
                error=str(err)
            )
        except Exception as err:
            logger.error(f"Unexpected error during extraction of {req.document_id}: {err}")
            return DocumentIngestResponse(
                success=False,
                document_id=req.document_id,
                chunk_count=0,
                embedding_model=self.embedder.model_name,
                status="FAILED",
                error=f"Document parsing error: {str(err)}"
            )

        # 3. Chunk sections
        chunks = chunk_document(
            sections=sections,
            document_id=req.document_id,
            organization_id=req.organization_id,
            project_id=req.project_id,
            category=req.category,
            filename=req.filename
        )

        if not chunks:
            return DocumentIngestResponse(
                success=False,
                document_id=req.document_id,
                chunk_count=0,
                embedding_model=self.embedder.model_name,
                status="FAILED",
                error="Document yielded 0 processable text chunks."
            )

        # 4. Embed & write to Qdrant
        try:
            upserted_count = self.vector_store.upsert_chunks(chunks)
            logger.info(f"Successfully indexed document {req.document_id} with {upserted_count} chunks")
            return DocumentIngestResponse(
                success=True,
                document_id=req.document_id,
                chunk_count=upserted_count,
                embedding_model=self.embedder.model_name,
                status="READY",
                error=None
            )
        except Exception as err:
            logger.error(f"Failed to upsert chunks to Qdrant for {req.document_id}: {err}")
            return DocumentIngestResponse(
                success=False,
                document_id=req.document_id,
                chunk_count=0,
                embedding_model=self.embedder.model_name,
                status="FAILED",
                error=f"Vector storage error: {str(err)}"
            )

    def delete_document_vectors(self, document_id: str) -> DocumentDeleteResponse:
        """Deletes all vector points associated with a document."""
        deleted_count = self.vector_store.delete_by_document_id(document_id)
        return DocumentDeleteResponse(
            success=True,
            document_id=document_id,
            deleted_points=deleted_count
        )


# Default singleton instance
default_document_service = DocumentService()
