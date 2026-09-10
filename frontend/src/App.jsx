import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Menu, Leaf, ShieldAlert } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { FacilityProvider } from './context/FacilityContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/api';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GHGEmissions from './pages/GHGEmissions';
import Energy from './pages/Energy';
import Water from './pages/Water';
import Waste from './pages/Waste';
import Pollution from './pages/Pollution';
import Biodiversity from './pages/Biodiversity';
import Gaps from './pages/Gaps';
import Actions from './pages/Actions';
import Assessment from './pages/Assessment';
import Targets from './pages/Targets';
import Alerts from './pages/Alerts';
import Evidence from './pages/Evidence';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import AIAssistant from './pages/AIAssistant';
import Facilities from './pages/Facilities';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PlatformAdminDashboard from './pages/PlatformAdminDashboard';
import IoTSimulator from './pages/IoTSimulator';
import Projects from './pages/Projects';
import Notifications from './pages/Notifications';
import ArchiveCenter from './pages/ArchiveCenter';
import CarbonCredits from './pages/CarbonCredits';

// 13 Specialized Role Workspaces
import MSMEWorkspace from './pages/workspaces/MSMEWorkspace';
import EnterpriseWorkspace from './pages/workspaces/EnterpriseWorkspace';
import InvestorWorkspace from './pages/workspaces/InvestorWorkspace';
import CreditBuyerWorkspace from './pages/workspaces/CreditBuyerWorkspace';
import VerifierWorkspace from './pages/workspaces/VerifierWorkspace';
import AuditorWorkspace from './pages/workspaces/AuditorWorkspace';
import RegulatorWorkspace from './pages/workspaces/RegulatorWorkspace';
import RegistryWorkspace from './pages/workspaces/RegistryWorkspace';
import AdvisorWorkspace from './pages/workspaces/AdvisorWorkspace';
import AssociationWorkspace from './pages/workspaces/AssociationWorkspace';
import TechnologyProviderWorkspace from './pages/workspaces/TechnologyProviderWorkspace';
import InsurerWorkspace from './pages/workspaces/InsurerWorkspace';
import ResearcherWorkspace from './pages/workspaces/ResearcherWorkspace';

// Core Platform Engines
import ActionCenter from './pages/ActionCenter';
import DataQualityCenter from './pages/DataQualityCenter';
import ImportExportCenter from './pages/ImportExportCenter';

// Risk Manager Phase 1 Pages
import RiskDashboard from './pages/risk/RiskDashboard';
import RiskList from './pages/risk/RiskList';
import RiskCreate from './pages/risk/RiskCreate';
import RiskDetail from './pages/risk/RiskDetail';
import RiskEdit from './pages/risk/RiskEdit';
import RiskAuditLogs from './pages/risk/RiskAuditLogs';
import RiskKnowledge from './pages/risk/RiskKnowledge';
import RiskAgentWorkspace from './pages/risk/RiskAgentWorkspace';
import RiskAgentRunDetail from './pages/risk/RiskAgentRunDetail';
import MonitoringOverview from './pages/risk/MonitoringOverview';
import MonitoringEventDetail from './pages/risk/MonitoringEventDetail';
import MonitoringRulesManager from './pages/risk/MonitoringRulesManager';
import AlertCenter from './pages/risk/AlertCenter';
import WorkflowDashboard from './pages/risk/WorkflowDashboard';
import WorkflowBuilder from './pages/risk/WorkflowBuilder';
import WorkflowInstanceDetail from './pages/risk/WorkflowInstanceDetail';
import PredictiveRiskDashboard from './pages/risk/PredictiveRiskDashboard';
import EnterpriseOperations from './pages/EnterpriseOperations';
import IntegrationsManager from './pages/risk/IntegrationsManager';
import ScenarioManager from './pages/risk/ScenarioManager';
import ScenarioDetail from './pages/risk/ScenarioDetail';
import ExecutiveRiskDashboard from './pages/risk/ExecutiveRiskDashboard';
import ExecutiveDecisionCenter from './pages/risk/ExecutiveDecisionCenter';
import ExecutiveBriefings from './pages/risk/ExecutiveBriefings';
import OnboardingWizard from './pages/risk/OnboardingWizard';
import OperationsPilotDashboard from './pages/risk/OperationsPilotDashboard';
import DecisionCenter from './pages/risk/DecisionCenter';
import RiskWorkspace from './pages/risk/RiskWorkspace';
import PlatformOperations from './pages/risk/PlatformOperations';
import CommandCenter from './pages/risk/CommandCenter';
import DeveloperPortal from './pages/developer/DeveloperPortal';

import { useAuth } from './context/AuthContext';

