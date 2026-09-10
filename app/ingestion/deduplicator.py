"""
Data Deduplication Engine
Generates deterministic SHA-256 fingerprints to ensure idempotent ingestion across retries.
"""

import hashlib
import json
from typing import Any, Dict, List, Optional, Set, Tuple


def compute_record_fingerprint(record: Dict[str, Any]) -> str:
    """
    Computes deterministic SHA-256 fingerprint for a data record based on immutable fields:
    source, organization_id, metric, period, timestamp, value.
    """
    source = str(record.get("source", "")).strip().lower()
    org_id = str(record.get("organization_id", "")).strip()
    project_id = str(record.get("project_id", "")).strip()
    metric = str(record.get("metric", "")).strip().lower()
    period = str(record.get("period", "")).strip().lower()
    ts = str(record.get("timestamp", "")).strip()
    val = round(float(record.get("value", 0.0)), 6)

    seed = f"{source}|{org_id}|{project_id}|{metric}|{period}|{ts}|{val}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def deduplicate_records(
    records: List[Dict[str, Any]],
    existing_fingerprints: Optional[Set[str]] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Filters out records that match known fingerprints in this batch or in existing_fingerprints.
    Attaches fingerprint to each valid record.
    Returns (unique_records, duplicate_count).
    """
    seen = set(existing_fingerprints) if existing_fingerprints else set()
    unique = []
    dup_count = 0

    for r in records:
        fp = compute_record_fingerprint(r)
        r["fingerprint"] = fp
        if fp in seen:
            dup_count += 1
        else:
            seen.add(fp)
            unique.append(r)

    return unique, dup_count
