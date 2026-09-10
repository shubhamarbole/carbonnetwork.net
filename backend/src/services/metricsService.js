/**
 * In-Memory Operational Metrics Service
 * Aggregates API latencies, request rates, error codes, and subsystem counters.
 */
class OperationalMetricsService {
  constructor() {
    this.counters = {
      api_requests_total: 0,
      api_requests_success: 0,
      api_requests_error: 0,
      ai_analyses_total: 0,
      ai_analyses_failed: 0,
      tool_calls_total: 0,
      tool_calls_failed: 0,
      rag_searches_total: 0,
      rag_searches_failed: 0,
      monitoring_runs_total: 0,
      monitoring_events_detected: 0,
      workflow_instances_total: 0,
      workflow_steps_completed: 0,
      workflow_escalations_total: 0,
      documents_processed_total: 0,
      documents_failed_total: 0
    };
    this.latencies = [];
    this.maxLatencySamples = 500;
    this.startTime = new Date().toISOString();
  }

  recordRequest(latencyMs, isError = false) {
    this.counters.api_requests_total += 1;
    if (isError) {
      this.counters.api_requests_error += 1;
    } else {
      this.counters.api_requests_success += 1;
    }
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  increment(counterName, count = 1) {
    if (this.counters[counterName] !== undefined) {
      this.counters[counterName] += count;
    }
  }

  getSummary() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const len = sorted.length;
    const avgLatency = len > 0 ? sorted.reduce((sum, v) => sum + v, 0) / len : 0;
    const p50 = len > 0 ? sorted[Math.floor(len * 0.5)] : 0;
    const p95 = len > 0 ? sorted[Math.floor(len * 0.95)] : 0;
    const errorRate = this.counters.api_requests_total > 0
      ? (this.counters.api_requests_error / this.counters.api_requests_total) * 100
      : 0;

    return {
      status: 'HEALTHY',
      started_at: this.startTime,
      uptime_seconds: Math.floor((Date.now() - new Date(this.startTime).getTime()) / 1000),
      api_metrics: {
        total_requests: this.counters.api_requests_total,
        successful_requests: this.counters.api_requests_success,
        failed_requests: this.counters.api_requests_error,
        error_rate_pct: Math.round(errorRate * 100) / 100,
        latency: {
          average_ms: Math.round(avgLatency * 100) / 100,
          p50_ms: p50,
          p95_ms: p95
        }
      },
      subsystem_counters: { ...this.counters }
    };
  }
}

const metricsService = new OperationalMetricsService();
module.exports = metricsService;
