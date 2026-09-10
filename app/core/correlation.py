"""
Correlation ID and Structured Tracing
Propagates correlation IDs across FastAPI requests and log context.
"""

import uuid
import contextvars
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="req_unknown")


def get_correlation_id() -> str:
    return correlation_id_ctx.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        corr_id = (
            request.headers.get("X-Correlation-ID") or
            request.headers.get("X-Request-ID") or
            f"py_req_{uuid.uuid4().hex[:8]}"
        )
        token = correlation_id_ctx.set(corr_id)
        request.state.correlation_id = corr_id

        response: Response = await call_next(request)
        response.headers["X-Correlation-ID"] = corr_id
        response.headers["X-Request-ID"] = corr_id
        correlation_id_ctx.reset(token)
        return response
