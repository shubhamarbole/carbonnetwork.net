"""
Risk Analytics Router for FastAPI
Provides endpoints for overview metrics, severity distribution, category distribution,
time-series trends, and 4x4 probability vs impact heatmap matrices.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user, build_tenant_filter
from app.services.risk_analytics_service import (
    calculate_overview,
    calculate_severity_distribution,
    calculate_category_distribution,
    calculate_trends,
    calculate_heatmap
)

router = APIRouter()


@router.get("/overview")
def get_risk_overview(
    organizationId: Optional[str] = Query(None, description="Optional organization filter for admins"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns enterprise-level overview metrics computed from real database records.
    """
    filter_query = build_tenant_filter(user, organizationId, projectId)
    metrics = calculate_overview(filter_query)
    return {
        "success": True,
        "data": metrics
    }


@router.get("/severity")
def get_severity_distribution(
    organizationId: Optional[str] = Query(None, description="Optional organization filter for admins"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns risk counts and percentage distributions across LOW, MEDIUM, HIGH, CRITICAL severities.
    """
    filter_query = build_tenant_filter(user, organizationId, projectId)
    dist = calculate_severity_distribution(filter_query)
    return {
        "success": True,
        "data": dist
    }


@router.get("/categories")
def get_category_distribution(
    organizationId: Optional[str] = Query(None, description="Optional organization filter for admins"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns risk counts and percentages across all 14 standardized ESG risk categories.
    """
    filter_query = build_tenant_filter(user, organizationId, projectId)
    dist = calculate_category_distribution(filter_query)
    return {
        "success": True,
        "data": dist
    }


@router.get("/trends")
def get_risk_trends(
    organizationId: Optional[str] = Query(None, description="Optional organization filter for admins"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    dateFrom: Optional[str] = Query(None, description="Filter from YYYY-MM-DD"),
    dateTo: Optional[str] = Query(None, description="Filter to YYYY-MM-DD"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns timeline metrics of risk counts, average scores, and high/critical counts over time.
    """
    filter_query = build_tenant_filter(user, organizationId, projectId)
    trends = calculate_trends(filter_query, dateFrom, dateTo)
    return {
        "success": True,
        "data": trends
    }


@router.get("/heatmap")
def get_risk_heatmap(
    organizationId: Optional[str] = Query(None, description="Optional organization filter for admins"),
    projectId: Optional[str] = Query(None, description="Optional project filter"),
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns the 4x4 Probability vs Impact risk distribution matrix.
    Buckets: 0-24, 25-49, 50-74, 75-100.
    """
    filter_query = build_tenant_filter(user, organizationId, projectId)
    matrix = calculate_heatmap(filter_query)
    return {
        "success": True,
        "data": matrix
    }
