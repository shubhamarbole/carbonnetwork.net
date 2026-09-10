# Enterprise Production Architecture & Operations Manual

Authoritative architectural reference and operational manual for the enterprise **ESG / CarbonCredit.Network AI Risk Manager**.

---

## 1. System Topology & Runtime Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Vite Frontend Client (Port 3030)                     │
│  - React 18 Single Page Application                                    │
│  - Enterprise Operations Console (/admin/operations with 10 Tabs)      │
│  - Risk Heatmap, Analytics, RAG Citations, Agent Runs, Workflows       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / JWT / X-Correlation-ID
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Express Gateway Microservice (Port 5050)               │
│  - Security Headers (CSP, HSTS, X-Frame-Options: DENY, Nosniff)        │
│  - Sliding-Window Rate Limiting (Auth: 20/15m, API: 300/15m)          │
│  - NoSQL Injection Sanitizer & Strict Pagination Limits (≤100)         │
│  - Secret-Redacting Structured JSON Logger                             │
│  - Role-Based Access Control (RBAC) & Tenant Isolation Middleware     │
│  - Data Retention Policy Engine & Admin Operations Endpoints           │
│  - Background Job Reliability & Recovery Engine                        │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
        Mongoose / TCP 27017                        │ HTTP / X-Internal-Key
                    ▼                               ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│       MongoDB Enterprise Storage      │ │ Python AI Microservice (8000)│
│  - 12 Compound Indexed Collections    │ │ - Deterministic Risk Scoring │
│  - Risks & Risk History Records       │ │ - AI Guardrails (Injections) │
│  - Documents & Embeddings Metadata    │ │ - RAG Citations Engine       │
│  - Monitoring Events & Sweeps         │ │ - Multi-Step Agent Executor  │
│  - Alerts & Workflow Automation       │ │ - APScheduler Sweeps         │
│  - Immutable Security Audit Trail     │ │ - 12-Scenario Eval Benchmark │
└───────────────────────────────────────┘ └──────────────┬───────────────┘
                                                         │ Embeddings / Vectors
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │     Qdrant Vector Database   │
                                          │ - Tenant-Isolated Partitions │
                                          │ - Cosine Similarity Search   │
                                          │ - Cascading Deletion Consistency
                                          └──────────────────────────────┘
```

### Verified Service Endpoints
| Component | Runtime | Port | Health Check |
|---|---|---|---|
| **Vite Frontend** | Node.js (Vite) | `3030` | `http://localhost:3030/` |
| **Express Gateway** | Node.js (Express) | `5050` | `http://localhost:5050/api/health` |
| **Python Microservice** | Python 3.12 (FastAPI) | `8000` | `http://localhost:8000/health` |
| **MongoDB** | MongoDB Community | `27017` | Standard connection `mongodb://localhost:27017/esg-environmental` |
| **Qdrant Vector DB** | Qdrant Engine | Embedded / 6333 | In-memory / storage path `./qdrant_storage` |

---

## 2. Security Model & Boundary Defenses

1. **Production HTTP Security Headers**:
   - `Content-Security-Policy`: Restricts unauthorized scripts, objects, and framing.
   - `X-Frame-Options: DENY`: Prevents clickjacking.
   - `X-Content-Type-Options: nosniff`: Prevents MIME-confusion attacks.
   - `Strict-Transport-Security`: Enforces HTTPS.
   - `Referrer-Policy: strict-origin-when-cross-origin`: Minimizes metadata leakage.
   - `X-Powered-By`: Removed to eliminate fingerprinting.
2. **Sliding-Window Rate Limiting**:
   - Auth endpoints: 20 requests per 15 minutes.
   - Standard APIs: 300 requests per 15 minutes.
3. **NoSQL Injection Sanitization**:
   - Strips malicious Mongo operators (`$gt`, `$ne`, `$where`, `$regex`, `.`) from request bodies and query parameters.
   - Enforces pagination constraints ($1 \le \text{limit} \le 100$).
