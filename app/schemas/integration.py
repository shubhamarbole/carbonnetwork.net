"""
Pydantic Schemas for Real ESG/Carbon Data Integrations
Phase 10: External adapter integration, normalization, validation, and deduplication.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IntegrationProviderType(str, Enum):
    ESG = "ESG"
    CARBON = "CARBON"
    ENERGY = "ENERGY"
    SUPPLIER = "SUPPLIER"
    COMPLIANCE = "COMPLIANCE"
    PROJECT = "PROJECT"


class IntegrationStatus(str, Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"
    PAUSED = "PAUSED"
    SYNCING = "SYNCING"


class SyncType(str, Enum):
    MANUAL = "MANUAL"
    SCHEDULED = "SCHEDULED"
    INCREMENTAL = "INCREMENTAL"
    FULL = "FULL"


class NormalizedDataRecordSchema(BaseModel):
    """Standardized normalized record for any incoming ESG / carbon data point."""
    id: Optional[str] = Field(None, description="Record identifier if persisted")
    source: str = Field(..., description="External source name or adapter ID")
    domain: IntegrationProviderType = Field(..., description="Domain category")
    organization_id: str = Field(..., description="Mandatory tenant isolation identifier")
    project_id: Optional[str] = Field(None, description="Optional project association")
    metric: str = Field(..., description="Standardized metric name")
    value: float = Field(..., description="Numeric metric measurement")
    unit: str = Field(..., description="Standardized engineering unit")
    period: str = Field("realtime", description="Reporting period (e.g. 2026-Q1, 2026-03, realtime)")
    timestamp: str = Field(..., description="ISO 8601 measurement timestamp")
    fingerprint: str = Field(..., description="Deterministic SHA-256 fingerprint for deduplication")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw non-sensitive metadata")


class ConnectionTestRequest(BaseModel):
    """Payload to test connection to an external integration adapter."""
    provider_type: IntegrationProviderType
    adapter_name: str
    config: Dict[str, Any] = Field(default_factory=dict)


class ConnectionTestResponse(BaseModel):
    """Result of connection test."""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class SyncRequest(BaseModel):
    """Request to trigger an integration sync job."""
    integration_id: str
    adapter_name: str
    sync_type: SyncType = SyncType.INCREMENTAL
    organization_id: str
    project_id: Optional[str] = None
    since: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class SyncResponse(BaseModel):
    """Result summary of an integration sync execution."""
    job_id: str
    integration_id: str
    sync_type: str
    status: str
    records_fetched: int
    records_imported: int
    records_skipped_duplicate: int
    errors: List[str] = Field(default_factory=list)
    normalized_records: Optional[List[Dict[str, Any]]] = None
    events_emitted: int = 0
    started_at: str
    completed_at: str
