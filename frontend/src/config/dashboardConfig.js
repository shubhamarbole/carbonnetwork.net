export const dashboardConfig = {
  SUPER_ADMIN: {
    title: "SaaS Platform Control Panel",
    widgets: [
      "totalOrganizations",
      "activeOrganizations",
      "totalUsers",
      "environmentalRecords",
      "pendingVerification",
      "verifiedRecords",
      "rejectedRecords",
      "reportsGenerated",
      "systemAlerts",
      "systemHealth"
    ]
  },
  PLATFORM_ADMIN: {
    title: "Operations Command Center",
    widgets: [
      "pendingApprovals",
      "pendingSubmissions",
      "dataQuality",
      "verificationWorkload",
      "environmentalAlerts",
      "supportActivity"
    ]
  },
  MSME_USER: {
    title: "MSME Environmental Scorecard",
    widgets: [
      "environmentalScore",
      "energyStatus",
      "ghgStatus",
      "waterStatus",
      "wasteStatus",
      "pollutionStatus",
      "biodiversityStatus",
      "missingData",
      "evidenceCompletion",
      "targets",
      "recommendedActions"
    ]
  },
  ENTERPRISE_USER: {
    title: "Enterprise ESG Analytics Group Dashboard",
    widgets: [
      "consolidatedKPIs",
      "multiFacilityOverview",
      "facilityRanking",
      "environmentalTrends",
      "targets",
      "risks",
      "missingData"
    ]
  },
  INVESTOR: {
    title: "Portfolio ESG Risk & Investment Dashboard",
    widgets: [
      "portfolioScore",
      "highRiskOrgs",
      "ghgTrends",
      "riskDistribution",
      "watchlist"
    ]
  },
  CREDIT_BUYER: {
    title: "Carbon Offset Marketplace Dashboard",
    widgets: [
      "availableProjects",
      "availableCredits",
      "purchaseRequests",
      "watchlist",
      "environmentalImpact"
    ]
  },
  VERIFIER: {
    title: "Assigned Audit Review Workspace",
    widgets: [
      "pendingReviews",
      "underReview",
      "verifiedCount",
      "rejectedCount",
      "missingEvidence",
      "overdueReviews"
    ]
  },
  ASSURANCE_AUDITOR: {
    title: "Independent ESG Assurance Framework",
    widgets: [
      "openAudits",
      "auditFindings",
      "evidenceIssues",
      "highRiskFindings",
      "overdueResponses"
    ]
  },
  REGULATOR: {
    title: "Jurisdictional Compliance Review Panel",
    widgets: [
      "monitoredOrgs",
      "environmentalAlerts",
      "highRiskEntities",
      "pollutionTrends",
      "ghgTrends",
      "waterRisks"
    ]
  },
  CARBON_REGISTRY: {
    title: "Voluntary Carbon Credits Registry Ledger",
    widgets: [
      "projectsRegistry",
      "pendingRegistrations",
      "verifiedProjects",
      "registryStatus",
      "creditRecords"
    ]
  },
  ADVISOR: {
    title: "ESG Strategic Client Advisory Hub",
    widgets: [
      "clientList",
      "environmentalGaps",
      "riskSummary",
      "targetsAtRisk",
      "recommendations",
      "actionProgress"
    ]
  },
  INDUSTRY_ASSOCIATION: {
    title: "Anonymized Industry Benchmarks Dashboard",
    widgets: [
      "industryAverages",
      "benchmarks",
      "memberTrends",
      "anonymousComparisons"
    ]
  },
  TECHNOLOGY_PROVIDER: {
    title: "IoT smart Meter Data Telemetry Panel",
    widgets: [
      "devices",
      "meters",
      "connections",
      "dataStreams",
      "syncStatus",
      "syncErrors",
      "apiStatus"
    ]
  },
  INSURER: {
    title: "Environmental Liability Risk Assessment Tool",
    widgets: [
      "riskDistribution",
      "highRiskOrgs",
      "incidents",
      "riskTrends"
    ]
  },
  RESEARCHER: {
    title: "Academic Environmental Data Trends Analyzer",
    widgets: [
      "authorizedDatasets",
      "trendAnalysis",
      "savedQueries"
    ]
  }
};
