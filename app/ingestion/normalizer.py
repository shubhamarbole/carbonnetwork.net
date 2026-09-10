"""
Data Ingestion Normalizer
Maps external provider terminology, scales, and engineering units to platform standards.
"""

from typing import Any, Dict, List

# Standard platform engineering unit conversions
UNIT_CONVERSIONS = {
    ("MWh", "kWh"): 1000.0,
    ("kgCO2e", "tCO2e"): 0.001,
    ("gCO2/kWh", "kgCO2e/kWh"): 0.001,
    ("liters", "m3"): 0.001,
}


def normalize_unit(val: float, from_unit: str, to_unit: str) -> float:
    """Converts a numeric value from one engineering unit to platform target unit."""
    if from_unit == to_unit:
        return val
    factor = UNIT_CONVERSIONS.get((from_unit, to_unit))
    if factor:
        return val * factor
    return val


def normalize_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures standard key names, domain casing, and rounded numbers."""
    norm = dict(raw)
    norm["domain"] = str(norm.get("domain", "ESG")).upper()
    norm["source"] = str(norm.get("source", "unknown")).lower()
    try:
        norm["value"] = round(float(norm.get("value", 0.0)), 4)
    except (ValueError, TypeError):
        norm["value"] = 0.0
    return norm
