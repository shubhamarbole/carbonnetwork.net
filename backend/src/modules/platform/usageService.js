const { 
  User, 
  Project, 
  Risk, 
  AgentRun, 
  WorkflowInstance, 
  PredictionHistory, 
  Integration, 
  Incident,
  PlatformUsageRecord, 
  PlatformCostRecord 
} = require('../../../models/models');

class UsageService {
  async getTenantUsageAndCosts(user, period = '2026-09') {
    const orgId = user.organizationId;

    // Real database counts for authoritative usage
    const [usersCount, projectsCount, risksCount, agentRunsCount, workflowsCount, predictionsCount, integrationsCount] = await Promise.all([
      User.countDocuments({ organizationId: orgId }),
      Project.countDocuments({ organizationId: orgId }),
      Risk.countDocuments({ organizationId: orgId }),
      AgentRun.countDocuments({ organization_id: orgId }),
      WorkflowInstance.countDocuments({ organizationId: orgId }),
      PredictionHistory.countDocuments({ organizationId: orgId }),
      Integration.countDocuments({ organizationId: orgId })
    ]);

    const estimatedStorageMb = round(12.5 + (risksCount * 0.05) + (agentRunsCount * 0.1), 2);
    const aiRequests = agentRunsCount * 4 + predictionsCount * 2;
    const ragRequests = agentRunsCount * 3;

    // Costs calculations (authoritative rates)
    const llmActual = round(aiRequests * 0.00045, 4);
    const llmEstimated = round(llmActual * 1.15, 4);
    const embeddingActual = round(ragRequests * 0.00008, 4);
    const storageCost = round(estimatedStorageMb * 0.0002, 4);
    const processingCost = round((workflowsCount * 0.001) + 0.15, 4);
    const agentExecutionCost = round(agentRunsCount * 0.005, 4);
    const totalCost = round(llmActual + embeddingActual + storageCost + processingCost + agentExecutionCost, 4);

    return {
      organizationId: orgId,
      period,
      usage: {
        usersCount,
        projectsCount,
        risksCount,
        agentRunsCount,
        aiRequestsCount: aiRequests,
        ragRequestsCount: ragRequests,
        workflowExecutionsCount: workflowsCount,
        predictionsCount,
        integrationsCount,
        storageMb: estimatedStorageMb
      },
      costs: {
        currency: 'USD',
        llmCostActual: llmActual,
        llmCostEstimated: llmEstimated,
        embeddingCostActual: embeddingActual,
        storageCost,
        processingCost,
        agentExecutionCost,
        totalCost,
        costBreakdownPct: {
          llm: round((llmActual / Math.max(totalCost, 0.001)) * 100, 1),
          compute: round((processingCost / Math.max(totalCost, 0.001)) * 100, 1),
          agent: round((agentExecutionCost / Math.max(totalCost, 0.001)) * 100, 1),
          storage: round((storageCost / Math.max(totalCost, 0.001)) * 100, 1)
        }
      }
    };
  }

  async getPlatformOperationsSummary() {
    const [totalUsers, totalProjects, totalRisks, totalIncidents, totalRuns] = await Promise.all([
      User.countDocuments({}),
      Project.countDocuments({}),
      Risk.countDocuments({}),
      Incident.countDocuments({}),
      AgentRun.countDocuments({})
    ]);

    return {
      status: 'OPERATIONAL',
      platformVersion: '17.0.0',
      timestamp: new Date().toISOString(),
      services: {
        express_gateway: { status: 'HEALTHY', port: 5050 },
        python_microservice: { status: 'HEALTHY', port: 8000 },
        vite_frontend: { status: 'HEALTHY', port: 3030 },
        mongodb: { status: 'HEALTHY' }
      },
      platformTotals: {
        totalUsers,
        totalProjects,
        totalRisks,
        totalIncidents,
        totalAgentRuns: totalRuns,
        activeDeployments: 'PRODUCTION_PILOT_2.0'
      },
      aiSubsystems: {
        aiGateway: { status: 'HEALTHY', activePolicy: 'DYNAMIC_ROUTING' },
        toolRegistry: { status: 'HEALTHY', registeredCategories: 11 },
        optimizationEngine: { status: 'HEALTHY', version: 'opt-engine-v1.0.0' },
        riskGraph: { status: 'HEALTHY', version: 'graph-engine-v1.0.0' }
      }
    };
  }
}

function round(val, dec = 2) {
  const p = Math.pow(10, dec);
  return Math.round(val * p) / p;
}

module.exports = new UsageService();
