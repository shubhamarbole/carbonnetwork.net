# ESG / CarbonCredit.Network — Phases 15, 16 & 17 Implementation Walkthrough

## Executive Summary

Phases 15, 16, and 17 have been implemented as three coordinated architectural layers on top of the verified ESG / CarbonCredit.Network platform. The system operates on standard ports:
- **Vite Frontend**: Port `3030`
- **Express Backend API**: Port `5050`
- **Python FastAPI Microservice**: Port `8000`

All 61 comprehensive end-to-end tests, 182 pytest microservice tests, and legacy regression suites from Phases 5–13 passed with zero regressions.

---

## 1. Phase 15: Autonomous Risk Optimization

### 1.1 Architecture & Objectives
The Optimization Engine (`app/optimization/`) provides deterministic multi-objective portfolio optimization under strict enterprise constraints without relying on LLMs for authoritative numerical calculations.

Seven discrete optimization objectives are supported:
1. `BALANCED_OPTIMIZATION` (Multi-attribute balanced trade-off)
2. `RISK_MINIMIZATION` (Prioritize maximum Phase 2 risk reduction points)
3. `COST_MINIMIZATION` (Maximize risk reduction per dollar spent)
4. `COMPLIANCE_PROTECTION` (Mandate mitigation of critical regulatory compliance risks)
5. `ESG_IMPROVEMENT` (Maximize aggregate ESG rating point gains)
6. `CARBON_REDUCTION` (Maximize metric tons of CO2e abated)
7. `TIME_MINIMIZATION` (Minimize implementation timeline in days)

### 1.2 Mathematical Formulation & Deterministic Ranking
Candidate actions for each risk are scored using deterministic normalization across 6 dimensions (`opt-score-v1.0.0`):

$$U(a) = w_r \cdot \bar{R}(a) + w_c \cdot \bar{C}(a) + w_u \cdot \bar{U}(a) + w_m \cdot M(a) + w_e \cdot \bar{E}(a) + w_k \cdot \bar{K}(a)$$

Where:
- $\bar{R}(a) = \frac{\Delta \text{Risk}(a)}{100.0}$: Normalized risk reduction
- $\bar{C}(a) = 1.0 - \frac{\text{Cost}(a)}{\text{Budget Cap}}$: Normalized cost efficiency
- $\bar{U}(a) = \text{Urgency Factor} \in [0.0, 1.0]$
- $M(a) = 1.0 \text{ if compliance covered, else } 0.0$
- $\bar{E}(a) = \frac{\Delta \text{ESG}(a)}{50.0}$: Normalized ESG gain
- $\bar{K}(a) = \frac{\Delta \text{tCO2e}(a)}{100.0}$: Normalized carbon reduction

### 1.3 Strict Business Constraints & Knapsack Solver
Combinatorial optimization is performed using a bounded knapsack solver enforcing:
- **Total Budget Cap**: $\sum \text{Cost}(a) \le \text{Budget}$
- **Timeline Deadline**: $\max \text{Days}(a) \le \text{Deadline}$
- **Resource Limits**: $\sum \text{Headcount}(a) \le \text{Resource Limit}$
- **Residual Risk Tolerance**: $\text{Post-Risk}(r) \le \text{Tolerance}$
- **Mandatory Compliance**: All risks with compliance exposure must have a mitigating action selected.

### 1.4 Zero-Mutation Guarantee & HITL Approval
- `POST /api/optimization/simulate`: Executes purely in-memory, leaving production risks 100% unaltered.
- High-impact operational execution requires human sign-off (`POST /api/optimization/runs/:id/approve`) before workflows or mitigation plans can be dispatched.

---

## 2. Phase 16: Enterprise Intelligence & Collaboration

### 2.1 Collaborative Risk Workspace & Comments
- Accessible at `/risk-workspace`: interactive team discussion panel, multi-member risk threads, and audit log links.
- Mentions Parser: Automatically parses `@username` and role tags (`@admin`, `@esg_mgr`, `@viewer`), validates tenant boundaries, and creates notifications.

### 2.2 Authoritative Risk Relationship Graph
Graph service (`backend/src/modules/collaboration/graphService.js`) builds a typed, directional graph linking:
- `Organization` $\to$ `Project` $\to$ `Risk`
- `Supplier` $\to$ `Project` (`SUPPLIES`) and `Risk` (`EXPOSES_TO`)
- `Decision` $\to$ `Risk` (`RESOLVES`)
- `Workflow` $\to$ `Risk` (`MITIGATES`)
- `Scenario` $\to$ `Organization` (`SIMULATES`)

