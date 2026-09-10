const { IndustryTemplate, AuditLog } = require('../../../models/models');

const SYSTEM_TEMPLATES = [
  {
    templateId: 'tmpl_manufacturing',
    industry: 'MANUFACTURING',
    name: 'Heavy & Discrete Manufacturing ESG Framework',
    description: 'Specialized risk models and KPI tracking for factory emissions, effluent discharge, hazardous materials, and supply chain continuity.',
    riskCategories: ['Environmental', 'Operational', 'Compliance', 'Supply Chain', 'Occupational Safety'],
    monitoringRules: [
      { name: 'Effluent pH Fluctuation Breach', threshold: 8.5, action: 'TRIGGER_AI_AGENT' },
      { name: 'Scope 1 Boilers Surge (+25%)', threshold: 25.0, action: 'CREATE_ALERT' }
    ],
    workflowTemplates: [
      { name: 'Industrial Spill Containment & Remediation', stepsCount: 4 }
    ],
    esgKpis: [
      { code: 'SCOPE1_EMISSIONS', unit: 'tCO2e', target: 500.0 },
      { code: 'WATER_RECYCLING_RATE', unit: '%', target: 85.0 }
    ],
    scenarioTemplates: [
      { name: 'Grid Blackout & Backup Diesel Carbon Spike (+40%)', type: 'EMISSIONS_SURGE' }
    ],
    dashboardLayout: { defaultView: 'OPERATIONS', highlightDomain: 'EMISSIONS' },
    isSystem: true
  },
  {
    templateId: 'tmpl_energy',
    industry: 'ENERGY',
    name: 'Power Generation & Renewable Utilities Template',
    description: 'Transmission grid reliability, SF6 dielectric gas leaks, carbon credit portfolio yields, and Clean Air Act compliance.',
    riskCategories: ['Environmental', 'Regulatory', 'Grid Reliability', 'Carbon Yield'],
    monitoringRules: [
      { name: 'SF6 Leak Rate Threshold', threshold: 0.05, action: 'TRIGGER_AI_AGENT' },
      { name: 'Curtailment Loss Anomaly', threshold: 15.0, action: 'CREATE_ALERT' }
    ],
    workflowTemplates: [
      { name: 'Dielectric Fluid Recovery Protocol', stepsCount: 3 }
    ],
    esgKpis: [
      { code: 'RENEWABLE_SHARE', unit: '%', target: 70.0 },
      { code: 'GRID_CARBON_INTENSITY', unit: 'gCO2/kWh', target: 120.0 }
    ],
    scenarioTemplates: [
      { name: 'Severe Weather Renewable Asset Curtailment', type: 'PHYSICAL_ASSET_IMPACT' }
    ],
    dashboardLayout: { defaultView: 'CARBON', highlightDomain: 'GRID' },
    isSystem: true
  },
  {
    templateId: 'tmpl_logistics',
    industry: 'LOGISTICS',
    name: 'Global Freight & Fleet Supply Chain Template',
    description: 'Fleet fuel consumption, maritime emissions, CBAM border tariffs, and transport corridor disruptions.',
    riskCategories: ['Carbon Footprint', 'Supply Chain', 'Regulatory', 'Fuel Volatility'],
    monitoringRules: [
      { name: 'Corridor Diesel Efficiency Dip', threshold: 12.0, action: 'CREATE_ALERT' }
    ],
    workflowTemplates: [
      { name: 'Modal Shift to Rail Diversification', stepsCount: 3 }
    ],
    esgKpis: [
      { code: 'FLEET_EMISSION_INTENSITY', unit: 'gCO2/ton-km', target: 45.0 }
    ],
    scenarioTemplates: [
      { name: 'EU CBAM Tariff Surge (€100/tCO2e)', type: 'CARBON_TAX_SHOCK' }
    ],
    dashboardLayout: { defaultView: 'SUPPLY_CHAIN', highlightDomain: 'CORRIDORS' },
    isSystem: true
  },
  {
    templateId: 'tmpl_construction',
    industry: 'CONSTRUCTION',
    name: 'Infrastructure & Green Building Template',
    description: 'Embodied carbon in concrete/steel, dust and noise pollution, LEED certification compliance.',
    riskCategories: ['Embodied Carbon', 'Pollution', 'Permitting Compliance', 'Resource Waste'],
    monitoringRules: [],
    workflowTemplates: [],
    esgKpis: [],
    scenarioTemplates: [],
    dashboardLayout: {},
    isSystem: true
  },
  {
    templateId: 'tmpl_technology',
    industry: 'TECHNOLOGY',
    name: 'Datacenter & Hardware Cloud Operations Template',
    description: 'PUE energy efficiency, cloud carbon footprint, e-waste lifecycle management.',
    riskCategories: ['Data Center PUE', 'E-Waste', 'Energy Efficiency', 'Vendor ESG'],
    monitoringRules: [],
    workflowTemplates: [],
    esgKpis: [],
    scenarioTemplates: [],
    dashboardLayout: {},
    isSystem: true
  },
  {
    templateId: 'tmpl_finance',
    industry: 'FINANCE',
    name: 'Sustainable Banking & Portfolio Risk Template',
    description: 'Financed emissions (Scope 3 Category 15), green bond taxonomy, climate stress testing.',
    riskCategories: ['Financed Emissions', 'Climate Transition', 'Greenwashing Risk', 'TCFD Compliance'],
    monitoringRules: [],
    workflowTemplates: [],
    esgKpis: [],
    scenarioTemplates: [],
    dashboardLayout: {},
    isSystem: true
  },
  {
    templateId: 'tmpl_msme',
    industry: 'MSME',
    name: 'Small & Medium Enterprise Lightweight ESG Framework',
    description: 'Streamlined sustainability compliance, tier-1 supplier questionnaires, simplified GHG audits.',
    riskCategories: ['Energy Cost', 'Supplier Mandates', 'Basic Compliance'],
    monitoringRules: [],
    workflowTemplates: [],
    esgKpis: [],
    scenarioTemplates: [],
    dashboardLayout: {},
    isSystem: true
  },
  {
    templateId: 'tmpl_general',
    industry: 'GENERAL_ESG',
    name: 'Universal Corporate Sustainability & TCFD Framework',
    description: 'Standard multi-domain corporate ESG risk management aligning with GRI, CSRD, and SEC climate rules.',
    riskCategories: ['Environmental', 'Social', 'Governance', 'Compliance', 'Operational'],
    monitoringRules: [],
    workflowTemplates: [],
    esgKpis: [],
    scenarioTemplates: [],
    dashboardLayout: {},
    isSystem: true
  }
];

