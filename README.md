# 🌱 ESG & Carbon Credit Management Platform

An enterprise-grade, multi-tenant **Environmental, Social, and Governance (ESG) & Carbon Credit Management Platform**. Built with **React 18, Vite, Express, TypeScript, MongoDB, PostgreSQL (Prisma), Embedded MQTT (Aedes), and Firebase Hosting / Cloud Infrastructure**.

---

## 📑 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Key Capabilities](#-key-capabilities)
3. [System Architecture](#-system-architecture)
4. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
5. [Core Functional Modules](#-core-functional-modules)
6. [MQTT IoT Telemetry Architecture](#-mqtt-iot-telemetry-architecture)
7. [Carbon Credit Lifecycle & Verification](#-carbon-credit-lifecycle--verification)
8. [Firebase Cloud Integration & Security Rules](#-firebase-cloud-integration--security-rules)
9. [Soft Delete & Archive System](#-soft-delete--archive-system)
10. [Local Development Setup](#-local-development-setup)
11. [Default Seeded Credentials](#-default-seeded-credentials)
12. [Verification & Test Suites](#-verification--test-suites)
13. [Production Firebase Deployment Guide](#-production-firebase-deployment-guide)

---

## 🌟 Platform Overview

The ESG & Carbon Credit Platform provides organizations, MSMEs, platform operators, and third-party auditors with a single unified operating system for **environmental sustainability accounting, decarbonization project management, real-time IoT smart meter telemetry, and audited carbon credit issuance & retirement**.

### Core Value Pillars
- **Audit-Grade Accounting**: Compliant with GHG Protocol (Scope 1, 2, and 3), GRI, and BRSR standards.
- **Hardware-Level Telemetry**: Native embedded MQTT broker (`aedes`) ingesting live telemetry from smart energy meters, water flow sensors, PM2.5 air monitors, and digital scales.
- **End-to-End Decarbonization Lifecycle**: Structured workflow from project conception through auditor verification to tokenized/registry credit retirement.
- **Multi-Tenant Isolation**: Strict organization-level data boundaries enforced at both the API routing layer and Firebase/Firestore security rules.
- **Production-Ready & Fully Functional**: 0 mock endpoints, 0 dummy buttons, 100% database-backed persistence with soft-delete recovery.

---

## 🚀 Key Capabilities

- **3 Dedicated Role Dashboards**:
  - **Super Admin Governance Center**: Platform oversight, organization provisioning, user administration, emission factors, and system health.
  - **Platform Admin Operations Center**: 360° organization view, review queue, task assignments, SLAs, and approval workflows.
  - **MSME Command Center**: 6 core KPIs, Data Completeness Engine, Action Center, and trend analytics.
- **6 Core Environmental Modules**: Energy, GHG Emissions, Water Management, Waste Diversion, Pollution Prevention, and Biodiversity Conservation.
- **Decarbonization Project Registry (`/projects`)**: Complete state machine tracking projects from `DRAFT` to `VERIFIED`.
- **Carbon Credits Registry (`/carbon-credits`)**: Batch issuance, portfolio analytics, voluntary retirement, and cryptographic certificate generation (`RET-...`).
- **IoT Telemetry Studio (`/iot-simulator`)**: Interactive hardware simulator streaming MQTT packets directly over TCP port 1883.
- **Centralized Notification Center (`/notifications`)**: Unread/Read tracking, system alerts, deep-link routing, and real-time navigation badge.
- **Recycle Bin & Archive Center (`/archive`)**: Soft delete recovery for projects and evidence, with permanent eradication restricted to Super Admin.
- **Evidence Management (`/evidence`)**: Document upload, file validation (PDF, PNG, JPG, CSV, XLSX, DOCX up to 10MB), and auditor verification.
- **Reports Center (`/reports`)**: Live data exports in CSV, Excel, and structured JSON.

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |           FIREBASE HOSTING            |
                                  |   React 18 + Vite SPA Client (3030)   |
                                  +-------------------+-------------------+
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                                   |                                   |
                  v                                   v                                   v
+-----------------------------------+ +-------------------------------+ +-----------------------------------+
|      FIREBASE AUTHENTICATION      | |       FIREBASE STORAGE        | |         CLOUD FIRESTORE         |
| - Custom Claims: role, orgId      | | - /evidence/{orgId}/{projId}/ | | - users / organizations         |
| - Multi-tenant token verification | | - 10MB limit & MIME checks    | | - projects / esg_records        |
+-----------------+-----------------+ +---------------+---------------+ | - notifications / audit_logs    |
                  |                                   |                 +-----------------+-----------------+
                  +-----------------------------------+-----------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         EXPRESS BACKEND (5050)        |
                                  |      Node.js + TypeScript Runtime     |
                                  +---------+-------------------+---------+
                                            |                   |
                        +-------------------+                   +-------------------+
                        v                                                           v
+-----------------------------------------------+           +-----------------------------------------------+
|             POSTGRESQL / PRISMA               |           |                MONGODB SAAS                   |
| - System Governance & Organizations           |           | - Environmental Records (Energy, GHG, Water)  |
| - Users, Auth Passwords & System Alerts       |           | - Carbon Projects, Credit Batches, Documents  |
| - Transactions & Approvals Ledger             |           | - Audit Logs, Notifications & Alerts          |
+-----------------------------------------------+           +-----------------------------------------------+
                                                                            ^
                                                                            |
                                                            +---------------+---------------+
                                                            |     EMBEDDED MQTT BROKER      |
                                                            |      Aedes TCP Port 1883      |
                                                            |  Live Ingestion on `esg/#`   |
                                                            +-------------------------------+
```

---

## 👥 Role-Based Access Control (RBAC)

The platform implements strict Role-Based Access Control:

| Role | Access Level | Description | Key Permissions |
|---|---|---|---|
| **SUPER_ADMIN** | Platform Level | Highest governance authority | User management, organization provisioning, emission factors, system settings, audit logs, permanent eradication. |
| **PLATFORM_ADMIN** | Operations Level | Cross-tenant operational management | Work queue, 360° organization review, project review, approvals, verifications, SLA escalations. |
| **AUDITOR** | Independent Third-Party | Verification and compliance review | Project verification, evidence document review, carbon credit minting authorization. |
| **ADMIN / MSME_USER** | Tenant Scoped | Organization owner/manager | Manage organization data, create & submit projects, view credit portfolio, upload evidence. |
| **ESG_MANAGER** | Tenant Scoped | Environmental reporting specialist | Manage GHG, energy, water, waste, targets, and action plans. |
| **ENVIRONMENTAL_MANAGER** | Tenant Scoped | Facility operations specialist | Log meter readings, monitor pollution thresholds and mitigation plans. |
| **DATA_ENTRY** | Facility Scoped | Frontline data clerk | Enter operational meter readings and facility utility bills. |
| **VIEWER** | Tenant Scoped | Read-only stakeholder | View published dashboards, verified metrics, and export reports. |

> [!IMPORTANT]
> **Non-Self-Verification**: Tenants and data submitters are strictly forbidden from approving or verifying their own records. All transitions to `APPROVED` or `VERIFIED` require an authorized `PLATFORM_ADMIN` or `AUDITOR`.

---

## 🌿 Core Functional Modules

### 1. Energy Management (`/energy`)
- Tracks grid electricity, diesel generators, solar, wind, and biomass.
- Breakdown by usage categories: Production Machinery, HVAC, Pumps, Lighting, IT Equipment.
- Auto-syncs Scope 2 emissions for grid consumption (\(\text{kWh} \times 0.82\,\text{kg CO}_2\text{e/kWh}\)).

### 2. Greenhouse Gas Emissions (`/ghg`)
- **Scope 1**: Direct stationary combustion (diesel, natural gas, fuel oil) and mobile combustion.
- **Scope 2**: Indirect purchased grid electricity and steam.
- **Scope 3**: Value chain emissions (business travel, upstream supply chain, waste disposal).

### 3. Water Management (`/water`)
- Sources: Municipal Water, Groundwater, Rainwater Harvesting, Recycled STP Process Water.
- Water risk vulnerability mapping (Water Stress, Scarcity, Flood Risk).

### 4. Waste Diversion & Circularity (`/waste`)
- Categories: Plastic, Metal, Paper, Organic, Electronic (E-Waste), Hazardous Chemicals.
- Diversion tracking: Recycling, Composting, Recovery, Reuse, Incineration, Landfill.

### 5. Pollution Prevention & Limit Breaches (`/pollution`)
- Ambient air pollutants (\(PM_{2.5}, PM_{10}, SO_x, NO_x\)) and effluent parameters (\(BOD, COD, TSS\)).
- Automated statutory breach trigger: If measurements exceed legal statutory limits, a `CRITICAL` alert is immediately dispatched to the notification center.

### 6. Biodiversity Conservation (`/biodiversity`)
- Site sensitivity ratings, proximity to protected zones, and restored/preserved hectares.

---

## 📡 MQTT IoT Telemetry Architecture

The platform runs an **embedded Aedes MQTT Broker** natively inside the Node.js backend on TCP port `1883`.

### Topic Scheme
```
esg/{organizationId}/{facilityId}/{module}/{deviceId}
```

- **Energy Telemetry**: `esg/{orgId}/{facilityId}/energy/{meterId}`
  - Payload: `{ "meterNumber": "MTR-101", "currentReading": 12450.5, "unit": "kWh", "sourceType": "GRID" }`
  - Auto-calculates consumption against baseline and triggers Scope 2 emission logging.
- **Water Telemetry**: `esg/{orgId}/{facilityId}/water/{deviceId}`
  - Payload: `{ "flowVolume": 45.2, "unit": "m3", "source": "Municipal Water" }`
- **Air Quality & Pollution**: `esg/{orgId}/{facilityId}/pollution/{sensorId}`
  - Payload: `{ "pollutantType": "PM2.5", "actualValue": 78.4, "legalLimit": 60, "unit": "µg/m3" }`
  - Auto-triggers critical alert if `actualValue > legalLimit`.
- **Smart Waste Scale**: `esg/{orgId}/{facilityId}/waste/{binId}`
  - Payload: `{ "weight": 85.0, "category": "Paper", "disposalMethod": "Recycling" }`

### IoT Telemetry Studio (`/iot-simulator`)
Users can navigate to `/iot-simulator` to:
- Test real-time hardware packet publishing with interactive sliders.
- Simulate statutory breach scenarios (e.g. \(PM_{2.5} > 60\,\mu g/m^3\)).
- Enable automated 3-second live streaming.
- Inspect raw MQTT QoS packets in the live terminal feed.

---

## 🏆 Carbon Credit Lifecycle & Verification

The platform enforces an explicit state machine for decarbonization projects:

```
[ DRAFT ] 
   ↓ (Submit for Review)
[ SUBMITTED ] 
   ↓ (Platform Admin Reviews)
[ UNDER REVIEW ] 
   ↓ (If discrepancies found)
[ CHANGES REQUESTED ] → (MSME Updates & Resubmits) → [ SUBMITTED ]
   ↓ (Platform Admin Approves)
[ APPROVED ] 
   ↓ (Auditor Rigorous Verification)
[ VERIFIED ] 
   ↓ (Automatic Credit Batch Minting)
[ CARBON CREDITS ISSUED ]
   ↓ (Voluntary Retirement)
[ RETIREMENT CERTIFICATE GENERATED ]
```

### Carbon Credits Registry (`/carbon-credits`)
- **Automatic Minting**: When a project is marked `VERIFIED`, the system automatically issues a standardized batch:
  `CC-{YEAR}-{PROJECT_ID}`
- **Voluntary Retirement**: Organizations can permanently retire credits to offset Scope 1 and Scope 2 operational emissions.
- **Cryptographic Certificate**: Each retirement burns available credits, logs an immutable audit event, and issues an official certificate (e.g. `RET-1725350800000-482`).

---

## 🔥 Firebase Cloud Integration & Security Rules

### Files & Configuration
- [`firebase.json`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/firebase.json): Configures Hosting (`frontend/dist`), SPA rewrites (`"source": "**", "destination": "/index.html"`), cache headers, Firestore rules, Storage rules, and Functions.
- [`.firebaserc`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/.firebaserc): Defines default Firebase project `esg-carboncredit-platform`.
- [`firestore.rules`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/firestore.rules):
  - Strict tenant boundary: `belongsToOrg(orgId)`.
  - Non-self-verification: `request.resource.data.status in ['APPROVED', 'VERIFIED'] ? isAuditor() : true`.
  - Soft-delete protections: `!('isDeleted' in data) || data.isDeleted == false`.
  - Immutable audit logs: Append-only for system, read-only for tenants.
- [`storage.rules`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/storage.rules):
  - Organization folder containment: `/evidence/{orgId}/{projId}/{fileName}`.
  - File size validation: `< 10MB`.
  - MIME type whitelist: PDF, PNG, JPEG, CSV, XLSX, DOCX.
- [`firestore.indexes.json`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/firestore.indexes.json): Composite query indexes for multi-tenant queries.
- [`functions/index.js`](file:///c:/Users/ASUS/OneDrive/Desktop/esg/functions/index.js): Cloud Functions for custom claims assignment, project status updates, and automated notifications.

---

## 🗑️ Soft Delete & Archive System

To prevent accidental data loss and preserve audit lineage, destructive permanent deletion is replaced with a **Soft Delete & Recovery Architecture**:

- **Metadata Fields**:
  ```json
  {
    "isDeleted": true,
    "deletedAt": "2026-09-03T13:30:00.000Z",
    "deletedBy": "admin@acme.com"
  }
  ```
- **Automatic Exclusion**: Standard dashboard queries and list views automatically exclude soft-deleted records (`isDeleted: false`).
- **Recycle Bin (`/archive`)**:
  - Authorized tenant managers can view archived projects and evidence.
  - **Restore**: Re-activates the item into active workspaces and calculations.
  - **Permanent Delete**: Restricted strictly to `SUPER_ADMIN` with explicit confirmation via `ConfirmDialog`.

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **MongoDB**: Running locally at `mongodb://localhost:27017/esg-environmental` (or MongoDB Atlas URI)
- **Git**: Installed and configured

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url> esg
cd esg

# Install monorepo root, backend, and frontend packages
npm install
npm run install-all
```

### 2. Environment Configuration
Create or verify `.env` in `backend/`:
```env
PORT=5050
MONGO_URI=mongodb://localhost:27017/esg-environmental
DATABASE_URL="mongodb://localhost:27017/esg-environmental"
JWT_SECRET=environmental-esg-secret-key-98765
```

### 3. Start Development Servers
Run backend, frontend, and the MQTT broker concurrently:
```bash
npm run dev
```

- **Frontend App**: [http://localhost:3030/](http://localhost:3030/)
- **Backend API**: [http://localhost:5050/](http://localhost:5050/)
- **Embedded MQTT Broker**: `mqtt://localhost:1883`

---

## 🔑 Default Seeded Credentials

The database boots with pre-seeded demo accounts for testing each role:

| Role | Email | Password | Organization |
|---|---|---|---|
| **Super Admin** | `superadmin@esg.com` | `password123` | CarbonCredit.Network SaaS Admins |
| **Platform Admin** | `platformadmin@esg.com` | `password123` | CarbonCredit.Network SaaS Admins |
| **MSME Admin** | `msme@esg.com` | `password123` | Eco Corp MSME |
| **Enterprise Admin** | `admin@acme.com` | `password123` | Acme Corporation |
| **ESG Manager** | `esg_mgr@acme.com` | `password123` | Acme Corporation |
| **Auditor** | `auditor@acme.com` | `password123` | Acme Corporation |
| **Data Entry** | `data_entry@acme.com` | `password123` | Acme Corporation |
| **Viewer** | `viewer@acme.com` | `password123` | Acme Corporation |

---

## 🧪 Verification & Test Suites

The codebase includes automated test suites covering all platform tiers:

### 1. Preexisting Full-Stack ESG & MQTT Suite
```bash
node scratch/verifyAllPagesAndMQTT.js
```
*Validates 16/16 subsystems including Super Admin, Platform Admin, MSME Dashboard, 6 core modules, Evidence, Reports, and MQTT TCP broker.*

### 2. Production Firebase & Lifecycle Suite
```bash
node scratch/testProductionFirebaseSuite.js
```
*Validates 20/20 production features including Firebase configuration assets, Project creation, Submission, Reviewer change requests, Approval, Auditor verification, Credit minting, Voluntary retirement, Notification pipeline, Soft delete, and Restore.*

---

## 🚀 Production Firebase Deployment Guide

### 1. Install Firebase CLI & Authenticate
```bash
npm install -g firebase-tools
firebase login
```

### 2. Build Frontend Distribution
```bash
cd frontend
npm run build
cd ..
```
*Compiles the Vite React application into `frontend/dist/` with 0 warnings/errors.*

### 3. Deploy to Firebase
Deploy all hosting assets, security rules, indexes, and Cloud Functions with a single command:
```bash
firebase deploy
```

Or deploy individual services:
```bash
# Deploy only the frontend SPA
firebase deploy --only hosting

# Deploy Firestore security rules and composite indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Firebase Storage security rules
firebase deploy --only storage

# Deploy Cloud Functions
firebase deploy --only functions
```

---

## 🛡️ Phase 8: Enterprise Production Hardening & Operational Readiness

### 1. Multi-Tier Microservice Architecture
The ESG & CarbonCredit.Network AI Risk Manager runs on three coordinated microservices:
- **Express Gateway** (`http://localhost:5050`): Multi-tenant RBAC, authoritative risk scoring, REST API gateway, and audit logging.
- **Python AI Microservice** (`http://localhost:8000`): LLM Risk Analysis, Vector Semantic Search (Qdrant), AI Agent Orchestrator, Proactive Monitoring, and Workflow Engine.
- **Vite React Frontend** (`http://localhost:3030`): Enterprise Operations Console, Alert Center, Workflow Manager, and Risk Heatmap.

### 2. Enterprise Security Architecture
- **HTTP Security Headers**: Strict Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and HSTS.
- **Sliding-Window Rate Limiting**: In-memory IP/tenant rate limiter protecting against brute-force and DoS attacks.
- **NoSQL Injection & Input Sanitization**: Strips operator keys (`$gt`, `$ne`, `$where`, `.`) from request payloads and bounds pagination queries (max 100).
- **Multi-Tenant Boundary Containment**: Rigid `organizationId` scoping enforced on every database query and Qdrant vector retrieval.
- **AI Guardrails & Prompt Injection Defense**: Heuristic pattern analysis detecting system prompt overrides, roleplay jailbreaks, and command injection keywords.
- **Human-in-the-Loop (HITL) Governance**: Sensitive actions (`CHANGE_RISK_OWNER`, `DESTRUCTIVE_ACTION`, external notifications) pause execution and require human approval.

### 3. Observability & Health Monitoring
- **Correlation ID Tracking**: `X-Correlation-ID` and `X-Request-ID` injected and propagated across Express, Python, Agent runs, and Workflow instances.
- **Component Health Checks**:
  - Express: `GET /api/health` returns status of MongoDB, Python AI microservice, Qdrant vector store, monitoring scheduler, and workflow engine.
  - Python: `GET /health` returns status of vector database, LLM provider, and schedulers.
- **Operational Metrics**: Real-time tracking of request counts, latencies (avg, p50, p95), error rates, tool calls, and monitoring sweeps.
- **Secret Protection**: Automatic redaction of sensitive credentials (`password`, `token`, `secret`, `api_key`) in logs and admin UI.

### 4. Backup, Retention & Disaster Recovery
- **Database Collections & Vector Snapshots**: `node scripts/backup_restore.js` generates point-in-time snapshots with integrity verification.
- **Restore Verification Check**: `node scripts/backup_restore.js --test-restore` verifies restorable integrity across all 12 collections.
- **Data Retention Policies**: Configurable retention periods per entity type (documents, risks, audit logs, workflows) with dry-run evaluation.

### 5. Automated Verification & Test Commands
Run the complete suite of automated verification scripts:
```bash
# Phase 8 Verification Suites
node verifyPhase8Security.mjs           # 15 enterprise security attack tests
node verifyPhase8Performance.mjs        # Concurrency & load benchmark
node verifyPhase8EnterpriseE2E.mjs       # 16-step complete system workflow test
python -m pytest tests/test_ai_evaluation.py -v # 10-scenario AI evaluation benchmark
node scripts/backup_restore.js --test-restore   # Backup & disaster recovery test

# Full Multi-Phase Regression Suite (Phases 1-7)
node verifyPhase1FullWorkflow.mjs
node verifyPhase2FullWorkflow.mjs
node verifyPhase3FullWorkflow.mjs
node verifyPhase4FullWorkflow.mjs
node verifyPhase5FullWorkflow.mjs
node verifyPhase6FullWorkflow.mjs
node verifyPhase7FullWorkflow.mjs

# Python Unit & Integration Pytest Suite
python -m pytest tests/

# Production Frontend Build
cd frontend && npm run build
```

---

## 📄 License
This software is licensed under the MIT License. Copyright © 2026 ESG & Carbon Credit Network.

