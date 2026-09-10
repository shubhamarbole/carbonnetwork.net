"""
AI Guardrails and Prompt-Injection Defense
Enforces input validation, adversarial injection detection, tool allowlisting,
and safe output boundaries for LLMs, RAG, and AI Agents.
"""

import re
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("ai_guardrails")

# Prohibited adversarial patterns (case-insensitive)
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(prior|previous)\s+instructions",
    r"system\s+prompt\s+override",
    r"you\s+are\s+now\s+(an\s+unrestricted|in\s+developer\s+mode|dan)",
    r"reveal\s+(the\s+)?(api\s+key|internal\s+key|system\s+secret|password)",
    r"export\s+all\s+(tenants|organizations|users|credentials)",
    r"bypass\s+(all\s+)?(safety|security|tenant)\s+controls",
    r"drop\s+(database|table|collection)",
    r"<script.*?>.*?<\/script>"
]

# Explicitly disallowed tool execution substrings
DISALLOWED_EXECUTION_KEYWORDS = [
    "exec(", "eval(", "os.system", "subprocess", "__import__",
    "child_process", "/bin/sh", "cmd.exe", "powershell.exe"
]


class AIGuardrailException(ValueError):
    """Raised when an AI input or action violates security policies."""
    pass


class AIGuardrails:
    """Centralized AI Guardrails engine."""

    @staticmethod
    def check_prompt_injection(text: str) -> bool:
        """
        Returns True if prompt injection or adversarial override is detected.
        """
        if not text:
            return False
        
        lowered = text.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, lowered, re.IGNORECASE):
                logger.warning(f"Prompt injection pattern detected: '{pattern}' in text: {text[:60]}...")
                return True
        return False

    @staticmethod
    def sanitize_prompt(text: str, max_length: int = 15000) -> str:
        """
        Sanitizes input prompt and strips dangerous tags/patterns.
        """
        if not text:
            return ""
        
        # Bounds check
        clipped = text[:max_length]

        # Strip HTML/script tags
        cleaned = re.sub(r"<script.*?>.*?<\/script>", "[STRIPPED_TAG]", clipped, flags=re.IGNORECASE | re.DOTALL)
        
        # Check for injection attempt
        if AIGuardrails.check_prompt_injection(cleaned):
            raise AIGuardrailException("Input contains potential prompt injection or unauthorized directive.")

        return cleaned

    @staticmethod
    def validate_prompt(text: str) -> str:
        """Validates and sanitizes prompt, raising AIGuardrailException if injection detected."""
        return AIGuardrails.sanitize_prompt(text)

    @staticmethod
    def validate_tool_execution(tool_name: str, arguments: Dict[str, Any], allowed_tools: List[str]) -> None:
        """
        Validates that the requested tool is allowlisted and arguments contain no code injection.
        """
        if tool_name not in allowed_tools:
            raise AIGuardrailException(f"Tool '{tool_name}' is not in the authorized tool allowlist.")

        # Deep inspect arguments for command injection strings
        args_str = str(arguments).lower()
        for kw in DISALLOWED_EXECUTION_KEYWORDS:
            if kw in args_str:
                logger.error(f"Malicious code/command execution keyword '{kw}' blocked in tool arguments.")
                raise AIGuardrailException(f"Disallowed execution keyword '{kw}' detected in tool parameters.")

    @staticmethod
    def sanitize_rag_chunk(chunk_text: str, max_chars: int = 2500) -> str:
        """
        Sanitizes knowledge chunks before prompt injection.
        """
        if not chunk_text:
            return ""
        
        clipped = chunk_text[:max_chars]
        # Neutralize common markdown/format breakout delimiters
        neutralized = clipped.replace("```", "'''").replace("system:", "source_text:")
        return neutralized

default_guardrails = AIGuardrails()
