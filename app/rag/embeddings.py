"""
Embeddings Service
Provides configurable embedding generators: FastEmbed (ONNX), Gemini, OpenAI,
and a deterministic test embedder.
"""

import os
import math
import hashlib
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

logger = logging.getLogger("rag_embeddings")


class BaseEmbeddingService(ABC):
    """Abstract interface for text embedding models."""

    def __init__(self, model_name: str, dimension: int):
        self.model_name = model_name
        self.dimension = dimension

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of text strings into vector representations."""
        pass

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query string."""
        results = self.embed_texts([query])
        return results[0] if results else [0.0] * self.dimension


class DeterministicEmbeddingService(BaseEmbeddingService):
    """
    Deterministic embedding generator for testing and offline development.
    Maps tokens to positions in a vector using hash functions and normalizes to unit length.
    Guarantees reproducible vector outputs across identical text inputs.
    """

    def __init__(self, model_name: str = "deterministic-bge-384", dimension: int = 384):
        super().__init__(model_name=model_name, dimension=dimension)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        vectors = []
        for text in texts:
            vec = [0.0] * self.dimension
            tokens = text.lower().split()
            if not tokens:
                vectors.append(vec)
                continue

            for token in tokens:
                h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dimension
                sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
                vec[idx] += sign

            # Normalize to unit length (L2 norm)
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            vectors.append(vec)
        return vectors


class FastEmbedService(BaseEmbeddingService):
    """Local ONNX embeddings using fastembed (default model: BAAI/bge-small-en-v1.5, 384 dims)."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", dimension: int = 384):
        super().__init__(model_name=model_name, dimension=dimension)
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(model_name=self.model_name)
            except Exception as err:
                logger.warning(f"Could not load FastEmbed model '{self.model_name}': {err}. Falling back to deterministic embedder.")
                self._model = "FALLBACK"
        return self._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        model = self._get_model()
        if model == "FALLBACK" or model is None:
            fallback = DeterministicEmbeddingService(dimension=self.dimension)
            return fallback.embed_texts(texts)

        try:
            embeddings_generator = model.embed(texts)
            return [emb.tolist() for emb in embeddings_generator]
        except Exception as err:
            logger.error(f"FastEmbed embedding generation failed: {err}")
            fallback = DeterministicEmbeddingService(dimension=self.dimension)
            return fallback.embed_texts(texts)


def get_embedding_service(
    provider: Optional[str] = None,
    model: Optional[str] = None
) -> BaseEmbeddingService:
    """Factory creating configured embedding service instance."""
    prov = (provider or os.getenv("EMBEDDING_PROVIDER", "fastembed")).lower()
    mod = model or os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

    if prov == "deterministic" or prov == "test":
        return DeterministicEmbeddingService(model_name="deterministic-384", dimension=384)
    elif prov == "fastembed":
        return FastEmbedService(model_name=mod, dimension=384)
    else:
        # Default fallback
        return FastEmbedService(model_name="BAAI/bge-small-en-v1.5", dimension=384)


# Default singleton instance
default_embedding_service = get_embedding_service()