class IndustryTemplateService {
  async initTemplates() {
    for (const t of SYSTEM_TEMPLATES) {
      await IndustryTemplate.updateOne(
        { industry: t.industry },
        { $setOnInsert: { ...t, createdAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
  }

  async listTemplates() {
    await this.initTemplates();
    return await IndustryTemplate.find({}).sort({ name: 1 });
  }

  async getTemplate(industry) {
    await this.initTemplates();
    const indUpper = (industry || '').toUpperCase();
    const t = await IndustryTemplate.findOne({ industry: indUpper });
    if (!t) {
      const err = new Error(`Industry template '${industry}' not found`);
      err.status = 404;
      throw err;
    }
    return t;
  }

  async applyTemplate(user, industry) {
    const template = await this.getTemplate(industry);
    const now = new Date().toISOString();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name || 'Admin',
      userId: user.id || user._id?.toString(),
      action: 'PLATFORM_CONFIGURATION_CHANGED',
      module: 'IndustryTemplates',
      recordId: template.templateId,
      newValue: `APPLIED_${template.industry}`,
      metadata: { 
        industry: template.industry,
        categoriesCount: template.riskCategories.length,
        monitoringRulesCount: template.monitoringRules.length
      },
      timestamp: now
    });

    return {
      success: true,
      appliedIndustry: template.industry,
      templateName: template.name,
      configuredCategories: template.riskCategories,
      activeMonitoringRules: template.monitoringRules.length,
      appliedAt: now
    };
  }
}

module.exports = new IndustryTemplateService();
