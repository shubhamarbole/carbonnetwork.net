"""
Data Integrations Microservice API Router
Phase 10: Ingestion adapters, connectivity testing, normalization, validation, and deduplication.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends

from app.schemas.integration import (
    ConnectionTestRequest,
    ConnectionTestResponse,
    SyncRequest,
    SyncResponse,
    IntegrationProviderType,
    SyncType
)
from app.integrations.registry import AdapterRegistry
from app.ingestion.validator import validate_batch
from app.ingestion.deduplicator import deduplicate_records
from app.ingestion.normalizer import normalize_record

logger = logging.getLogger("integrations_api")
router = APIRouter()


@router.get("/adapters", tags=["Integrations"])
def list_adapters():
    """List all registered integration adapters and their supported metrics."""
    return {
        "success": True,
        "adapters": AdapterRegistry.list_available_adapters()
    }


@router.post("/test", response_model=ConnectionTestResponse, tags=["Integrations"])
def test_adapter_connection(request: ConnectionTestRequest):
    """Test connection parameters with external adapter."""
    adapter = AdapterRegistry.get_adapter(request.adapter_name, request.config)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Adapter '{request.adapter_name}' not found.")

    success, message = adapter.test_connection(request.config)
    return ConnectionTestResponse(
        success=success,
        message=message,
        details={"adapter": request.adapter_name, "provider_type": request.provider_type.value}
    )


@router.post("/sync", response_model=SyncResponse, tags=["Integrations"])
def execute_adapter_sync(request: SyncRequest):
    """Fetches, normalizes, validates, and deduplicates records from an integration adapter."""
    adapter = AdapterRegistry.get_adapter(request.adapter_name, request.config or {})
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Adapter '{request.adapter_name}' not found.")

    job_id = f"job-{uuid.uuid4().hex[:12]}"
    started_at = datetime.now(timezone.utc).isoformat()
    errors = []

    # 1. Parse 'since' timestamp
    since_dt = None
    if request.since:
        try:
            since_dt = datetime.fromisoformat(request.since.replace("Z", "+00:00"))
        except Exception:
            since_dt = None

    # 2. Fetch raw data
    try:
        raw_data = adapter.fetch_data(request.sync_type.value, since=since_dt)
    except Exception as err:
        logger.error(f"Failed fetching data from adapter '{request.adapter_name}': {err}")
        completed_at = datetime.now(timezone.utc).isoformat()
        return SyncResponse(
            job_id=job_id,
            integration_id=request.integration_id,
            sync_type=request.sync_type.value,
            status="FAILED",
            records_fetched=0,
            records_imported=0,
            records_skipped_duplicate=0,
            errors=[f"Fetch error: {str(err)}"],
            started_at=started_at,
            completed_at=completed_at
        )

    records_fetched = len(raw_data)

    # 3. Normalize
    normalized_raw = adapter.normalize(raw_data, request.organization_id, request.project_id)
    normalized = [normalize_record(r) for r in normalized_raw]

    # 4. Validate
    valid_records, val_errors = validate_batch(normalized)
    errors.extend(val_errors)

    # 5. Deduplicate
    unique_records, dup_count = deduplicate_records(valid_records)

    completed_at = datetime.now(timezone.utc).isoformat()
    status = "SUCCESS" if not errors else ("PARTIAL" if unique_records else "FAILED")

    return SyncResponse(
        job_id=job_id,
        integration_id=request.integration_id,
        sync_type=request.sync_type.value,
        status=status,
        records_fetched=records_fetched,
        records_imported=len(unique_records),
        records_skipped_duplicate=dup_count,
        errors=errors,
        normalized_records=unique_records,
        events_emitted=len(unique_records),
        started_at=started_at,
        completed_at=completed_at
    )


@router.get("/health", tags=["Integrations"])
def integrations_health():
    """Inspect health status for all registered adapters."""
    adapters_list = AdapterRegistry.list_available_adapters()
    health_reports = []
    for item in adapters_list:
        ad = AdapterRegistry.get_adapter(item["adapter_name"])
        if ad:
            health_reports.append(ad.health_check())
    return {
        "status": "HEALTHY",
        "registered_count": len(adapters_list),
        "adapters": health_reports
    }
