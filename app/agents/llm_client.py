"""
LLM Client Interface and Provider Implementations
Supports Gemini, OpenAI, and an Intelligent Deterministic Mock/Fallback Client.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("risk_llm_client")


class LLMClientError(Exception):
    """Base exception for LLM provider errors."""
    pass


class LLMTimeoutError(LLMClientError):
    """Exception raised when LLM call exceeds timeout threshold."""
    pass


class BaseLLMClient(ABC):
    """Abstract interface for LLM provider clients."""

    def __init__(self, model: str, api_key: Optional[str] = None, timeout: float = 30.0):
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    @abstractmethod
    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        """
        Sends the prompts to the LLM and returns the raw string response,
        which should contain a valid JSON object.
        """
        pass


class GeminiLLMClient(BaseLLMClient):
    """Gemini API client implementation using google.generativeai or REST endpoint."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        if not self.api_key:
            raise LLMClientError("Gemini API key is not configured.")

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)

            # Model setup with system instruction and JSON output mode
            generation_config = {
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "response_mime_type": "application/json",
            }
            model_instance = genai.GenerativeModel(
                model_name=self.model,
                system_instruction=system_prompt,
                generation_config=generation_config
            )
            response = model_instance.generate_content(user_prompt)
            if not response or not response.text:
                raise LLMClientError("Empty response returned by Gemini API.")
            return response.text
        except ImportError:
            # Fallback to direct REST call if SDK missing
            return self._generate_via_rest(system_prompt, user_prompt)
        except Exception as err:
            logger.error(f"Gemini API error: {err}")
            raise LLMClientError(f"Gemini API invocation failed: {str(err)}") from err

    def _generate_via_rest(self, system_prompt: str, user_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                if res.status_code != 200:
                    raise LLMClientError(f"Gemini HTTP {res.status_code}: {res.text}")
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
        except httpx.TimeoutException as err:
            raise LLMTimeoutError(f"Gemini request timed out after {self.timeout}s") from err
        except Exception as err:
            raise LLMClientError(f"Gemini REST error: {str(err)}") from err


class OpenAILLMClient(BaseLLMClient):
    """OpenAI API client implementation using standard chat completions."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        if not self.api_key:
            raise LLMClientError("OpenAI API key is not configured.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code != 200:
                    raise LLMClientError(f"OpenAI HTTP {res.status_code}: {res.text}")
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                if not content:
                    raise LLMClientError("Empty response returned by OpenAI API.")
                return content
        except httpx.TimeoutException as err:
            raise LLMTimeoutError(f"OpenAI request timed out after {self.timeout}s") from err
        except Exception as err:
            raise LLMClientError(f"OpenAI error: {str(err)}") from err


class MockLLMClient(BaseLLMClient):
    """
    Intelligent, deterministic risk analysis generator.
    Used for local development, offline automated tests, or when no LLM API key is present.
    Parses context clues and generates realistic, structured analysis complying with Pydantic schema.
    """

    def generate_json(self, system_prompt: str, user_prompt: str) -> str:
        # Extract title and category from user prompt if available
        title = "Analyzed Risk"
        category = "Operational"
        severity = "HIGH"
        score = 65.0
        prob = 50.0
        imp = 50.0
        exp = 50.0
        urg = 50.0

        for line in user_prompt.splitlines():
            line_str = line.strip()
            if line_str.startswith("- Risk Title:"):
                title = line_str.replace("- Risk Title:", "").strip()
            elif line_str.startswith("- Category:"):
                category = line_str.replace("- Category:", "").strip()
            elif line_str.startswith("- Authoritative Severity:"):
                severity = line_str.replace("- Authoritative Severity:", "").strip()
            elif line_str.startswith("- Authoritative Risk Score:"):
                try:
                    score = float(line_str.replace("- Authoritative Risk Score:", "").strip().split()[0])
                except Exception:
                    pass
            elif line_str.startswith("- Probability:"):
                try:
                    prob = float(line_str.replace("- Probability:", "").strip().split("%")[0])
                except Exception:
                    pass
            elif line_str.startswith("- Impact:"):
                try:
                    imp = float(line_str.replace("- Impact:", "").strip().split("%")[0])
                except Exception:
                    pass

        # Parse knowledge base evidence if present in user prompt
        evidence = []
        has_knowledge_section = "=== RETRIEVED ORGANIZATIONAL KNOWLEDGE BASE EVIDENCE ===" in user_prompt
        no_evidence_found = "NO RELEVANT KNOWLEDGE-BASE EVIDENCE RETRIEVED" in user_prompt

        if has_knowledge_section and not no_evidence_found:
            for line in user_prompt.splitlines():
                # Format: [Source 1] Document ID: doc_123 | File: Policy.pdf | Page: 1 | Section: Section 2 | Chunk ID: chk_123_0000 | Relevance: 0.89
                if line.strip().startswith("[Source"):
                    parts = [p.strip() for p in line.split("|")]
                    doc_id = ""
                    fname = "Knowledge Document"
                    page_num = None
                    section_name = None
                    chunk_id = ""
                    rel_score = 0.85

                    for p in parts:
                        if "Document ID:" in p:
                            doc_id = p.split("Document ID:")[1].strip()
                        elif "File:" in p:
                            fname = p.split("File:")[1].strip()
                        elif "Page:" in p:
                            pg_str = p.split("Page:")[1].strip()
                            if pg_str and pg_str != "N/A" and pg_str.isdigit():
                                page_num = int(pg_str)
                        elif "Section:" in p:
                            sec_str = p.split("Section:")[1].strip()
                            if sec_str and sec_str != "N/A":
                                section_name = sec_str
                        elif "Chunk ID:" in p:
                            chunk_id = p.split("Chunk ID:")[1].strip()
                        elif "Relevance:" in p:
                            try:
                                rel_score = float(p.split("Relevance:")[1].strip())
                            except Exception:
                                pass

                    if doc_id and chunk_id:
                        evidence.append({
                            "document_id": doc_id,
                            "filename": fname,
                            "page": page_num,
                            "section": section_name,
                            "chunk_id": chunk_id,
                            "relevance": rel_score
                        })

        # Build realistic structured response
        if no_evidence_found or (has_knowledge_section and not evidence):
            summary = (
                f"Comprehensive evaluation of '{title}' classifies this as an authoritative {severity} severity "
                f"threat (score: {score:.2f}/100) within the {category} domain. Note that no relevant organizational knowledge "
                f"documents were retrieved from the knowledge base to ground this assessment. Immediate containment and structured "
                f"oversight are warranted to prevent compounding exposures."
            )
        elif evidence:
            summary = (
                f"Comprehensive evidence-grounded evaluation of '{title}' classifies this as an authoritative {severity} severity "
                f"threat (score: {score:.2f}/100) within the {category} domain. Analysis is supported by {len(evidence)} retrieved "
                f"organizational knowledge source(s), including '{evidence[0]['filename']}'. Immediate containment and structured "
                f"oversight are warranted to prevent compounding exposures."
            )
        else:
            summary = (
                f"Comprehensive evaluation of '{title}' classifies this as an authoritative {severity} severity "
                f"threat (score: {score:.2f}/100) within the {category} domain. The primary risk trajectory is driven by "
                f"a probability factor of {prob:.1f}% paired with an operational impact rating of {imp:.1f}%. Immediate "
                f"containment and structured oversight are warranted to prevent compounding exposures."
            )

        key_factors = [
            f"Authoritative {severity} severity score ({score:.2f}/100) reflecting significant organizational exposure.",
            f"Elevated {category} vulnerability profile with probability measured at {prob:.1f}%.",
            f"Potential for secondary cascading operational impacts across dependent enterprise workflows.",
            f"Urgency assessment requires prioritized remediation within the current review cycle."
        ]

        potential_impact = (
            f"Failure to mitigate '{title}' could lead to direct regulatory compliance infractions, "
            f"operational latency, and adverse financial repercussions in the {category} functional area. "
            f"Secondary risks include reputational degradation and disruption to ongoing milestone delivery."
        )

        recommendations = [
            f"Establish immediate cross-functional monitoring cadence targeting {category} vulnerability vectors.",
            f"Implement protective safeguards and failover mechanisms to compress probability from {prob:.1f}% to under 25%.",
            "Assign an executive risk owner to perform bi-weekly audit milestone validations.",
            "Formulate a documented contingency escalation runbook for rapid containment in event of materialization."
        ]

        # Calculate high realistic confidence based on completeness, lowered when ambiguous or unverified
        confidence = 0.92
        if any(w in user_prompt.lower() for w in ["ambiguous", "conflicting", "unverified", "insufficient", "unsubstantiated"]):
            confidence = 0.78

        response_dict = {
            "summary": summary,
            "key_factors": key_factors,
            "potential_impact": potential_impact,
            "recommendations": recommendations,
            "confidence": confidence,
            "evidence": evidence
        }
        return json.dumps(response_dict)


def get_llm_client(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    timeout: Optional[float] = None
) -> BaseLLMClient:
    """Factory creating appropriate LLM client instance based on configuration."""
    prov = (provider or settings.AI_PROVIDER).lower()
    mod = model or settings.AI_MODEL
    key = api_key or settings.AI_API_KEY
    tm = timeout or settings.LLM_TIMEOUT

    if prov == "gemini" and key:
        return GeminiLLMClient(model=mod, api_key=key, timeout=tm)
    elif prov == "openai" and key:
        return OpenAILLMClient(model=mod, api_key=key, timeout=tm)
    else:
        # Deterministic intelligent fallback when keys are absent or provider is mock
        return MockLLMClient(model=mod or "deterministic-risk-analyst-v1", api_key=None, timeout=tm)
