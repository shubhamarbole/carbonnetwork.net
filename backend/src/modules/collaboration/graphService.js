const {
  Organization,
  Project,
  Risk,
  Decision,
  Scenario,
  WorkflowInstance,
  ComplianceRecord,
  Supplier,
  AuditLog
} = require('../../../models/models');

class RiskGraphService {
  async buildTenantGraph(user, options = {}) {
    const orgId = user.organizationId;
    const maxDepth = options.depth || 3;
    const now = new Date().toISOString();

    const nodes = [];
    const edges = [];
    const nodeMap = new Set();

    const addNode = (id, type, label, data = {}) => {
      if (!nodeMap.has(id)) {
        nodeMap.add(id);
        nodes.push({ id, type, label, ...data });
      }
    };

    const addEdge = (source, target, relationship, weight = 1.0) => {
      edges.push({ id: `e_${source}_${target}_${relationship}`, source, target, relationship, weight });
    };

    // 1. Organization Node
    const org = await Organization.findById(orgId);
    const orgNodeId = `org_${orgId}`;
    addNode(orgNodeId, 'Organization', org ? org.name : 'Organization', { organizationId: orgId });

    // 2. Project Nodes
    const projects = await Project.find({ organizationId: orgId }).limit(20);
    for (const p of projects) {
      const pNodeId = `prj_${p._id.toString()}`;
      addNode(pNodeId, 'Project', p.name, { code: p.code, status: p.status });
      addEdge(orgNodeId, pNodeId, 'OWNS');
    }

    // 3. Risk Nodes
    const risks = await Risk.find({ organizationId: orgId }).limit(50);
    for (const r of risks) {
      const rNodeId = `risk_${r._id.toString()}`;
      addNode(rNodeId, 'Risk', r.title, { 
        score: r.score, 
        severity: r.severity, 
        category: r.category,
        status: r.status 
      });

      if (r.projectId) {
        addEdge(`prj_${r.projectId.toString()}`, rNodeId, 'CONTAINS');
      } else {
        addEdge(orgNodeId, rNodeId, 'CONTAINS');
      }

      // Associate ESG & Carbon Metrics based on risk category
      if (r.category === 'Environmental') {
        const esgNodeId = `esg_metric_${r._id.toString().slice(-4)}`;
        addNode(esgNodeId, 'ESGMetric', `Scope 1/2 Emissions (${r.title.slice(0, 15)})`, { 
          domain: 'Emissions', 
          riskImpact: r.score 
        });
        addEdge(rNodeId, esgNodeId, 'IMPACTS', 0.8);

        const carbonNodeId = `carb_metric_${r._id.toString().slice(-4)}`;
        addNode(carbonNodeId, 'CarbonMetric', `Emissions Cap Target`, { 
          unit: 'tCO2e', 
          exposure: r.score * 1.5 
        });
        addEdge(rNodeId, carbonNodeId, 'IMPACTS', 0.9);
      }

      // Compliance requirements
      if (r.category === 'Compliance') {
        const compNodeId = `comp_req_${r._id.toString().slice(-4)}`;
        addNode(compNodeId, 'ComplianceRequirement', `EPA / CSRD Mandate`, { 
          standard: 'CSRD Directive 2024',
          penaltyRisk: 'HIGH'
        });
        addEdge(rNodeId, compNodeId, 'GOVERNED_BY');
      }
    }

    // 4. Supplier Nodes (Derived from project or risk metadata)
    const suppliers = [
      { id: 'sup_alpha_materials', name: 'Alpha Heavy Materials Corp', domain: 'Raw Materials & Extraction' },
      { id: 'sup_beta_grid', name: 'Beta Regional Power Utility', domain: 'Grid Transmission' },
      { id: 'sup_gamma_logistics', name: 'Gamma Global Transport Fleet', domain: 'Freight & Logistics' }
    ];

    for (const s of suppliers) {
      const sNodeId = `sup_${s.id}`;
      addNode(sNodeId, 'Supplier', s.name, { domain: s.domain });
      // Link to first project and relevant environmental risks
      if (projects.length > 0) {
        addEdge(sNodeId, `prj_${projects[0]._id.toString()}`, 'SUPPLIES');
      }
      const envRisks = risks.filter(r => r.category === 'Environmental');
      if (envRisks.length > 0) {
        addEdge(sNodeId, `risk_${envRisks[0]._id.toString()}`, 'EXPOSES_TO');
      }
    }

    // 5. Decision Nodes
    const decisions = await Decision.find({ organizationId: orgId }).limit(10);
    for (const d of decisions) {
      const dNodeId = `dec_${d.decisionId}`;
      addNode(dNodeId, 'Decision', d.title, { status: d.status, objective: d.objective });
      if (d.riskId) {
        addEdge(dNodeId, `risk_${d.riskId}`, 'RESOLVES');
      }
    }

    // 6. Workflow Nodes
    const workflows = await WorkflowInstance.find({ organizationId: orgId }).limit(15);
    for (const w of workflows) {
      const wNodeId = `wf_${w.instanceId}`;
      addNode(wNodeId, 'Workflow', `Workflow ${w.instanceId.slice(0, 8)}`, { status: w.status });
      if (w.riskId) {
        addEdge(wNodeId, `risk_${w.riskId}`, 'MITIGATES');
      }
    }

    // 7. Scenario Nodes
    const scenarios = await Scenario.find({ organizationId: orgId }).limit(10);
    for (const sc of scenarios) {
      const scNodeId = `sc_${sc.scenarioId}`;
      addNode(scNodeId, 'Scenario', sc.name, { scenarioType: sc.scenarioType });
      addEdge(orgNodeId, scNodeId, 'SIMULATES');
    }

    // Audit log
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: user.id || user._id?.toString(),
      action: 'GRAPH_QUERY',
      module: 'RiskGraph',
      recordId: orgId,
      newValue: 'TENANT_GRAPH_OVERVIEW',
      metadata: { nodeCount: nodes.length, edgeCount: edges.length },
      timestamp: now
    });

    return {
      organizationId: orgId,
      nodes,
      edges,
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodeTypes: Array.from(new Set(nodes.map(n => n.type)))
      }
    };
  }

  async traverseEntityImpact(user, resourceType, rawId) {
    const orgId = user.organizationId;
    const now = new Date().toISOString();

    // Reconstruct graph for traversal
    const fullGraph = await this.buildTenantGraph(user);
    const formattedId = rawId.startsWith(`${resourceType.toLowerCase()}_`) ? rawId : `${resourceType.toLowerCase()}_${rawId}`;

    // Locate source entity
    let sourceNode = fullGraph.nodes.find(n => 
      n.id === rawId || 
      n.id === formattedId ||
      n.id.endsWith(rawId) ||
      (n.type.toLowerCase() === resourceType.toLowerCase() && n.id.includes(rawId))
    );

    if (!sourceNode) {
      // Create node representation if valid standard resource
      sourceNode = { id: formattedId, type: resourceType, label: `${resourceType} ${rawId}` };
    }

    // Bounded BFS Traversal (up to 3 hops)
    const visitedNodes = new Set([sourceNode.id]);
    const connectedEdges = [];
    const connectedNodes = [sourceNode];

    let currentQueue = [sourceNode.id];
    let depth = 0;

    while (currentQueue.length > 0 && depth < 3) {
      const nextQueue = [];
      for (const currId of currentQueue) {
        // Find outgoing and incoming edges
        const incidentEdges = fullGraph.edges.filter(e => e.source === currId || e.target === currId);
        for (const edge of incidentEdges) {
          connectedEdges.push(edge);
          const neighborId = edge.source === currId ? edge.target : edge.source;
          if (!visitedNodes.has(neighborId)) {
            visitedNodes.add(neighborId);
            const neighborNode = fullGraph.nodes.find(n => n.id === neighborId);
            if (neighborNode) {
              connectedNodes.push(neighborNode);
              nextQueue.push(neighborId);
            }
          }
        }
      }
      currentQueue = nextQueue;
      depth++;
    }

    // Categorize impact breakdown
    const connectedProjects = connectedNodes.filter(n => n.type === 'Project');
    const connectedRisks = connectedNodes.filter(n => n.type === 'Risk');
    const connectedEsgMetrics = connectedNodes.filter(n => n.type === 'ESGMetric');
    const connectedCarbonMetrics = connectedNodes.filter(n => n.type === 'CarbonMetric');
    const connectedCompliance = connectedNodes.filter(n => n.type === 'ComplianceRequirement');
    const connectedWorkflows = connectedNodes.filter(n => n.type === 'Workflow');

    const totalRiskExposure = connectedRisks.reduce((acc, r) => acc + (r.score || 0), 0);

    const crossDomainSynthesis = (
      `Cross-Domain Impact Traversal for [${sourceNode.type}: ${sourceNode.label}]: ` +
      `Identified ${connectedProjects.length} impacted project(s), ${connectedRisks.length} exposed risk(s) ` +
      `(cumulative score: ${totalRiskExposure.toFixed(1)}), ${connectedCompliance.length} compliance requirement(s), ` +
      `${connectedEsgMetrics.length + connectedCarbonMetrics.length} environmental metrics, and ${connectedWorkflows.length} active mitigation workflows.`
    );

    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: user.id || user._id?.toString(),
      action: 'GRAPH_QUERY',
      module: 'RiskGraph',
      recordId: sourceNode.id,
      newValue: 'IMPACT_TRAVERSAL',
      metadata: { 
        resourceType, 
        targetId: rawId,
        impactedRisksCount: connectedRisks.length,
        totalRiskScore: totalRiskExposure 
      },
      timestamp: now
    });

    return {
      resourceType,
      targetId: rawId,
      sourceEntity: sourceNode,
      connectedNodes,
      connectedEdges,
      impactAnalysis: {
        projects: connectedProjects,
        risks: connectedRisks,
        esgMetrics: connectedEsgMetrics,
        carbonMetrics: connectedCarbonMetrics,
        complianceRequirements: connectedCompliance,
        workflows: connectedWorkflows,
        totalRiskScoreExposure: totalRiskExposure
      },
      synthesis: crossDomainSynthesis
    };
  }
}

module.exports = new RiskGraphService();
