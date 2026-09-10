# Enterprise Role-Based Access Control (RBAC) Matrix

Authoritative authorization matrix for the **ESG / CarbonCredit.Network AI Risk Manager** enforcing enterprise multi-tenant and role-scoped permissions.

---

## 1. Enterprise Roles Definition

| Role Identifier | Description | Scope |
|---|---|---|
| `SUPER_ADMIN` | Global platform architect with unrestricted read/write/governance access across all tenants and system configurations. | Global / Multi-Tenant |
| `PLATFORM_ADMIN` | Infrastructure and system administrator managing cross-tenant operations, models, and background services. | Global / Multi-Tenant |
| `ORGANIZATION_ADMIN` | Executive administrator for an individual organization/tenant with full tenant-level management authority. | Tenant-Scoped |
| `ESG_MANAGER` | Domain lead overseeing sustainability, greenhouse gas emissions, carbon offsets, and ESG risk assessments. | Tenant-Scoped |
| `COMPLIANCE_MANAGER` | Regulatory specialist handling regulatory mandates (CBAM, CSRD, GHG Protocol), audits, and compliance milestones. | Tenant-Scoped |
| `PROJECT_MANAGER` | Operational manager responsible for execution and mitigation within specific assigned projects. | Project & Tenant-Scoped |
| `MSME_USER` | Small/medium enterprise participant reporting primary emissions telemetry and project evidence. | Tenant-Scoped |
| `VIEWER` | Read-only auditor or stakeholder with strict read access; zero state-modifying or write tool authority. | Tenant-Scoped |

---

## 2. Resource Permissions Breakdown

| Resource / Capability | `SUPER_ADMIN` | `PLATFORM_ADMIN` | `ORGANIZATION_ADMIN` | `ESG_MANAGER` | `COMPLIANCE_MANAGER` | `PROJECT_MANAGER` | `MSME_USER` | `VIEWER` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Risk Records (Read)** | All | All | Org Only | Org Only | Org Only | Project Only | Org Only | Org Only (Read-Only) |
| **Risk Records (Create/Update)** | Yes | Yes | Org Only | Org Only | Org Only | Project Only | Org Only | **No (403 Forbidden)** |
| **Risk Records (Delete)** | Yes | Yes | Org Only | No | No | No | No | **No (403 Forbidden)** |
| **Deterministic Scoring (Calculate)**| Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes (Read Score) |
| **Deterministic Scoring (Override)** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| **Knowledge Base (Search/Retrieve)**| Yes | Yes | Org Only | Org Only | Org Only | Project Only | Org Only | Org Only |
| **Knowledge Base (Upload/Ingest)** | Yes | Yes | Org Only | Org Only | Org Only | Project Only | No | **No (403 Forbidden)** |
| **Knowledge Base (Delete Document)**| Yes | Yes | Org Only | Org Only | Org Only | No | No | **No (403 Forbidden)** |
| **AI Risk Analysis (Trigger)** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes (Read Only) |
| **AI Agent (Run Agent / Read Tools)**| Yes | Yes | Yes | Yes | Yes | Yes | Yes | Read Tools Only |
| **AI Agent (Write Tools / Sensitive)**| Yes | Yes | Yes | Requires Approval | Requires Approval | Requires Approval | No | **No (403 Forbidden)** |
| **Human-In-The-Loop (HITL) Approve**| Yes | Yes | Org Only | Org Only | Org Only | Project Only | No | **No (403 Forbidden)** |
| **Monitoring Rules (Read)** | Yes | Yes | Org Only | Org Only | Org Only | Org Only | Org Only | Org Only |
| **Monitoring Rules (Create/Edit)** | Yes | Yes | Org Only | Org Only | Org Only | No | No | **No (403 Forbidden)** |
| **Monitoring Sweeps (Trigger)** | Yes | Yes | Org Only | Org Only | Org Only | No | No | **No (403 Forbidden)** |
| **Alerts (Triage / Ack / Resolve)** | Yes | Yes | Org Only | Org Only | Org Only | Project Only | No | **No (403 Forbidden)** |
| **Workflow Definitions (Create/Edit)**| Yes | Yes | Org Only | Org Only | Org Only | No | No | **No (403 Forbidden)** |
| **Workflow Instances (Trigger/Retry)**| Yes | Yes | Org Only | Org Only | Org Only | Project Only | No | **No (403 Forbidden)** |
| **Admin Operations Console (`/admin`)**| Yes | Yes | Yes | No | No | No | No | **No (403 Forbidden)** |
| **Data Retention Policies (Edit)** | Yes | Yes | Org Only | No | No | No | No | **No (403 Forbidden)** |
| **System Health & Masked Config** | Yes | Yes | Org Only | No | No | No | No | **No (403 Forbidden)** |
| **Disaster Recovery (Backup/Restore)**| Yes | Yes | No | No | No | No | No | **No (403 Forbidden)** |

---

## 3. Mandatory Backend Enforcement Architecture

1. **Authentication Token (`Bearer JWT`)**:
   - Every request validates signature and expiration against server-side secret.
   - Decoded claims contain `{ userId, email, role, organizationId, projectId, permissions }`.
2. **Tenant Scoping Guard (`enforceRiskScope`, `tenantScope`)**:
   - Injected at the Express router level before data access.
   - Injects `organizationId` from validated user token into database query criteria.
   - Ignores untrusted client-provided `organizationId` in request bodies or query parameters.
3. **Write Tool Permission Guard (`default_tool_registry.check_permission`)**:
   - Validates that user possesses necessary tool permission.
   - Rejecting non-privileged roles (e.g. `VIEWER`) attempting state modifications with `ToolPermissionError` / HTTP 403.
4. **Sensitive Action HITL Barrier (`default_approval_service`)**:
   - Write actions (`create_mitigation_plan`, `assign_risk_owner`, `update_risk_status`) pause for approval by authorized managers.
   - Cannot be bypassed via direct API call or malicious payload.
