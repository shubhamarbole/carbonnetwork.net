"""
Configuration for AI Risk Manager
Handles environment variables for AI model providers, internal authentication, and service settings.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env if available
load_dotenv()

class Settings:
    # Internal service authentication key (shared between Express gateway and Python service)
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "esg-ai-internal-service-key-secret-2026")

    # AI Provider configuration: "gemini", "openai", or "mock"
    # Defaults to gemini if GEMINI_API_KEY is present, or mock if no key is set
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini" if os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY") else "mock").lower()

    # Model identifiers
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-1.5-flash" if AI_PROVIDER == "gemini" else "gpt-4o-mini" if AI_PROVIDER == "openai" else "deterministic-risk-analyst-v1")

    # API Keys
    AI_API_KEY: str = os.getenv("AI_API_KEY", os.getenv("GEMINI_API_KEY", os.getenv("OPENAI_API_KEY", "")))

    # Phase 8: AI Governance & Model Versioning
    LLM_PROVIDER: str = AI_PROVIDER
    LLM_MODEL: str = AI_MODEL
    LLM_MODEL_VERSION: str = os.getenv("LLM_MODEL_VERSION", "1.5-flash")
    PROMPT_VERSION: str = os.getenv("PROMPT_VERSION", "1.0.0")
    AGENT_VERSION: str = "5.0.0"
    TOOL_VERSION: str = "5.0.0"
    RAG_VERSION: str = "4.0.0"
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")

    # Timeouts (in seconds)
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30.0"))

    # Phase 5: Agent settings
    MAX_AGENT_STEPS: int = int(os.getenv("MAX_AGENT_STEPS", "10"))
    AGENT_TIMEOUT: float = float(os.getenv("AGENT_TIMEOUT", "60.0"))
    TOOL_TIMEOUT: float = float(os.getenv("TOOL_TIMEOUT", "15.0"))
    APPROVAL_TIMEOUT: float = float(os.getenv("APPROVAL_TIMEOUT", "86400.0"))
    EXPRESS_URL: str = os.getenv("EXPRESS_URL", "http://localhost:5050")

    # Phase 12: Environment Tier, Resource Limits & Cost Estimation
    ENVIRONMENT_TIER: str = os.getenv("ENVIRONMENT_TIER", "STAGING_PILOT").upper()
    VECTOR_COLLECTION_PREFIX: str = os.getenv("VECTOR_COLLECTION_PREFIX", "pilot_vectors_")
    MAX_TOKENS_PER_REQUEST: int = int(os.getenv("MAX_TOKENS_PER_REQUEST", "4096"))
    MAX_AGENT_RUNS_DAILY: int = int(os.getenv("MAX_AGENT_RUNS_DAILY", "200"))
    MAX_CONCURRENT_AGENT_RUNS: int = int(os.getenv("MAX_CONCURRENT_AGENT_RUNS", "10"))
    ESTIMATED_COST_PER_MILLION_PROMPT: float = float(os.getenv("ESTIMATED_COST_PER_MILLION_PROMPT", "0.50"))
    ESTIMATED_COST_PER_MILLION_COMPLETION: float = float(os.getenv("ESTIMATED_COST_PER_MILLION_COMPLETION", "1.50"))
    ESTIMATED_COST_PER_MILLION_EMBEDDING: float = float(os.getenv("ESTIMATED_COST_PER_MILLION_EMBEDDING", "0.10"))

    def validate_configuration(self) -> dict:
        """Validates critical settings and returns safe sanitized dictionary."""
        if not self.INTERNAL_SERVICE_KEY:
            raise ValueError("CRITICAL: INTERNAL_SERVICE_KEY must not be empty.")

        return {
            "environment_tier": self.ENVIRONMENT_TIER,
            "ai_provider": self.AI_PROVIDER,
            "ai_model": self.AI_MODEL,
            "prompt_version": self.PROMPT_VERSION,
            "agent_version": self.AGENT_VERSION,
            "tool_version": self.TOOL_VERSION,
            "rag_version": self.RAG_VERSION,
            "embedding_model": self.EMBEDDING_MODEL,
            "vector_collection_prefix": self.VECTOR_COLLECTION_PREFIX,
            "max_agent_steps": self.MAX_AGENT_STEPS,
            "max_tokens_per_request": self.MAX_TOKENS_PER_REQUEST,
            "internal_key_configured": bool(self.INTERNAL_SERVICE_KEY),
            "ai_key_configured": bool(self.AI_API_KEY)
        }

settings = Settings()