function MainDashboard() {
  const { roles, user } = useAuth();
  const currentRole = user?.role || (roles && roles[0]);

  switch (currentRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'PLATFORM_ADMIN':
      return <PlatformAdminDashboard />;
    case 'MSME':
    case 'MSME_USER':
      return <MSMEWorkspace />;
    case 'ENTERPRISE':
    case 'ADMIN':
    case 'ORGANIZATION_ADMIN':
      return <EnterpriseWorkspace />;
    case 'INVESTOR':
      return <InvestorWorkspace />;
    case 'CREDIT_BUYER':
      return <CreditBuyerWorkspace />;
    case 'VERIFIER':
      return <VerifierWorkspace />;
    case 'AUDITOR':
      return <AuditorWorkspace />;
    case 'REGULATOR':
      return <RegulatorWorkspace />;
    case 'REGISTRY':
      return <RegistryWorkspace />;
    case 'ADVISOR':
      return <AdvisorWorkspace />;
    case 'ASSOCIATION':
      return <AssociationWorkspace />;
    case 'TECHNOLOGY_PROVIDER':
      return <TechnologyProviderWorkspace />;
    case 'INSURER':
      return <InsurerWorkspace />;
    case 'RESEARCHER':
      return <ResearcherWorkspace />;
    default:
      return <Dashboard />;
  }
}

