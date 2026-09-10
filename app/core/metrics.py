"""
Operational Metrics Tracker for Python AI & Monitoring Microservice
"""

import time
from typing import Dict, List, Any


class MicroserviceMetrics:
    def __init__(self):
        self.start_time = time.time()
        self.ai_analyses_total = 0
        self.ai_analyses_failed = 0
        self.ai_latencies: List[float] = []

        self.tool_calls_total = 0
        self.tool_calls_failed = 0
        self.tool_latencies: List[float] = []

        self.rag_searches_total = 0
        self.rag_searches_failed = 0
        self.rag_latencies: List[float] = []

        self.monitoring_sweeps_total = 0
        self.monitoring_events_detected = 0

        self.workflow_runs_total = 0
        self.workflow_escalations_total = 0

    def record_ai_run(self, latency_seconds: float, success: bool = True):
        self.ai_analyses_total += 1
        if not success:
            self.ai_analyses_failed += 1
        self.ai_latencies.append(latency_seconds)
        if len(self.ai_latencies) > 500:
            self.ai_latencies.pop(0)

    def record_tool_call(self, latency_seconds: float, success: bool = True):
        self.tool_calls_total += 1
        if not success:
            self.tool_calls_failed += 1
        self.tool_latencies.append(latency_seconds)
        if len(self.tool_latencies) > 500:
            self.tool_latencies.pop(0)

    def record_rag_search(self, latency_seconds: float, success: bool = True):
        self.rag_searches_total += 1
        if not success:
            self.rag_searches_failed += 1
        self.rag_latencies.append(latency_seconds)
        if len(self.rag_latencies) > 500:
            self.rag_latencies.pop(0)

    def record_monitoring_sweep(self, events_count: int = 0):
        self.monitoring_sweeps_total += 1
        self.monitoring_events_detected += events_count

    def record_workflow_run(self, escalations_count: int = 0):
        self.workflow_runs_total += 1
        self.workflow_escalations_total += escalations_count

    def get_summary(self) -> Dict[str, Any]:
        def calc_avg(lat_list):
            return round(sum(lat_list) / len(lat_list), 3) if lat_list else 0.0

        uptime = int(time.time() - self.start_time)
        return {
            "status": "HEALTHY",
            "service": "python-ai-microservice",
            "uptime_seconds": uptime,
            "ai_analyses": {
                "total": self.ai_analyses_total,
                "failed": self.ai_analyses_failed,
                "avg_latency_s": calc_avg(self.ai_latencies)
            },
            "tool_calls": {
                "total": self.tool_calls_total,
                "failed": self.tool_failures if hasattr(self, 'tool_failures') else self.tool_calls_failed,
                "avg_latency_s": calc_avg(self.tool_latencies)
            },
            "rag_retrieval": {
                "total": self.rag_searches_total,
                "failed": self.rag_searches_failed,
                "avg_latency_s": calc_avg(self.rag_latencies)
            },
            "monitoring": {
                "sweeps_total": self.monitoring_sweeps_total,
                "events_detected": self.monitoring_events_detected
            },
            "workflows": {
                "runs_total": self.workflow_runs_total,
                "escalations_total": self.workflow_escalations_total
            }
        }

default_metrics = MicroserviceMetrics()
