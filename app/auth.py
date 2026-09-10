"""
Authentication & Authorization Dependency for FastAPI
Verifies Bearer JWT tokens and extracts tenant & role scopes.
"""

from typing import Dict, Any, Optional
import os
import jwt
from fastapi import Header, HTTPException, status

JWT_SECRET = os.getenv("JWT_SECRET", "environmental-esg-secret-key-98765")
JWT_ALGORITHM = "HS256"


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extracts and verifies JWT Bearer token from the Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Authentication token required."
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Invalid Authorization header format."
        )

    token = parts[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Token has expired."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Invalid or malformed token."
        )


def build_tenant_filter(
    user: Dict[str, Any],
    requested_org_id: Optional[str] = None,
    requested_project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Builds tenant-isolated filter query:
    - Global admins (SUPER_ADMIN, PLATFORM_ADMIN) can view all or filter by requested org.
    - Tenant users (MSME_USER, ADMIN, VIEWER, etc.) are strictly contained within their organization.
    """
    role = user.get("role", "VIEWER")
    user_org_id = user.get("organizationId")

    query: Dict[str, Any] = {}

    if role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        if requested_org_id and requested_org_id != "all":
            query["organizationId"] = requested_org_id
        if requested_project_id and requested_project_id != "all":
            query["projectId"] = requested_project_id
    else:
        if not user_org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: User is not associated with any organization."
            )
        query["organizationId"] = str(user_org_id)
        if requested_project_id and requested_project_id != "all":
            query["projectId"] = requested_project_id

    return query
