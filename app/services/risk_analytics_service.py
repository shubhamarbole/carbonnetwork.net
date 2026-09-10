"""
Risk Analytics Service
Computes real database analytics, distributions, time-series trends,
and probability vs impact heatmap matrices from MongoDB.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/esg-environmental")
client = MongoClient(MONGO_URI)
db = client.get_default_database("esg-environmental")

CATEGORIES = [
    "Financial", "Operational", "Environmental", "ESG", "Compliance",
    "Regulatory", "Supplier", "Project", "Cybersecurity", "Data",
    "Reputational", "Fraud", "Carbon", "Documentation"
]

SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

HEATMAP_BUCKETS = [
    {"key": "0-24", "min": 0, "max": 24.99},
    {"key": "25-49", "min": 25, "max": 49.99},
    {"key": "50-74", "min": 50, "max": 74.99},
    {"key": "75-100", "min": 75, "max": 100.0}
]


def _get_risks_collection():
    return db["risks"]


def _get_history_collection():
    # Supports both collection namings
    if "riskhistories" in db.list_collection_names():
        return db["riskhistories"]
    return db["risk_histories"]


def calculate_overview(filter_query: Dict[str, Any]) -> Dict[str, Any]:
    """Generates high-level enterprise risk metrics from real database records."""
    risks_col = _get_risks_collection()
    history_col = _get_history_collection()

    risks = list(risks_col.find(filter_query))
    total_risks = len(risks)

    if total_risks == 0:
        return {
            "total_risks": 0,
            "critical_risks": 0,
            "high_risks": 0,
            "medium_risks": 0,
            "low_risks": 0,
            "open_risks": 0,
            "under_review_risks": 0,
            "mitigated_risks": 0,
            "closed_risks": 0,
            "average_score": 0.0,
            "highest_risk_score": 0.0,
            "increasing_risks": 0,
            "decreasing_risks": 0,
            "risks_with_recent_changes": 0
        }

    critical_risks = sum(1 for r in risks if r.get("severity") == "CRITICAL")
    high_risks = sum(1 for r in risks if r.get("severity") == "HIGH")
    medium_risks = sum(1 for r in risks if r.get("severity") == "MEDIUM")
    low_risks = sum(1 for r in risks if r.get("severity") == "LOW")

    open_risks = sum(1 for r in risks if r.get("status") == "OPEN")
    under_review_risks = sum(1 for r in risks if r.get("status") == "UNDER_REVIEW")
    mitigated_risks = sum(1 for r in risks if r.get("status") == "MITIGATED")
    closed_risks = sum(1 for r in risks if r.get("status") == "CLOSED")

    scores = [float(r.get("risk_score", 0.0)) for r in risks]
    average_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    highest_risk_score = round(max(scores), 2) if scores else 0.0

    # Trend calculation from score history (increasing vs decreasing)
    risk_ids = [str(r.get("_id")) for r in risks]
    increasing_count = 0
    decreasing_count = 0

    for rid in risk_ids:
        latest_histories = list(history_col.find({"risk_id": rid}).sort("timestamp", -1).limit(2))
        if latest_histories:
            latest = latest_histories[0]
            old_s = latest.get("old_score")
            new_s = latest.get("new_score")
            if old_s is not None and new_s is not None:
                if new_s > old_s:
                    increasing_count += 1
                elif new_s < old_s:
                    decreasing_count += 1

    return {
        "total_risks": total_risks,
        "critical_risks": critical_risks,
        "high_risks": high_risks,
        "medium_risks": medium_risks,
        "low_risks": low_risks,
        "open_risks": open_risks,
        "under_review_risks": under_review_risks,
        "mitigated_risks": mitigated_risks,
        "closed_risks": closed_risks,
        "average_score": average_score,
        "highest_risk_score": highest_risk_score,
        "increasing_risks": increasing_count,
        "decreasing_risks": decreasing_count,
        "risks_with_recent_changes": increasing_count + decreasing_count
    }


def calculate_severity_distribution(filter_query: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Calculates counts and exact percentages by severity level."""
    risks = list(_get_risks_collection().find(filter_query))
    total = len(risks)

    counts = {s: 0 for s in SEVERITIES}
    for r in risks:
        s = r.get("severity", "LOW")
        if s in counts:
            counts[s] += 1
        else:
            counts["LOW"] += 1

    result = []
    for s in SEVERITIES:
        cnt = counts[s]
        pct = round((cnt / total * 100.0), 2) if total > 0 else 0.0
        result.append({
            "severity": s,
            "count": cnt,
            "percentage": pct
        })

    return result