### 2.3 Cross-Domain Impact Traversal
- `GET /api/risk-graph/:resourceType/:id`: Executes a bounded 3-hop BFS starting at any entity (e.g. `Supplier`, `Project`, or `Risk`) to answer dependency queries (e.g., *"What is affected if Supplier Alpha fails?"*).
- Aggregates impacted risks, total risk exposure points, compliance mandates, and active mitigation workflows.

---

## 3. Phase 17: AI Risk Platform 2.0

### 3.1 Industry Templates Catalog
Eight industry templates are registered and ready to apply:
1. `MANUFACTURING`: Factory emissions, effluent pH, and hazardous materials.
2. `ENERGY`: Grid reliability, dielectric fluid leaks, and renewable yield.
3. `LOGISTICS`: Fleet fuel efficiency, maritime compliance, and route decarbonization.
4. `CONSTRUCTION`: Embodied carbon, site runoff, and green building certifications.
5. `TECHNOLOGY`: Data center PUE, server cooling efficiency, and Scope 2 PPAs.
6. `FINANCE`: Portfolio financed emissions, climate stress testing, and green bond tracking.
7. `MSME`: Streamlined Scope 1 & 2 reporting and simplified compliance.
8. `GENERAL_ESG`: Cross-industry ESG framework based on GRI and CSRD double materiality.

### 3.2 AI Model Gateway
Provider-independent gateway (`app/gateway/`) with routing policies:
- `LOW_COST`: Routes to lightweight models or cached responses with lowest per-token cost.
- `LOW_LATENCY`: Prioritizes lowest millisecond response time.
- `HIGH_QUALITY`: Routes to frontier models for complex audit reports.
- `TASK_SPECIFIC`: Automatically routes based on prompt classification.
- Full fallback resilience, timeout handling, and token/cost metrics tracking.

### 3.3 Versioned Tool Registry
Enterprise tool registry (`app/tools/registry.py`) managing 23 tools across 11 categories:
- Detailed access control, required permissions, and risk levels (`READ`, `WRITE`).
- Dynamic runtime enablement/disablement via `PATCH /api/platform/tools/:name`.

### 3.4 Developer Platform API v2 & Scoped API Keys
- Public REST endpoints mounted under `/api/v2/*` (`/risks`, `/graph`, `/predictions`, `/scenarios`, `/decisions`, `/optimization/run`, `/executive/summary`).
- Authenticated via `x-api-key: esg_live_...` with SHA-256 hashed storage, prefix display, custom scopes, and instantaneous revocation.

### 3.5 Platform Operations & Cost Accounting
- Accessible at `/platform-operations`: live daemon status monitor, AI Gateway metrics, Tool Registry control table, Industry Template selector, API Key manager, and usage/cost accounting.

---

## 4. Verification & Test Results

### 4.1 Master E2E Suite (`verifyPhase15_16_17_MasterE2E.mjs`)
```
==================================================================================
  ESG / CARBONCREDIT.NETWORK — PHASES 15, 16 & 17 MASTER E2E VERIFICATION SUITE
==================================================================================
TOTAL TESTS PASSED: 61
TOTAL TESTS FAILED: 0
ALL PHASE 15, 16, AND 17 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!
```

### 4.2 Multi-Phase Legacy Regression Suite
| Phase Test Suite | Tests Run | Result | Notes |
| :--- | :--- | :--- | :--- |
| `verifyPhase13DecisionIntelligence.mjs` | 51 Passed, 0 Failed | **PASS** | Decision trade-offs, Pareto ranking, HITL |
| `verifyPhase12MasterE2E.mjs` | 22 Passed, 0 Failed | **PASS** | 16-Stage Master Pipeline & Pilot KPIs |
| `verifyPhase11Executive.mjs` | 29 Passed, 0 Failed | **PASS** | Executive Index & Briefings |
| `verifyPhase10IntegrationsAndScenarios.mjs` | 23 Passed, 0 Failed | **PASS** | 5 Adapters & Scenario Engine |
| `verifyPhase9Predictive.mjs` | 29 Passed, 0 Failed | **PASS** | Machine Learning Trajectories |
| `verifyPhase8EnterpriseE2E.mjs` | 16 Passed, 0 Failed | **PASS** | Enterprise Hardening & Isolation |
| `verifyPhase7FullWorkflow.mjs` | 11 Passed, 0 Failed | **PASS** | Alerts & Workflow Engine |
| `verifyPhase6FullWorkflow.mjs` | 15 Passed, 0 Failed | **PASS** | Proactive Monitoring Sweeps |
| `verifyPhase5FullWorkflow.mjs` | 15 Passed, 0 Failed | **PASS** | AI Agent & Tool Execution |
| `python -m pytest tests/ -q` | 182 Passed, 0 Failed | **PASS** | Python Microservice Test Suite |
| `npm --prefix frontend run build` | Built in 9.60s | **PASS** | Vite Production Build Clean |

