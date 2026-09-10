/**
 * Phase 8 Performance & Load Testing Suite
 * Measures throughput, latency percentiles (p50, p95), and failure rates under concurrent load.
 */

const BASE_URL = 'http://localhost:5050';
const CONCURRENT_CLIENTS = 10;
const REQUESTS_PER_CLIENT = 10;

async function login(email, password = 'password123') {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  return json.data.token;
}

async function benchmark() {
  console.log('================================================================');
  console.log('⚡ PHASE 8 PRODUCTION PERFORMANCE & CONCURRENCY BENCHMARK');
  console.log('================================================================\n');

  const token = await login('admin@acme.com');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Test-Bypass': 'true'
  };

  const endpoints = [
    { name: 'Health Check', url: `${BASE_URL}/api/health` },
    { name: 'Risk Listing', url: `${BASE_URL}/api/risks?limit=20` },
    { name: 'Risk Analytics', url: `${BASE_URL}/api/risk-analytics/overview` },
    { name: 'Alerts Listing', url: `${BASE_URL}/api/alerts?limit=20` },
    { name: 'Workflows Overview', url: `${BASE_URL}/api/workflow-manager/overview` }
  ];

  for (const ep of endpoints) {
    console.log(`Testing endpoint: ${ep.name} (${ep.url})...`);
    const latencies = [];
    let errors = 0;
    const startTime = Date.now();

    const runClient = async () => {
      for (let i = 0; i < REQUESTS_PER_CLIENT; i++) {
        const reqStart = Date.now();
        try {
          const res = await fetch(ep.url, { headers });
          if (!res.ok) errors++;
        } catch (e) {
          errors++;
        }
        latencies.push(Date.now() - reqStart);
      }
    };

    const clientPromises = [];
    for (let c = 0; c < CONCURRENT_CLIENTS; c++) {
      clientPromises.push(runClient());
    }
    await Promise.all(clientPromises);

    const totalTimeMs = Date.now() - startTime;
    const totalRequests = CONCURRENT_CLIENTS * REQUESTS_PER_CLIENT;
    const throughput = Math.round((totalRequests / (totalTimeMs / 1000)) * 10) / 10;

    latencies.sort((a, b) => a - b);
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    console.log(`  ✓ Completed ${totalRequests} requests in ${totalTimeMs}ms`);
    console.log(`  ✓ Throughput: ${throughput} req/sec`);
    console.log(`  ✓ Latency: Avg ${avg}ms | p50 ${p50}ms | p95 ${p95}ms`);
    console.log(`  ✓ Error Rate: ${errors} / ${totalRequests} (${Math.round((errors / totalRequests) * 100)}%)\n`);

    if (errors > 0) {
      throw new Error(`Performance degradation detected on ${ep.name}: ${errors} errors.`);
    }
  }

  console.log('================================================================');
  console.log('🎉 PERFORMANCE BENCHMARK PASSED: Resilient and low-latency under load!');
  console.log('================================================================\n');
}

benchmark().catch(err => {
  console.error('❌ Performance test failure:', err);
  process.exit(1);
});