def calculate_category_distribution(filter_query: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Calculates counts and percentages across all 14 standardized risk categories."""
    risks = list(_get_risks_collection().find(filter_query))
    total = len(risks)

    counts = {c: 0 for c in CATEGORIES}
    for r in risks:
        cat = r.get("category")
        if cat in counts:
            counts[cat] += 1

    result = []
    for c in CATEGORIES:
        cnt = counts[c]
        pct = round((cnt / total * 100.0), 2) if total > 0 else 0.0
        result.append({
            "category": c,
            "count": cnt,
            "percentage": pct
        })

    return result


def calculate_trends(
    filter_query: Dict[str, Any],
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Generates time-series risk score and count trend analytics."""
    risks = list(_get_risks_collection().find(filter_query))

    date_groups: Dict[str, List[Dict[str, Any]]] = {}

    for r in risks:
        ts = r.get("createdAt") or r.get("updatedAt") or datetime.now(timezone.utc).isoformat()
        date_str = str(ts)[:10]  # YYYY-MM-DD

        if date_from and date_str < date_from:
            continue
        if date_to and date_str > date_to:
            continue

        if date_str not in date_groups:
            date_groups[date_str] = []
        date_groups[date_str].append(r)

    timeline = []
    for d in sorted(date_groups.keys()):
        items = date_groups[d]
        scores = [float(item.get("risk_score", 0.0)) for item in items]
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        critical_cnt = sum(1 for item in items if item.get("severity") == "CRITICAL")
        high_cnt = sum(1 for item in items if item.get("severity") == "HIGH")

        timeline.append({
            "date": d,
            "count": len(items),
            "average_score": avg_score,
            "critical_count": critical_cnt,
            "high_count": high_cnt
        })

    return timeline


def calculate_heatmap(filter_query: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a 4x4 Probability vs Impact risk distribution heatmap matrix.
    Buckets: 0-24, 25-49, 50-74, 75-100.
    """
    risks = list(_get_risks_collection().find(filter_query))
    total_risks = len(risks)

    def get_bucket(val: float) -> str:
        for b in HEATMAP_BUCKETS:
            if b["min"] <= val <= b["max"]:
                return b["key"]
        return "75-100" if val >= 100 else "0-24"

    # Initialize 16 cell grid
    grid = {}
    for pb in HEATMAP_BUCKETS:
        for ib in HEATMAP_BUCKETS:
            grid[(pb["key"], ib["key"])] = {
                "probability_bucket": pb["key"],
                "impact_bucket": ib["key"],
                "count": 0,
                "percentage": 0.0,
                "risk_titles": []
            }

    for r in risks:
        prob = float(r.get("probability", 0))
        imp = float(r.get("impact", 0))
        p_bucket = get_bucket(prob)
        i_bucket = get_bucket(imp)
        cell = grid[(p_bucket, i_bucket)]
        cell["count"] += 1
        if len(cell["risk_titles"]) < 5:
            cell["risk_titles"].append(r.get("title", "Untitled"))

    cells = []
    for pb in HEATMAP_BUCKETS:
        for ib in HEATMAP_BUCKETS:
            cell = grid[(pb["key"], ib["key"])]
            cnt = cell["count"]
            cell["percentage"] = round((cnt / total_risks * 100.0), 2) if total_risks > 0 else 0.0
            cells.append(cell)

    return {
        "total_risks": total_risks,
        "probability_buckets": [b["key"] for b in HEATMAP_BUCKETS],
        "impact_buckets": [b["key"] for b in HEATMAP_BUCKETS],
        "cells": cells
    }