### 4.3 Dual-Workspace Synchronization
All modified/created files were mirrored to `c:\Users\ASUS\OneDrive\Desktop\esg`. Both workspaces remain in complete parity.

---

## 5. AI Agent Dashboard & Shell Layout Stabilization

### 5.1 Problem A Resolution: Shell Layout & Sidebar Positioning
- **Root Cause**: The navigation sidebar is fixed at $275\text{px}$ width (`fixed left-0 top-0 bottom-0`). The main container in [App.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/App.jsx) was rendering as `<div className="flex-1">` starting at $x=0$, placing all left-side workspace content (goal input, suggested inquiry cards, and history lists) underneath and behind the sidebar. Furthermore, viewport-width calculations caused content clipping and horizontal overflow due to Windows vertical scrollbars.
- **Permanent Architectural Fix**:
  1. Standardized [Sidebar.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/components/Sidebar.jsx) with fixed width `w-[275px]`.
  2. Updated the main layout wrapper in [App.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/App.jsx):
     ```jsx
     <div className="flex-1 ml-[275px] w-[calc(100%-275px)] min-w-0 flex flex-col min-h-screen">
     ```
  3. Content now starts precisely at $x = 275\text{px}$ beside the sidebar.
  4. Using `w-[calc(100%-275px)]` instead of `100vw` calculates width relative to the client area excluding the scrollbar, eliminating horizontal scrolling and preventing layout clipping.

### 5.2 Problem B Resolution: AI Agent Interactivity & Authentication
- **Token Synchronization**:
  - Identified that the frontend stores authentication in `esg_super_admin_token` via Zustand [authStore.ts](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/store/authStore.ts).
  - Components calling `localStorage.getItem('token')` received `null`, causing agent execution requests to fail with unauthenticated requests.
  - Updated [authStore.ts](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/store/authStore.ts) to read from and synchronize both `esg_super_admin_token` and `token` across initial cache, `login()`, and `logout()`.
  - Updated [RiskAgentWorkspace.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/RiskAgentWorkspace.jsx) and [RiskAgentRunDetail.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/RiskAgentRunDetail.jsx) to consume `useAuth()` with fallback cascade:
    ```javascript
    const { token: ctxToken } = useAuth();
    const token = ctxToken || useAuthStore.getState().token || localStorage.getItem('esg_super_admin_token') || localStorage.getItem('token') || '';
    ```
- **Clickable Suggested Inquiries**:
  - Connected each suggested inquiry card directly to `executeGoal(prompt)`.
  - Clicking any inquiry immediately populates the goal input and initiates multi-step reasoning.
- **Progressive Execution State & Active Timer**:
  - Replaced the static "AI Agent Ready" state with an active execution tracker during running queries.
  - Displays a real-time elapsed counter (`0s`, `1s`, `2s`...) and visual indicators for all 5 cognitive phases:
    1. Request Received & Authorized
    2. Formulating Multi-Step Execution Plan
    3. Tool Invocation & Evidence Retrieval
    4. Executive Recommendation & Action Synthesis
    5. Final Response
- **User-Facing Error Handling & Retry**:
  - Mapped specific error responses (401 Unauthorized, 403 Forbidden, 502/504 Service Unavailable).
  - Provided a dedicated "Retry Request" action that re-executes the last attempted prompt with a single click.
- **Interactive Human-in-the-Loop (HITL) Controls**:
  - Added interactive "Approve Action" and "Reject" buttons for runs in `WAITING_FOR_APPROVAL` state in both the workspace and run detail pages, allowing authorized operators to sign off on controlled actions.

### 5.3 Verification Results
- **Frontend Production Build**: Cleanly compiled in 9.14s (`dist/assets/index-*.js`).
- **Phase 5 AI Agent & Tool Calling Suite**: All 15/15 tests passed.
- **Phase 13 Decision Intelligence Suite**: All 51/51 tests passed.
- **Phase 15, 16, 17 Master E2E Suite**: All 61/61 tests passed.
- **Microservice Pytest Suite**: All 182/182 tests passed.
- **Dual Workspace Parity**: 5 files synchronized to `c:\Users\ASUS\OneDrive\Desktop\esg`.

---

## 6. Phase 18: Unified Enterprise Command Center

### 6.1 Architectural Overview
Phase 18 implements the **Unified Enterprise Command Center**, acting as the authoritative aggregation and operational command layer across all 17 completed platform phases:
- **Express Backend Gateway**: Port `5050` (Version `18.0.0`)
- **Python AI Microservice**: Port `8000` (Version `17.0.0`)
- **Vite React Frontend**: Port `3030` (`/command-center`)

