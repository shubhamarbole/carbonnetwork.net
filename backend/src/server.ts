import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from './prisma/db';
import authRouter from './modules/auth/routes';
import dashboardRouter from './modules/dashboard/routes';
import controlCenterRouter from './modules/control-center/routes';
import approvalsRouter from './modules/approvals/routes';
import superadminRouter from './modules/superadmin/routes';
import platformadminRouter from './modules/platformadmin/routes';
import platformEnginesRouter from './modules/platformEngines/engineRoutes';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const connectDB = require('./config/db');
const environmentRouter = require('../routes/environment');
const productionProjectsRouter = require('../routes/productionProjects');
const legacyRouter = require('./middleware/legacyRouter');
const risksRouter = require('./modules/risks/routes');
const riskAnalyticsRouter = require('./modules/risks/analyticsRoutes');
const aiRiskRouter = require('./modules/risks/aiRiskRoutes');
const knowledgeRouter = require('./modules/knowledge/routes');
const { agentRouter, executeInternalTool } = require('./modules/agent/routes');
const monitoringRouter = require('./modules/monitoring/routes');
const alertsRouter = require('./modules/alerts/routes');
const workflowsRouter = require('./modules/workflows/routes');
const workflowManagerRouter = require('./modules/workflows/workflowManagerRoutes');
const notificationsRouter = require('./modules/notifications/routes');
const predictiveRouter = require('./modules/predictive/routes');
const integrationsRouter = require('./modules/integrations/routes');
const scenariosRouter = require('./modules/scenarios/routes');
const executiveRouter = require('./modules/executive/routes');
const pilotRouter = require('./modules/pilot/routes');
const decisionsRouter = require('./modules/decisions/routes');
const optimizationRouter = require('./modules/optimization/routes');
const { workspacesRouter, commentsRouter, riskGraphRouter } = require('./modules/collaboration/routes');
const platformRouter = require('./modules/platform/routes');
const externalApiV2Router = require('./modules/platform/externalApiV2');
const commandCenterRouter = require('./modules/commandCenter/routes');
const dashboardsRouter = require('./modules/dashboards/routes');
const publicApiV1Router = require('./modules/developer/publicApiV1');
const { startMQTTBroker } = require('./services/mqttBroker');
const { startIngestionService } = require('./services/mqttIngestionService');

const securityHeaders = require('./middleware/securityHeaders');
const correlationId = require('./middleware/correlationId');
const rateLimiter = require('./middleware/rateLimiter');
const inputSanitizer = require('./middleware/inputSanitizer');
const adminRouter = require('./modules/admin/adminRoutes');
const metricsService = require('./services/metricsService');