4. **Tenant Isolation Guarantees**:
   - Backend queries enforce tenant scoping unconditionally (`organizationId = user.organizationId`).
   - Vector database searches inject mandatory `organization_id` filter conditions.
   - Cross-tenant data leakage is defended across all 15 attack vectors.

---

## 3. AI Governance & Safety Model

1. **Authoritative Scoring Protection**:
   - The Phase 2 deterministic risk scoring formula ($P \times 0.35 + I \times 0.35 + E \times 0.20 + U \times 0.10$) is 100% authoritative and immutable.
   - LLMs, AI agents, and prompts are mathematically prevented from overriding or replacing risk scores.
2. **Prompt Injection & Adversarial Defense**:
   - Pre-execution guardrails inspect inputs for jailbreak directives ("Ignore previous instructions", "Reveal system prompt", "Reset rules").
   - Malicious directives are blocked or sanitized before reaching the model.
3. **Tool Allowlisting & Bounded Execution**:
   - Agents can only call explicitly registered and typed tools with strict Pydantic schemas.
   - Execution loops are bounded by `max_steps` (default 10) and `timeout_seconds` (default 60s).
   - Sensitive write operations (`create_mitigation_plan`, `assign_risk_owner`) trigger Human-In-The-Loop (HITL) approval pauses.
4. **Governance Traceability Metadata**:
   - Every AI operation tracks `LLM_PROVIDER`, `LLM_MODEL_VERSION`, `PROMPT_VERSION`, `AGENT_VERSION`, `TOOL_VERSION`, `RAG_VERSION`, and `EMBEDDING_MODEL`.

---

## 4. Disaster Recovery & Backup Runbook

### Point-in-Time Backup Creation
To generate an immediate snapshot of all 12 database collections and metadata:
```bash
node scripts/backup_restore.js --backup
```
Snapshots are compressed and stored with ISO timestamps in `./backups/`.

### Restore Verification Test (Sandbox Drill)
To perform an automated verification drill without affecting production data:
```bash
node scripts/backup_restore.js --test-restore
```
The restore verification script:
1. Restores records to an isolated sandbox namespace (`esg-environmental-sandbox`).
2. Validates record counts across all 12 collections with 100% equality checks.
3. Safely cleans up the sandbox environment upon validation.

### Full Emergency Restore Procedure
To restore from a specific snapshot:
```bash
node scripts/backup_restore.js --restore ./backups/snapshot_YYYY-MM-DDTHH-mm-ss.json
```

---

## 5. Graceful Degradation & Failure Isolation

| Component Outage | Impact on System | Graceful Degradation Behavior |
|---|---|---|
| **Upstream LLM Provider Unreachable** | AI analysis & free-form recommendations pause | Core Risk CRUD, deterministic risk scoring, monitoring rules, and alerts continue normal operations. |
| **Vector DB / Qdrant Unreachable** | Semantic RAG citations unavailable | Risk analysis completes with non-grounded disclaimer; core risk management remains 100% functional. |
| **Monitoring Scheduler Stalled** | Scheduled automated sweeps pause | Manual sweeps remain executable; existing risks, alerts, and workflows remain intact. |
| **Background Job Interrupted** | Job left in running state | Job recovery engine automatically detects stale jobs, recovers idempotently, and logs `JOB_RECOVERY_EXECUTED`. |

---

## 6. Incident Response & Troubleshooting Runbook

1. **High Latency or Slow API Response**:
   - Check API latency metrics via `GET /api/admin/operations/metrics`.
   - Inspect database compound indexes in MongoDB: `db.risks.getIndexes()`.
2. **Unauthorized Access Attempts (401 / 403)**:
   - Inspect security audit log records in Operations Console under `/admin/operations` (Audit Logs tab).
   - Check for expired JWT tokens or non-permitted roles.
3. **Stale or Stuck Background Jobs**:
   - Access Operations Console -> Background Jobs tab or trigger recovery via `POST /api/admin/operations/jobs/recover`.