The Command Center provides a single pane of glass without creating duplicate business engines or calculating fabricated client-side metrics. All risk scores, predictive trajectories, optimizations, workflows, and analyses are aggregated authoritatively from existing backend models.

### 6.2 Deterministic Priority Engine (`priority-calc-v1.0.0`)
The Priority Engine ([priorityEngine.js](file:///c:/Users/ASUS/OneDrive/Desktop/ai/backend/src/modules/commandCenter/priorityEngine.js)) calculates mathematical urgency scores and ranks items into discrete priority tiers without LLM dependency:
- **`P1_CRITICAL`** (Score $\ge 85$): Critical risks, severe escalations, overdue mitigations, failed workflows.
- **`P2_HIGH`** (Score $\ge 65$): High-impact risks, approvals required, predictive escalations, active alerts.
- **`P3_MEDIUM`** (Score $\ge 45$): Moderate risks, standard reviews, upcoming milestones.
- **`P4_INFORMATIONAL`** (Score $< 45$): Informational status notices, resolved items.

The formula evaluates:
$$\text{PriorityScore} = S_{\text{base}} + U_{\text{factor}} + P_{\text{ml}} + D_{\text{deadline}} + E_{\text{exposure}} + W_{\text{workflow}} + A_{\text{approval}}$$

### 6.3 Authoritative REST API Endpoints
All endpoints are mounted under `/api/command-center` and protected by `authenticateRiskUser` and `enforceRiskScope`:
- `GET /api/command-center/overview`: Returns aggregated `kpi`, `risk`, `predictions`, `alerts`, `workflows`, `decisions`, `scenarios`, `ai_activity`, `action_queue`, `activity_feed`, and `health`.
- `GET /api/command-center/actions`: Filterable by `priority`, `type`, `status`, `organization`, `project`, `date`.
- `POST /api/command-center/actions/execute`: Routes actions (`APPROVE`, `ESCALATE`, `INVESTIGATE`, `OPEN`) through existing authorized models and rejects unauthorized roles (`VIEWER` $\to$ HTTP 403).
- `GET /api/command-center/activity`: Scoped multi-domain timeline aggregating events across AuditLog, MonitoringEvent, Alert, AgentRun, WorkflowInstance, and Decision.
- `GET /api/command-center/search?q=`: Universal full-text search across risks, projects, alerts, workflows, scenarios, decisions, documents, and agent runs respecting tenant boundaries.
- `GET /api/command-center/context/:resourceType/:id`: 360-degree investigation context engine powering the slide-over drawer.
- `GET /api/command-center/health`: Evaluates 9 platform subsystems (`Application Gateway`, `Risk Engine`, `Python Service`, `AI Risk Agent`, `RAG`, `Monitoring`, `Workflow Engine`, `Vector Store`, `Database`).
- `GET /api/command-center/stream`: Server-Sent Events (SSE) stream delivering real-time telemetry updates to the dashboard without page reloads.

### 6.4 Unified Dashboard UI Components ([CommandCenter.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/CommandCenter.jsx))
1. **Global Command Bar**: Universal search with type filters and quick result navigation; "Ask AI Copilot" modal launcher.
2. **Top 8 KPI Cards**: Overall Risk Index, Critical Risks, Emerging Risks, Overdue Actions, Pending Approvals, Active Workflows, AI Investigations, Critical Alerts.
3. **Action Queue & Immediate Attention**: Filter tabs for P1–P4 priorities, interactive action cards, and 1-click execution actions.
4. **Emerging Intelligence**: Multi-domain comparisons with explicit `CURRENT`, `FORECAST`, and `SIMULATION` tags.
5. **Live Activity Feed**: Real-time event timeline with source tracking.
6. **Workflow Engine Summary**: Breakdown of active, overdue, pending, and completed workflows with direct navigation.
7. **Platform Subsystems Grid (9/9)**: Real-time health badges, latencies, and connection states.
8. **360-Degree Context Drawer**: Slide-over panel displaying linked risk scores, predictions, alerts, AI analyses, RAG evidence, scenarios, decisions, workflows, and direct links.
9. **Embedded AI Copilot Modal**: Integrated dialogue to query the Phase 5 Agent with suggested enterprise inquiries.

### 6.5 Verification & Audit Trail
- **Phase 18 Master Verification Suite** ([verifyPhase18CommandCenter.mjs](file:///c:/Users/ASUS/OneDrive/Desktop/ai/verifyPhase18CommandCenter.mjs)): **18 / 18 Tests Passed (100%)** including the full 15-stage lifecycle operational scenario.
- **Audit Logging**: Verified records created in `AuditLog` for:
  - `COMMAND_CENTER_VIEWED`
  - `COMMAND_CENTER_ACTION_EXECUTED`
  - `COMMAND_CENTER_SEARCHED`
- **Legacy Regression Suite**:
  - `verifyPhase15_16_17_MasterE2E.mjs`: 61 / 61 Passed (100%)
  - `verifyPhase13DecisionIntelligence.mjs`: 51 / 51 Passed (100%)
  - `verifyPhase5FullWorkflow.mjs`: 15 / 15 Passed (100%)
  - `python -m pytest tests/ -q`: 182 / 182 Passed (100%)
  - `npm --prefix frontend run build`: Clean build in 9.40s with 0 errors.
- **Dual-Workspace Synchronization**: All 12 modified/created files mirrored to `c:\Users\ASUS\OneDrive\Desktop\esg` with complete parity.

---

## 7. Phase 19: Mobile & Responsive Enterprise Experience

### 7.1 Objective & Strategy
Phase 19 delivers a unified, fully responsive enterprise experience across desktop, tablet, and mobile devices without creating a separate codebase or degrading desktop performance.
- **Desktop ($\ge 1024\text{px}$)**: Persistent 275px left sidebar navigation with seamless content alignment and zero clipping.
- **Tablet / Mobile ($< 1024\text{px}$)**: Accessible slide-out navigation drawer with backdrop overlay, accessible touch targets ($\ge 44\text{px} \times 44\text{px}$), sticky top app bar, and automatic drawer closing on route changes.
- **Data Densification to Card Transformation**: Dense multi-column tables on desktop transform into touch-friendly, high-information mobile cards on small screens ($< 768\text{px}$).

### 7.2 Key Architectural Components Updated
1. **[Sidebar.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/components/Sidebar.jsx)**:
   - Added `isOpen` and `onClose` props.
   - Mobile backdrop blur overlay (`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden`).
   - Smooth slide-out CSS transition (`w-[275px] max-w-[85vw] -translate-x-full lg:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`).
   - Accessible close button (`aria-label="Close navigation menu"` with min 36px touch target).
   - NavLinks automatically invoke `onClose?.()` on selection.

2. **[App.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/App.jsx) (`Layout` Component)**:
   - Root layout changed from unconditional `ml-[275px] w-[calc(100%-275px)]` to `w-full lg:ml-[275px] lg:w-[calc(100%-275px)] min-w-0`.
   - Manages `mobileMenuOpen` state and tracks `location.pathname` via `useLocation` hook to automatically dismiss the drawer on navigation.
   - Sticky mobile top header (`lg:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-2.5`) featuring:
     - Accessible hamburger button ($\ge 44\text{px} \times 44\text{px}$) with `aria-label="Open navigation menu"`.
     - CarbonESG brand logo.
     - Direct Command Center shortcut badge/button.

3. **[RiskList.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/RiskList.jsx)**:
   - Desktop table wrapped in `hidden md:block overflow-x-auto`.
   - Responsive card list rendered in `md:hidden divide-y divide-slate-100` featuring:
     - Title link, Category badge, Severity badge, and clamped description.
     - Probability & Impact visual progress bar and percentage breakdown.
     - Accessible action buttons (`View`, `Edit`, `Delete`) with touch targets $\ge 40\text{px}$.
   - Search form and pagination footer stack cleanly on small viewports.

4. **[PredictiveRiskDashboard.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/PredictiveRiskDashboard.jsx)**:
   - Emerging risks table wrapped in `hidden md:block overflow-x-auto`.
   - Responsive card view in `md:hidden divide-y divide-slate-100` displaying:
     - Risk title, category, project scope, and trajectory trend badge.
     - 2-column grid comparing Current Score vs Forecasted Score (with horizon days).
     - Critical probability gauge bar.
     - Top predictive driver factor.
     - Mobile action buttons (`Feedback`, `AI Agent`, `View`) with $\ge 40\text{px}$ touch targets.

5. **[AlertCenter.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/AlertCenter.jsx) & [CommandCenter.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/risk/CommandCenter.jsx)**:
   - Responsive touch targets ($\ge 40\text{px}$) for operational buttons (`Acknowledge`, `Resolve`, `Dismiss`, `Ask Copilot`, `Refresh`).
   - Universal search and filter toolbars wrap cleanly without horizontal scrollbar on mobile screens.

### 7.3 Verification & Quality Assurance
- **Phase 19 Responsive Verification Suite** ([verifyPhase19Responsive.mjs](file:///c:/Users/ASUS/OneDrive/Desktop/ai/verifyPhase19Responsive.mjs)): **27 / 27 Passed (100%)**
  - Group 1: Sidebar drawer architecture, props, transitions, and touch buttons (5/5)
  - Group 2: App layout, sticky mobile navbar, and hamburger target $\ge 44\text{px}$ (6/6)
  - Group 3: Risk registry table/card dual views and touch action targets (4/4)
  - Group 4: Predictive risk intelligence responsive transformation (3/3)
  - Group 5: Alert Center and Command Center touch targets (2/2)
  - Group 6: Live services connectivity on ports 3030, 5050, and 8000 (3/3)
- **Frontend Production Build**: `npm --prefix frontend run build` completed cleanly in 8.63s with 0 errors.
- **Legacy Regression Suites (100% Zero Regressions)**:
  - `verifyPhase18CommandCenter.mjs`: 18 / 18 Passed
  - `verifyPhase15_16_17_MasterE2E.mjs`: 61 / 61 Passed
  - `verifyPhase13DecisionIntelligence.mjs`: 51 / 51 Passed
  - `verifyPhase5FullWorkflow.mjs`: 15 / 15 Passed
  - `python -m pytest tests/ -q`: 182 / 182 Passed
- **Dual-Workspace Synchronization**: All modified frontend files synchronized with `c:\Users\ASUS\OneDrive\Desktop\esg`.

---

## 8. Phase 20: Enterprise Developer API Platform

### 8.1 Architectural Overview

Phase 20 implements an enterprise-grade developer platform with a versioned public API (`/api/v1/*`), multi-tiered rate limiting, cryptographically hashed credentials with single-reveal secrets, granular OAuth 2.0 and API Key scope enforcement, asynchronous webhooks with HMAC-SHA256 signatures, synthetic sandbox isolation, and an interactive Developer Portal UI (`/developer`).

Current verified services remain active:
- **Vite Frontend**: Port `3030`
- **Express Backend API**: Port `5050`
- **Python FastAPI Microservice**: Port `8000`

```
                                  [ External Integrators & Developer Portal ]
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │       API Gateway Pipeline      │
                                      │   - Correlation ID: REQ-xxxx    │
                                      │   - API Key & OAuth 2.0 Auth    │
                                      │   - Scope Enforcement           │
                                      │   - Tiered & AI Rate Limiter    │
                                      │   - Idempotency Guard (24h)     │
                                      │   - Usage & Telemetry Logging   │
                                      └────────────────┬────────────────┘
                                                       │
                     ┌─────────────────────────────────┼─────────────────────────────────┐
                     ▼                                 ▼                                 ▼
         ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
         │     Domain APIs       │         │    Webhook System     │         │   OpenAPI 3.0.3 Spec  │
         │ - /risks              │         │ - HMAC-SHA256 Signed  │         │ - GET /openapi.json   │
         │ - /predictions        │         │ - Async Non-Blocking  │         │ - 18 Granular Scopes  │
         │ - /analyses (LLM)     │         │ - Exponential Backoff │         │ - Response Envelopes  │
         │ - /agent/runs         │         │ - Delivery Audit Logs │         └───────────────────────┘
         │ - /scenarios          │         └───────────────────────┘
         │ - /alerts             │
         │ - /workflows          │
         │ - /executive          │
         └───────────────────────┘
```

### 8.2 Database Architecture & Data Models

Six core models were implemented in [`backend/models/models.js`](file:///c:/Users/ASUS/OneDrive/Desktop/ai/backend/models/models.js):

1. **`DeveloperApplication`**: Client ID, SHA-256 hashed client secret, scopes, rate-limit tier (`STANDARD`, `PROFESSIONAL`, `ENTERPRISE`), sandbox flag, and status.
2. **`ApiCredential`**: Masked prefix (`esg_live_...` or `esg_test_...`), SHA-256 secret hash, granular scopes, expiration date, and rotation history.
3. **`WebhookEndpoint`**: Registered destination URL, subscribed event topics, HMAC-SHA256 signing secret, delivery failure tracking, and status.
4. **`WebhookDelivery`**: Event ID, HTTP status code, request payload, response body, latency in ms, retry count, and error logging.
5. **`ApiRequestLog`**: Request ID, authenticated application, endpoint path, HTTP method, status code, latency, and dedicated AI metrics (model, token usage, cost).
6. **`IdempotencyRecord`**: Idempotency key, organization scope, original HTTP status, serialized response body, and 24-hour expiration.
7. **`RiskSchema` Extension**: Added `is_sandbox: { type: Boolean, default: false }` to guarantee complete tenant-level isolation for synthetic test data.

### 8.3 API Gateway Middleware Pipeline

Implemented in [`backend/src/modules/developer/apiGateway.js`](file:///c:/Users/ASUS/OneDrive/Desktop/ai/backend/src/modules/developer/apiGateway.js):

- **Request Correlation**: Extracts or generates `X-Request-ID` (`REQ-xxxx`), attached to request context and echoed on all response headers.
- **Dual Authentication**:
  - **API Keys**: Supports `X-API-Key` or `Authorization: Bearer esg_...`. Secret hashed via SHA-256 and matched against DB.
  - **OAuth 2.0 Client Credentials**: Exchanges client ID and secret via `POST /api/v1/oauth/token` for a signed JWT bearer token (1-hour TTL).
- **Scope Verification (`requireScope`)**: Evaluates token or key scopes against endpoint requirements (e.g. `risk:write`, `agent:run`, `prediction:read`). Unauthorized requests are rejected with standard HTTP 403 `FORBIDDEN`.
- **Tiered & AI Rate Limiting**: Sliding window rate limiter enforcing general endpoints and separate AI-specific quotas (Standard: 60/min gen, 10/min AI; Enterprise: 600/min gen, 100/min AI) returning `429 RATE_LIMITED` with `Retry-After`.
- **Idempotency Guard (`Idempotency-Key`)**: 24-hour response caching for mutable `POST` requests; replays return `X-Idempotent-Replay: true` without creating duplicate records.
- **Standardized Response Envelopes**:
  - Success: `{ data: ..., meta: { request_id: "REQ-..." } }`
  - Collection: `{ data: [...], pagination: { page, page_size, total }, meta: { request_id: "REQ-..." } }`
  - Error: `{ error: { code: "...", message: "...", request_id: "REQ-..." } }`

### 8.4 Webhook Notification System

Implemented in [`backend/src/modules/developer/webhookService.js`](file:///c:/Users/ASUS/OneDrive/Desktop/ai/backend/src/modules/developer/webhookService.js):

- **Signature Security**: Generates HMAC-SHA256 signature using the endpoint's single-reveal secret (`whsec_...`). Injected via headers:
  - `X-Webhook-Signature`: `sha256=<hex_digest>`
  - `X-Webhook-Timestamp`: ISO 8601 timestamp
  - `X-Webhook-ID`: Unique event identifier
- **Asynchronous Execution**: Event dispatch is non-blocking via `setImmediate`, ensuring core business requests remain low-latency.
- **Retry Mechanism**: Exponential backoff with up to 3 retry attempts for transient network or recipient failures (`5xx`, timeout).
- **Delivery Logging**: Every attempt records payload, response code, latency, and error reason in `WebhookDelivery`.

### 8.5 Developer Portal UI (`/developer`)

Built in [`frontend/src/pages/developer/DeveloperPortal.jsx`](file:///c:/Users/ASUS/OneDrive/Desktop/ai/frontend/src/pages/developer/DeveloperPortal.jsx):

- **8 Dedicated Sub-Panels**:
  1. **Overview**: KPI stat cards for active applications, API keys, webhook endpoints, and total API invocations.
  2. **Applications**: Application registry with creation modal, client ID display, and scope configuration.
  3. **API Keys**: Key lifecycle management, single-reveal key creation modal, live copy-to-clipboard, key rotation, and instant revocation.
  4. **API Documentation**: Interactive endpoint browser with live cURL examples and schema definitions.
  5. **Usage & Analytics**: Real-time charts for request volume, average latency, and HTTP status distributions.
  6. **Live Request Logs**: Searchable request audit log with method badges, status codes, and latency badges.
  7. **Webhooks**: Webhook endpoint registry, event topic checkboxes, test ping trigger, and delivery history modal.
  8. **Sandbox**: Synthetic test bed controls, test key quick-actions, and one-click synthetic data reset.
- **Single-Reveal Security Modal**: Raw API keys (`esg_live_...`, `esg_test_...`) and client secrets (`sec_...`, `whsec_...`) are presented once with a prominent security notice and copy button, never viewable again.

### 8.6 Verification & Quality Assurance

#### Phase 20 Verification Suite ([`verifyPhase20DeveloperPlatform.mjs`](file:///c:/Users/ASUS/OneDrive/Desktop/ai/verifyPhase20DeveloperPlatform.mjs)): **30 / 30 Passed (100%)**

| Step | Test Description | Result |
|---|---|---|
| Step 1 | Express Gateway v18.0.0 reports developer_platform: HEALTHY | ✅ PASS |
| Step 1 | Vite Frontend (:3030) and Python Microservice (:8000) are healthy | ✅ PASS |
| Step 2 | Multi-tenant setup: Authenticate Acme Admin and MSME User | ✅ PASS |
| Step 3 | Authoritative OpenAPI 3.0.3 Specification validation | ✅ PASS |
| Step 4 | Create Acme Developer Application and retrieve single-reveal client_secret | ✅ PASS |
| Step 5 | Obtain OAuth 2.0 Access Token with client credentials | ✅ PASS |
| Step 5 | Reject OAuth 2.0 Token Grant with invalid client_secret (401 UNAUTHENTICATED) | ✅ PASS |
| Step 6 | Generate Full-Access Live API Key (`esg_live_...`) with SHA-256 storage | ✅ PASS |
| Step 6 | Generate Restricted Read-Only API Key (`risk:read` only) | ✅ PASS |
| Step 7 | Authorize request via API Key and verify Correlation ID + Meta envelope | ✅ PASS |
| Step 7 | Authorize request via OAuth 2.0 Bearer token | ✅ PASS |
| Step 7 | Reject unauthorized requests with 401 UNAUTHENTICATED | ✅ PASS |
| Step 8 | Reject `POST /api/v1/risks` with Read-Only Key (403 FORBIDDEN) | ✅ PASS |
| Step 9 | First `POST /api/v1/risks` with Idempotency-Key succeeds (201 Created) | ✅ PASS |
| Step 9 | Duplicate `POST /api/v1/risks` with same Idempotency-Key returns cached replay (`X-Idempotent-Replay`) | ✅ PASS |
| Step 10 | `GET /api/v1/risks/:id` and `PATCH /api/v1/risks/:id` | ✅ PASS |
| Step 10 | `POST /api/v1/risks/:id/predict` and `GET /api/v1/risks/:id/predictions` | ✅ PASS |
| Step 10 | `POST /api/v1/risks/:id/analyze` (LLM Risk Analysis) | ✅ PASS |
| Step 10 | `POST /api/v1/agent/runs` & `GET /api/v1/agent/runs/:id/steps` (Phase 5 Autonomous Agent) | ✅ PASS |
| Step 10 | `POST /api/v1/scenarios` & `GET /api/v1/executive/overview` | ✅ PASS |
| Step 11 | Register Webhook Endpoint with single-reveal HMAC secret (`whsec_...`) | ✅ PASS |
| Step 11 | Trigger Webhook Test Ping and verify delivery records | ✅ PASS |
| Step 12 | Rotate API Credential (old key revoked, new key active) | ✅ PASS |
| Step 12 | Revoke API Credential (`DELETE /api/v1/developer/credentials/:id`) | ✅ PASS |
| Step 13 | Create Sandbox Application & Test Credential (`esg_test_...`) | ✅ PASS |
| Step 13 | Create Synthetic Risk in Sandbox & verify `X-Sandbox: true` header | ✅ PASS |
| Step 13 | Sandbox Reset (`POST /api/v1/sandbox/reset`) clears test data | ✅ PASS |
| Step 14 | Create MSME Application & verify zero cross-tenant risk leakage | ✅ PASS |
| Step 15 | Query Usage Metrics (`GET /developer/usage`) & Logs (`GET /developer/logs`) | ✅ PASS |
| Step 16 | Audit trail records `API_APPLICATION_CREATED`, `API_CREDENTIAL_CREATED`, `API_CREDENTIAL_ROTATED` | ✅ PASS |

#### Full Legacy Regression Suite (100% Zero Regressions)

- `verifyPhase19Responsive.mjs`: **27 / 27 Passed (100%)**
- `verifyPhase18CommandCenter.mjs`: **18 / 18 Passed (100%)**
- `verifyPhase15_16_17_MasterE2E.mjs`: **61 / 61 Passed (100%)**
- `verifyPhase13DecisionIntelligence.mjs`: **51 / 51 Passed (100%)**
- `verifyPhase5FullWorkflow.mjs`: **15 / 15 Passed (100%)**
- `python -m pytest tests/ -q`: **182 / 182 Passed (100%)**

#### Dual-Workspace Parity

All 10 Phase 20 files were fully mirrored and verified in `c:\Users\ASUS\OneDrive\Desktop\esg`:
- `backend/models/models.js`
- `backend/src/modules/developer/webhookService.js`
- `backend/src/modules/developer/openApiSpec.js`
- `backend/src/modules/developer/apiGateway.js`
- `backend/src/modules/developer/publicApiV1.js`
- `backend/src/server.ts`
- `frontend/src/pages/developer/DeveloperPortal.jsx`
- `frontend/src/App.jsx`
- `frontend/src/config/navigationConfig.js`
- `verifyPhase20DeveloperPlatform.mjs`