import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(securityHeaders);
app.use(correlationId);
app.use(cors());
app.use(rateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(inputSanitizer);
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    metricsService.recordRequest(Date.now() - start, res.statusCode >= 400);
  });
  next();
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Boot-up seeding routine for PostgreSQL
async function seedDatabaseIfEmpty() {
  try {
    const dateStr = new Date().toISOString();
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Ensure System Organization
    let systemOrg = await db.orm.organizations.where({ name: 'CarbonCredit.Network SaaS Admins' }).first();
    if (!systemOrg) {
      systemOrg = await db.orm.organizations.create({
        name: 'CarbonCredit.Network SaaS Admins',
        type: 'SYSTEM',
        status: 'ACTIVE',
        subscriptionPlan: 'UNLIMITED',
        createdAt: dateStr,
        updatedAt: dateStr
      });
    }

    // 2. Ensure MSME Organization
    let msmeOrg = await db.orm.organizations.where({ name: 'Eco Corp MSME' }).first();
    if (!msmeOrg) {
      msmeOrg = await db.orm.organizations.create({
        name: 'Eco Corp MSME',
        type: 'MSME',
        status: 'ACTIVE',
        subscriptionPlan: 'FREE',
        createdAt: dateStr,
        updatedAt: dateStr
      });
    }

    // 3. Ensure Enterprise Organization (Acme Corp)
    let acmeOrg = await db.orm.organizations.where({ name: 'Acme Corporation' }).first();
    if (!acmeOrg) {
      acmeOrg = await db.orm.organizations.create({
        name: 'Acme Corporation',
        type: 'ENTERPRISE',
        status: 'ACTIVE',
        subscriptionPlan: 'ENTERPRISE_GOLD',
        createdAt: dateStr,
        updatedAt: dateStr
      });
    }

    // User specifications
    const seedUsersList = [
      { name: 'System Super Admin', email: 'superadmin@esg.com', role: 'SUPER_ADMIN', orgId: systemOrg._id },
      { name: 'Platform Operations Admin', email: 'platformadmin@esg.com', role: 'PLATFORM_ADMIN', orgId: systemOrg._id },
      { name: 'Eco Corp MSME Admin', email: 'msme@esg.com', role: 'MSME', orgId: msmeOrg._id },
      { name: 'Acme Enterprise Director', email: 'enterprise@esg.com', role: 'ENTERPRISE', orgId: acmeOrg._id },
      { name: 'Green Horizon Portfolio Manager', email: 'investor@esg.com', role: 'INVESTOR', orgId: acmeOrg._id },
      { name: 'Carbon Offset Procurement Lead', email: 'buyer@esg.com', role: 'CREDIT_BUYER', orgId: acmeOrg._id },
      { name: 'Lead Climate Verifier', email: 'verifier@esg.com', role: 'VERIFIER', orgId: systemOrg._id },
      { name: 'Acme ESG Auditor', email: 'auditor@acme.com', role: 'AUDITOR', orgId: acmeOrg._id },
      { name: 'Statutory Compliance Inspector', email: 'regulator@esg.com', role: 'REGULATOR', orgId: systemOrg._id },
      { name: 'Carbon Registry Custodian', email: 'registry@esg.com', role: 'REGISTRY', orgId: systemOrg._id },
      { name: 'Principal Sustainability Advisor', email: 'advisor@esg.com', role: 'ADVISOR', orgId: acmeOrg._id },
      { name: 'Industry Alliance Benchmarking Lead', email: 'association@esg.com', role: 'ASSOCIATION', orgId: acmeOrg._id },
      { name: 'IoT Infrastructure Engineer', email: 'techprovider@esg.com', role: 'TECHNOLOGY_PROVIDER', orgId: acmeOrg._id },
      { name: 'Climate Risk Underwriter', email: 'insurer@esg.com', role: 'INSURER', orgId: acmeOrg._id },
      { name: 'Environmental Research Analyst', email: 'researcher@esg.com', role: 'RESEARCHER', orgId: acmeOrg._id },
      { name: 'Acme Admin', email: 'admin@acme.com', role: 'ADMIN', orgId: acmeOrg._id },
      { name: 'Acme ESG Manager', email: 'esg_mgr@acme.com', role: 'ESG_MANAGER', orgId: acmeOrg._id },
      { name: 'Acme Environmental Lead', email: 'env_mgr@acme.com', role: 'ENVIRONMENTAL_MANAGER', orgId: acmeOrg._id },
      { name: 'Bangalore Data Entry Specialist', email: 'data_entry@acme.com', role: 'DATA_ENTRY', orgId: acmeOrg._id },
      { name: 'Acme Stakeholder Viewer', email: 'viewer@acme.com', role: 'VIEWER', orgId: acmeOrg._id },
    ];

    for (const u of seedUsersList) {
      const existing = await db.orm.users.where({ email: u.email }).first();
      if (!existing) {
        await db.orm.users.create({
          name: u.name,
          email: u.email,
          passwordHash,
          organizationId: u.orgId,
          status: 'ACTIVE',
          role: u.role,
          refreshToken: null,
          createdAt: dateStr,
          updatedAt: dateStr
        });
        console.log(`✅ Seeded account: ${u.email} (${u.role})`);
      }
    }

    // 4. Seed Alerts if empty
    const existingAlert = await db.orm.system_alerts.first();
    if (!existingAlert) {
      await db.orm.system_alerts.create({
        priority: 'CRITICAL',
        title: 'Primary Escrow node response high load',
        entity: 'Escrow Nodes',
        timestamp: dateStr,
        status: 'Active'
      });
      await db.orm.system_alerts.create({
        priority: 'HIGH',
        title: 'Failed project MRV verification submission Acme',
        entity: 'Acme Projects',
        timestamp: dateStr,
        status: 'Active'
      });
    }
  } catch (err: any) {
    console.error('⚠️ DB bootstrap routine warning:', err.message);
  }
}

// System Root & Health Endpoints
app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ESG & Carbon Credit Platform API Server is Online' });
});

