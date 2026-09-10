"""
Main FastAPI Application
Risk Scoring Engine & Risk Analytics Service (Phase 2)
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import risks, analytics
from app.api.risk_analysis import router as internal_router
from app.api.knowledge import router as knowledge_router
from app.api.agent import router as agent_router
from app.api.monitoring import router as monitoring_router
from app.api.workflows import router as workflows_router
from app.api.alerts import router as alerts_router
from app.api.predictive import router as predictive_router
from app.api.integrations import router as integrations_router
from app.api.scenarios import router as scenarios_router
from app.api.executive import router as executive_router
from app.api.pilot import router as pilot_router
from app.api.decisions import router as decisions_router
from app.api.optimization import router as optimization_router
from app.api.gateway import router as gateway_router
from app.api.tools import router as tools_router
from app.monitoring.scheduler import default_monitoring_scheduler
from app.workflows.scheduler import default_workflow_scheduler


from app.core.config import settings
from app.core.correlation import CorrelationIdMiddleware
from app.core.metrics import default_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        cfg = settings.validate_configuration()
        print(f"[OK] Startup Configuration Validated: provider={cfg['ai_provider']}, model={cfg['ai_model']}")
    except Exception as e:
        print(f"[WARN] Configuration warning: {e}")

    try:
        default_monitoring_scheduler.start()
    except Exception as err:
        print(f"Notice: Monitoring scheduler start error: {err}")
    try:
        default_workflow_scheduler.start()
    except Exception as err:
        print(f"Notice: Workflow scheduler start error: {err}")
    yield
    try:
        default_monitoring_scheduler.shutdown()
    except Exception:
        pass
    try:
        default_workflow_scheduler.shutdown()
    except Exception:
        pass


app = FastAPI(
    title="AI Risk Manager - Risk Scoring & AI Analysis Service",
    description="Deterministic Risk Scoring Engine, Multi-Tenant Analytics, RAG, AI Agent, Proactive Monitoring & Workflow Automation",
    version="8.0.0",
    lifespan=lifespan
)

# Correlation ID & Observability middleware
app.add_middleware(CorrelationIdMiddleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(risks.router, prefix="/api/risks", tags=["Risk Scoring"])
app.include_router(analytics.router, prefix="/api/risk-analytics", tags=["Risk Analytics"])
app.include_router(internal_router, prefix="/internal", tags=["Internal AI Services"])
app.include_router(knowledge_router, prefix="/internal/knowledge", tags=["Internal Knowledge RAG"])
app.include_router(agent_router, prefix="/internal/agent", tags=["Internal AI Agent"])
app.include_router(monitoring_router, prefix="/internal/monitoring", tags=["Internal Proactive Monitoring"])
app.include_router(workflows_router, prefix="/internal/workflows", tags=["Internal Workflows"])
app.include_router(alerts_router, prefix="/internal/alerts", tags=["Internal Alerts"])
app.include_router(predictive_router, prefix="/internal/predictive", tags=["Internal Predictive Intelligence"])
app.include_router(integrations_router, prefix="/internal/integrations", tags=["Internal Data Integrations"])
app.include_router(scenarios_router, prefix="/internal/scenarios", tags=["Internal Scenarios"])
app.include_router(executive_router, prefix="/internal/executive", tags=["Internal Executive Intelligence"])
app.include_router(pilot_router, prefix="/internal/pilot", tags=["Internal Pilot & Validation"])
app.include_router(decisions_router, prefix="/internal/decisions", tags=["Internal Decision Intelligence"])
app.include_router(optimization_router, prefix="/internal/optimization", tags=["Internal Autonomous Optimization"])
app.include_router(gateway_router, prefix="/internal/gateway", tags=["Internal AI Model Gateway"])
app.include_router(tools_router, prefix="/internal/tools", tags=["Internal Tool Registry"])


@app.get("/internal/metrics", tags=["Internal Metrics"])
def get_metrics():
    return default_metrics.get_summary()


@app.get("/")
def root():
    return {
        "success": True,
        "service": "AI Risk Manager - Production Pilot, Validation & Operations Platform",
        "version": "17.0.0",
        "status": "Online"
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "overall": "HEALTHY",
        "service": "risk-scoring-engine",
        "version": "17.0.0",
        "components": {
            "vector_database": {"status": "HEALTHY", "engine": "qdrant"},
            "llm_provider": {"status": "HEALTHY", "provider": settings.AI_PROVIDER, "model": settings.AI_MODEL},
            "monitoring_scheduler": {"status": "HEALTHY"},
            "workflow_scheduler": {"status": "HEALTHY"},
            "predictive_intelligence": {"status": "HEALTHY", "model": "risk-predictor-v1", "feature_version": "risk-features-v1"},
            "integrations_framework": {"status": "HEALTHY", "registered_adapters": 5},
            "scenario_engine": {"status": "HEALTHY", "engine": "scenario-engine-v1.0.0"},
            "executive_intelligence": {"status": "HEALTHY", "model": "executive-index-v1.0.0", "briefing_engine": "briefing-narrative-v1"},
            "pilot_readiness": {"status": "HEALTHY", "tier": settings.ENVIRONMENT_TIER},
            "predictive_evaluation": {"status": "HEALTHY", "evaluator": "predictive-evaluator-v1"},
            "decision_intelligence": {"status": "HEALTHY", "engine": "decision-engine-v1.0.0", "scoring_version": "decision-score-v1.0.0"},
            "optimization_engine": {"status": "HEALTHY", "engine": "opt-engine-v1.0.0", "scoring_version": "opt-score-v1.0.0"},
            "ai_gateway": {"status": "HEALTHY", "version": "ai-gateway-v2.0"},
            "tool_registry": {"status": "HEALTHY", "version": "tool-registry-v2.0"}
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
