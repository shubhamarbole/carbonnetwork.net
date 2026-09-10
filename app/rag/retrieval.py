"""
Qdrant Vector Database Integration and Tenant-Isolated Semantic Retrieval
Ensures server-side tenant isolation with mandatory organization_id filters.
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    FilterSelector
)

from app.schemas.rag import RetrievedChunk, RetrievalQuery
from app.rag.embeddings import BaseEmbeddingService, default_embedding_service

logger = logging.getLogger("rag_retrieval")

DEFAULT_COLLECTION = os.getenv("QDRANT_COLLECTION", "ai_risk_knowledge")


class QdrantVectorStore:
    """Manages Qdrant vector storage and tenant-partitioned retrieval."""

    def __init__(
        self,
        collection_name: str = DEFAULT_COLLECTION,
        embedding_service: Optional[BaseEmbeddingService] = None,
        client: Optional[QdrantClient] = None
    ):
        self.collection_name = collection_name
        self.embedder = embedding_service or default_embedding_service
        self.client = client or self._init_client()
        self._ensure_collection()

    def _init_client(self) -> QdrantClient:
        """Initializes Qdrant client from environment URL, local disk, or fallback in-memory mode."""
        url = os.getenv("QDRANT_URL")
        api_key = os.getenv("QDRANT_API_KEY")

        if url:
            logger.info(f"Connecting to remote Qdrant at {url}")
            return QdrantClient(url=url, api_key=api_key)
        elif os.getenv("TESTING") == "1":
            return QdrantClient(location=":memory:")
        else:
            storage_path = os.getenv("QDRANT_STORAGE_PATH", "./qdrant_storage")
            logger.info(f"Using local embedded Qdrant storage at {storage_path}")
            try:
                return QdrantClient(path=storage_path)
            except Exception as err:
                logger.warning(f"Qdrant storage folder already locked ({err}); using isolated in-memory client.")
                return QdrantClient(location=":memory:")

    def _ensure_collection(self) -> None:
        """Ensures the collection exists with appropriate vector dimensions."""
        try:
            collections = self.client.get_collections().collections
            existing_names = [c.name for c in collections]
            if self.collection_name not in existing_names:
                logger.info(f"Creating Qdrant collection '{self.collection_name}' with dim={self.embedder.dimension}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedder.dimension,
                        distance=Distance.COSINE
                    )
                )
        except Exception as err:
            logger.error(f"Error ensuring Qdrant collection: {err}")

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """
        Embeds chunks and writes vectors with full payload metadata into Qdrant.
        Uses deterministic UUID5 point IDs derived from chunk_id for idempotency.
        """
        if not chunks:
            return 0

        texts = [c["text"] for c in chunks]
        vectors = self.embedder.embed_texts(texts)

        points = []
        for chunk, vector in zip(chunks, vectors):
            # Qdrant requires UUID or integer ID
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk["chunk_id"]))
            payload = {
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "chunk_index": chunk.get("chunk_index", 0),
                "text": chunk["text"],
                "organization_id": str(chunk["organization_id"]),
                "project_id": str(chunk["project_id"]) if chunk.get("project_id") else None,
                "category": chunk.get("category", "Other"),
                "filename": chunk.get("filename", ""),
                "page": chunk.get("page"),
                "section": chunk.get("section")
            }
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        logger.info(f"Upserted {len(points)} chunks into Qdrant collection '{self.collection_name}'")
        return len(points)

    def search(self, query: RetrievalQuery) -> List[RetrievedChunk]:
        """
        Executes semantic vector search with MANDATORY tenant isolation.
        A user from Organization A can never retrieve chunks from Organization B.
        """
        if not query.organization_id or not query.organization_id.strip():
            raise ValueError("Mandatory tenant isolation violated: organization_id cannot be empty.")

        query_vector = self.embedder.embed_query(query.query_text)

        # Build server-side mandatory filter conditions
        must_conditions = [
            FieldCondition(
                key="organization_id",
                match=MatchValue(value=str(query.organization_id))
            )
        ]

        if query.project_id:
            must_conditions.append(
                FieldCondition(
                    key="project_id",
                    match=MatchValue(value=str(query.project_id))
                )
            )

        if query.category and query.category != "ALL":
            must_conditions.append(
                FieldCondition(
                    key="category",
                    match=MatchValue(value=str(query.category))
                )
            )

        query_filter = Filter(must=must_conditions)

        if hasattr(self.client, "query_points"):
            res = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=query.top_k,
                score_threshold=query.min_score
            )
            search_results = res.points
        else:
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=query.top_k,
                score_threshold=query.min_score
            )

        retrieved_chunks = []
        for hit in search_results:
            payload = hit.payload or {}
            retrieved_chunks.append(RetrievedChunk(
                chunk_id=payload.get("chunk_id", str(hit.id)),
                document_id=payload.get("document_id", ""),
                text=payload.get("text", ""),
                score=round(float(hit.score), 4),
                organization_id=payload.get("organization_id", ""),
                project_id=payload.get("project_id"),
                category=payload.get("category"),
                filename=payload.get("filename", "Unknown Document"),
                page=payload.get("page"),
                section=payload.get("section")
            ))

        return retrieved_chunks

    def delete_by_document_id(self, document_id: str) -> int:
        """Deletes all vector points associated with a document_id."""
        if not document_id:
            return 0

        doc_filter = Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=str(document_id))
                )
            ]
        )

        # Count or retrieve points to delete
        try:
            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=doc_filter,
                limit=1000
            )
            count = len(points)
            if count > 0:
                point_ids = [p.id for p in points]
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=point_ids
                )
                logger.info(f"Deleted {count} vector points for document {document_id}")
            return count
        except Exception as err:
            logger.error(f"Failed to delete points for document {document_id}: {err}")
            return 0


# Default singleton instance
default_vector_store = QdrantVectorStore()