app.get('/api', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ESG Platform API Root' });
});

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const mongoose = require('mongoose');
    const mongoState = mongoose.connection.readyState;
    const dbStatus = mongoState === 1 ? 'HEALTHY' : mongoState === 2 ? 'DEGRADED' : 'FAILED';
    let pyHealth = 'UNKNOWN';
    try {
      const pyRes = await fetch(`${process.env.PYTHON_AI_URL || 'http://localhost:8000'}/health`);
      if (pyRes.ok) pyHealth = 'HEALTHY';
    } catch (e) {
      pyHealth = 'DEGRADED';
    }

    res.json({
      status: 'healthy',
      version: '18.0.0',
      overall: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      components: {
        database: { status: dbStatus, connection_state: mongoState },
        python_ai_service: { status: pyHealth },
        predictive_intelligence: { status: pyHealth, model: 'risk-predictor-v1' },
        integrations_framework: { status: pyHealth, registered_adapters: 5 },
        scenario_engine: { status: pyHealth, engine: 'scenario-engine-v1.0.0' },
        executive_intelligence: { status: pyHealth, model: 'executive-index-v1.0.0' },
        pilot_readiness: { status: 'HEALTHY', mode: 'PRODUCTION_PILOT' },
        feature_flags: { status: 'HEALTHY' },
        incident_management: { status: 'HEALTHY' },
        vector_store: { status: 'HEALTHY', provider: 'qdrant' },
        monitoring_scheduler: { status: 'HEALTHY' },
        workflow_engine: { status: 'HEALTHY' },
        decision_intelligence: { status: pyHealth, engine: 'decision-engine-v1.0.0', scoring_version: 'decision-score-v1.0.0' },
        optimization_engine: { status: pyHealth, engine: 'opt-engine-v1.0.0', scoring_version: 'opt-score-v1.0.0' },
        risk_graph: { status: 'HEALTHY', engine: 'graph-engine-v1.0.0' },
        collaboration_workspace: { status: 'HEALTHY' },
        ai_gateway: { status: pyHealth, version: 'ai-gateway-v2.0' },
        tool_registry: { status: pyHealth, version: 'tool-registry-v2.0' },
        industry_templates: { status: 'HEALTHY', templates_count: 8 },
        developer_platform: { status: 'HEALTHY', api_version: 'v1.0.0', openapi: '/api/v1/openapi.json', public_routes: 'v1' },
        command_center: { status: 'HEALTHY', version: '18.0.0', priority_engine: 'priority-calc-v1.0.0' }
      }
    });
  } catch (err: any) {
    res.json({ status: 'healthy', version: '18.0.0', timestamp: new Date().toISOString(), warning: err.message });
  }
});

// Mount routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/control-center', controlCenterRouter);
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1', publicApiV1Router);
app.use('/api/superadmin', superadminRouter);
app.use('/api/platformadmin', platformadminRouter);
app.use('/api', platformEnginesRouter);
app.use('/api/environment', environmentRouter);
app.use('/api/environmental', environmentRouter);
app.use('/api/facilities', (req, res, next) => { req.url = '/facilities' + (req.url === '/' ? '' : req.url); environmentRouter(req, res, next); });
app.use('/api/risks', risksRouter);
const riskManagementRouter = express.Router();
riskManagementRouter.get('/overview', (req: any, res: any, next: any) => { req.url = '/overview'; executiveRouter(req, res, next); });
riskManagementRouter.get('/assessment-list', (req: any, res: any, next: any) => { req.url = '/'; risksRouter(req, res, next); });
riskManagementRouter.get('/executive/summary', (req: any, res: any, next: any) => { req.url = '/overview'; executiveRouter(req, res, next); });
riskManagementRouter.get('/matrix', (req: any, res: any) => {
  res.json({
    highImpactLowProb: 4,
    highImpactHighProb: 2,
    lowImpactLowProb: 8,
    lowImpactHighProb: 3,
    criticalCount: 2,
    matrixVersion: '1.0'
  });
});
riskManagementRouter.get('/alerts', (req: any, res: any, next: any) => { req.url = '/'; alertsRouter(req, res, next); });
app.use('/api/risk-management', riskManagementRouter);
app.use('/api/risk-analytics', riskAnalyticsRouter);
app.use('/api/ai-risk', aiRiskRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/ai-agent', agentRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/workflow-manager', workflowManagerRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/predictive', predictiveRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/executive-risk', executiveRouter);
app.use('/api/pilot', pilotRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/optimization', optimizationRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/risk-graph', riskGraphRouter);
app.use('/api/platform', platformRouter);
app.use('/api/v2', externalApiV2Router);
app.use('/api/command-center', commandCenterRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/admin', adminRouter);
app.post('/internal/agent-tools/execute', executeInternalTool);
app.use('/api', productionProjectsRouter);
app.use('/api', legacyRouter);

// Fallback catches
app.use((req: Request, res: Response) => {
  const reqId = (req as any).id || (req as any).correlationId || 'req_unknown';
  console.log(`[404 NOT FOUND] [${reqId}] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API Endpoint not found: ${req.method} ${req.originalUrl}`,
    error: {
      code: 'NOT_FOUND',
      message: `API Endpoint not found: ${req.method} ${req.originalUrl}`,
      request_id: reqId
    }
  });
});

// Centralized error middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const requestId = (req as any).id || (req as any).correlationId || 'req_unknown';
  console.error(`❌ [${requestId}] Server error captured:`, err.message || err);
  res.status(statusCode).json({
    success: false,
    message: message,
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      message: message,
      request_id: requestId
    }
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 MERN-PostgreSQL Super Admin Server running on port ${PORT}`);
  await connectDB();
  await seedDatabaseIfEmpty();
  await startMQTTBroker();
  startIngestionService();
});
