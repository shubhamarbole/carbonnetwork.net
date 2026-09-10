"""
Data Ingestion Validator
Enforces type, bounds, timestamp, and security integrity on all external ingested data.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Tuple

VALID_DOMAINS = {"ESG", "CARBON", "ENERGY", "SUPPLIER", "COMPLIANCE", "PROJECT"}
VALID_UNITS = {"kWh", "MWh", "kgCO2e", "tCO2e", "m3", "score", "%", "count", "days", "unit"}


def validate_record(record: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates a normalized record dictionary before persistence or monitoring feed.
    Returns (is_valid, error_message).
    """
    required_fields = ["source", "domain", "organization_id", "metric", "value", "unit", "timestamp"]
    for field in required_fields:
        if field not in record or record[field] is None:
            return False, f"Missing required field: '{field}'"

    # Validate domain
    domain = str(record.get("domain", "")).upper()
    if domain not in VALID_DOMAINS:
        return False, f"Invalid domain '{domain}'. Must be one of {sorted(list(VALID_DOMAINS))}"

    # Validate numeric value
    try:
        val = float(record["value"])
        if val < -1000000.0 or val > 1000000000.0:
            return False, f"Value '{val}' exceeds realistic scientific limits (-1M to +1B)."
    except (ValueError, TypeError):
        return False, f"Value '{record.get('value')}' cannot be parsed as a float."

    # Validate timestamp
    ts = record.get("timestamp")
    try:
        datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return False, f"Timestamp '{ts}' is not a valid ISO 8601 string."

    # Validate organization ID
    org_id = str(record.get("organization_id", "")).strip()
    if not org_id or len(org_id) < 2:
        return False, "organization_id must be a non-empty string."

    # Sanitize metric name against injections
    metric = str(record.get("metric", ""))
    if not re.match(r"^[a-zA-Z0-9_-]{2,80}$", metric):
        return False, f"Metric name '{metric}' contains invalid characters."

    return True, ""


def validate_batch(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Validates a list of records. Returns (valid_records, validation_errors).
    """
    valid = []
    errors = []
    for idx, r in enumerate(records):
        is_valid, err = validate_record(r)
        if is_valid:
            valid.append(r)
        else:
            errors.append(f"Record {idx}: {err}")
    return valid, errors