function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile menu when navigation route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      {/* Mobile Sticky Top Header (Hidden on lg+ desktops) */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-white flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center justify-center min-w-[44px] min-h-[44px]"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center space-x-2">
          <Leaf className="h-6 w-6 text-forest-400" />
          <div className="flex items-center">
            <span className="font-bold text-white tracking-wide text-base">Carbon</span>
            <span className="font-bold text-forest-400 text-base">ESG</span>
          </div>
        </div>

        <Link
          to="/risks/command-center"
          aria-label="Unified Enterprise Command Center"
          className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-forest-400 hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Command Center"
        >
          <ShieldAlert className="h-5 w-5" />
        </Link>
      </header>

      {/* Main Content Area - Full width on mobile/tablet, offset by 275px on lg+ desktop */}
      <div className="flex-1 w-full lg:ml-[275px] lg:w-[calc(100%-275px)] min-w-0 flex flex-col min-h-screen">
        <main className="flex-1 min-w-0">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <FacilityProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><MainDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environment" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environmental" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environment-data" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environmental-data" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environment-dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/environmental-dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/energy" element={
              <ProtectedRoute>
                <Layout><Energy /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ghg" element={
              <ProtectedRoute>
                <Layout><GHGEmissions /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/water" element={
              <ProtectedRoute>
                <Layout><Water /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/biodiversity" element={
              <ProtectedRoute>
                <Layout><Biodiversity /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/waste" element={
              <ProtectedRoute>
                <Layout><Waste /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/pollution" element={
              <ProtectedRoute>
                <Layout><Pollution /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/evidence" element={
              <ProtectedRoute>
                <Layout><Evidence /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/facilities" element={
              <ProtectedRoute>
                <Layout><Facilities /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/assessment" element={
              <ProtectedRoute>
                <Layout><Assessment /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/gaps" element={
              <ProtectedRoute>
                <Layout><Gaps /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/targets" element={
              <ProtectedRoute>
                <Layout><Targets /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/actions" element={
              <ProtectedRoute>
                <Layout><Actions /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute>
                <Layout><Alerts /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Layout><Analytics /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout><Reports /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ai-assistant" element={
              <ProtectedRoute>
                <Layout><AIAssistant /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/iot-simulator" element={
              <ProtectedRoute>
                <Layout><IoTSimulator /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Layout><Projects /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Layout><Notifications /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/archive" element={
              <ProtectedRoute>
                <Layout><ArchiveCenter /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/carbon-credits" element={
              <ProtectedRoute>
                <Layout><CarbonCredits /></Layout>
              </ProtectedRoute>
            } />

            {/* Core Platform Engines */}
            <Route path="/action-center" element={
              <ProtectedRoute>
                <Layout><ActionCenter /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/data-quality" element={
              <ProtectedRoute>
                <Layout><DataQualityCenter /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/import-export" element={
              <ProtectedRoute>
                <Layout><ImportExportCenter /></Layout>
              </ProtectedRoute>
            } />

            {/* 15 Dedicated Role Workspaces */}
            <Route path="/super-admin" element={
              <ProtectedRoute>
                <Layout><SuperAdminDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/platform-admin" element={
              <ProtectedRoute>
                <Layout><PlatformAdminDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/msme" element={
              <ProtectedRoute>
                <Layout><MSMEWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/enterprise" element={
              <ProtectedRoute>
                <Layout><EnterpriseWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/investor" element={
              <ProtectedRoute>
                <Layout><InvestorWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/credit-buyer" element={
              <ProtectedRoute>
                <Layout><CreditBuyerWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/verifier" element={
              <ProtectedRoute>
                <Layout><VerifierWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/auditor" element={
              <ProtectedRoute>
                <Layout><AuditorWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/regulator" element={
              <ProtectedRoute>
                <Layout><RegulatorWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/registry" element={
              <ProtectedRoute>
                <Layout><RegistryWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/advisor" element={
              <ProtectedRoute>
                <Layout><AdvisorWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/association" element={
              <ProtectedRoute>
                <Layout><AssociationWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/technology-provider" element={
              <ProtectedRoute>
                <Layout><TechnologyProviderWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/insurer" element={
              <ProtectedRoute>
                <Layout><InsurerWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/researcher" element={
              <ProtectedRoute>
                <Layout><ResearcherWorkspace /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 18 Unified Enterprise Command Center */}
            <Route path="/command-center" element={
              <ProtectedRoute>
                <Layout><CommandCenter /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 11 Executive Risk Center Routes */}
            <Route path="/executive-risk" element={
              <ProtectedRoute>
                <Layout><ExecutiveRiskDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/executive-risk/decisions" element={
              <ProtectedRoute>
                <Layout><ExecutiveDecisionCenter /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/executive-risk/briefings" element={
              <ProtectedRoute>
                <Layout><ExecutiveBriefings /></Layout>
              </ProtectedRoute>
            } />

            {/* Risk Manager Phase 1 Routes */}
            <Route path="/risk-manager" element={
              <ProtectedRoute>
                <Layout><RiskDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/risks" element={
              <ProtectedRoute>
                <Layout><RiskList /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/risks/new" element={
              <ProtectedRoute>
                <Layout><RiskCreate /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/risks/:id" element={
              <ProtectedRoute>
                <Layout><RiskDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/risks/:id/edit" element={
              <ProtectedRoute>
                <Layout><RiskEdit /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/audit-logs" element={
              <ProtectedRoute>
                <Layout><RiskAuditLogs /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/knowledge" element={
              <ProtectedRoute>
                <Layout><RiskKnowledge /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/agent" element={
              <ProtectedRoute>
                <Layout><RiskAgentWorkspace /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/agent/runs/:id" element={
              <ProtectedRoute>
                <Layout><RiskAgentRunDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/monitoring" element={
              <ProtectedRoute>
                <Layout><MonitoringOverview /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/monitoring/events/:id" element={
              <ProtectedRoute>
                <Layout><MonitoringEventDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/monitoring/rules" element={
              <ProtectedRoute>
                <Layout><MonitoringRulesManager /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/predictive-risk" element={
              <ProtectedRoute>
                <Layout><PredictiveRiskDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/risk-manager/predictive" element={
              <ProtectedRoute>
                <Layout><PredictiveRiskDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute>
                <Layout><AlertCenter /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/workflow-manager" element={
              <ProtectedRoute>
                <Layout><WorkflowDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/workflow-manager/builder" element={
              <ProtectedRoute>
                <Layout><WorkflowBuilder /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/workflow-manager/instances/:id" element={
              <ProtectedRoute>
                <Layout><WorkflowInstanceDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/operations" element={
              <ProtectedRoute>
                <Layout><EnterpriseOperations /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <Layout><IntegrationsManager /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/scenario-manager" element={
              <ProtectedRoute>
                <Layout><ScenarioManager /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/scenario-manager/:id" element={
              <ProtectedRoute>
                <Layout><ScenarioDetail /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 12 Production Pilot & Operations Routes */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Layout><OnboardingWizard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operations/pilot" element={
              <ProtectedRoute>
                <Layout><OperationsPilotDashboard /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 13 Advanced Decision Intelligence Route */}
            <Route path="/decision-center" element={
              <ProtectedRoute>
                <Layout><DecisionCenter /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 16 Enterprise Collaboration & Risk Graph */}
            <Route path="/risk-workspace" element={
              <ProtectedRoute>
                <Layout><RiskWorkspace /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 17 AI Platform 2.0 & Operations */}
            <Route path="/platform-operations" element={
              <ProtectedRoute>
                <Layout><PlatformOperations /></Layout>
              </ProtectedRoute>
            } />

            {/* Phase 20 Enterprise Developer API Platform */}
            <Route path="/developer" element={
              <ProtectedRoute>
                <Layout><DeveloperPortal /></Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </FacilityProvider>
      </AuthProvider>
    </Router>
    </QueryClientProvider>
  );
}
