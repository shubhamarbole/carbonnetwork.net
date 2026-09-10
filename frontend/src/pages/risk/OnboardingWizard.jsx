import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FolderPlus,
  Database,
  Sliders,
  Radio,
  Cpu,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const STEPS_CONFIG = [
  { step: 1, title: 'Organization Profile & Tier', icon: Building2, desc: 'Configure company legal identity and tenant capacity tier.' },
  { step: 2, title: 'Admin & Role Provisioning', icon: Users, desc: 'Assign primary administrator credentials and RBAC personas.' },
  { step: 3, title: 'Project Scope & Baseline', icon: FolderPlus, desc: 'Register initial carbon decarbonization project and emission baseline.' },
  { step: 4, title: 'ESG & Carbon Data Sources', icon: Database, desc: 'Connect IoT telemetry, ERP connectors, and registry APIs.' },
  { step: 5, title: 'Risk Categories & Scoring', icon: Sliders, desc: 'Calibrate risk categories, thresholds, and severity weightings.' },
  { step: 6, title: 'Monitoring & Event Rules', icon: Radio, desc: 'Setup automated telemetry anomaly detection rules and schedules.' },
  { step: 7, title: 'AI Agent & Predictive Limits', icon: Cpu, desc: 'Configure token budgets, daily agent quotas, and predictive horizons.' },
  { step: 8, title: 'Workflow & HITL Signoffs', icon: CheckSquare, desc: 'Define human-in-the-loop approval gates for autonomous actions.' },
  { step: 9, title: 'Verification & Activation', icon: ShieldCheck, desc: 'Run final enterprise readiness audit and launch production pilot.' }
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboardingState, setOnboardingState] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State across the 9 steps
  const [formData, setFormData] = useState({
    // Step 1
    orgName: 'Pilot EcoManufacturing Corp',
    orgTier: 'ENTERPRISE_PILOT',
    industry: 'Manufacturing & CleanTech',
    country: 'Germany / EU',
    // Step 2
    primaryAdminEmail: 'uat.orgadmin@pilot-ecomfg.internal',
    rbacMode: 'FINE_GRAINED_9_PERSONAS',
    sessionTimeoutMins: 60,
    // Step 3
    projectName: 'Pilot Industrial Decarbonization Unit 4',
    methodology: 'VM0007',
    baselineEmissionsTons: 120000,
    reductionTargetPercent: 25,
    // Step 4
    iotProvider: 'MQTT_BROKER',
    erpConnector: 'SAP_S4HANA',
    registryApi: 'VERRA_VCS',
    // Step 5
    probabilityWeight: 0.40,
    impactWeight: 0.30,
    exposureWeight: 0.15,
    urgencyWeight: 0.15,
    criticalScoreThreshold: 75.0,
    // Step 6
    telemetryPollingIntervalSec: 60,
    autoCreateAlertsOnCritical: true,
    anomalySensitivity: 'HIGH',
    // Step 7
    maxTokensPerRequest: 8192,
    maxAgentStepsPerRun: 15,
    maxAgentRunsDaily: 50,
    predictiveHorizonDays: 90,
    // Step 8
    requireHITLForCriticalActions: true,
    dualApproverRequired: false,
    escalationTimeoutHours: 4,
    // Step 9
    agreeCompliance: true
  });

  const fetchState = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pilot/onboarding', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setOnboardingState(data.state);
          setCurrentStep(data.state.currentStep || 1);
        }
      }
    } catch (err) {
      console.warn('Failed to load existing onboarding state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveCurrentStep = async (advance = false) => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const stepPayload = {
        stepNumber: currentStep,
        stepData: formData
      };

      const res = await fetch('/api/pilot/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stepPayload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save step');
      }

      const updated = await res.json();
      setOnboardingState(updated.state);
      setSuccessMsg(`Step ${currentStep} successfully recorded.`);

      if (advance && currentStep < 9) {
        setCurrentStep(prev => prev + 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteActivation = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pilot/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Activation failed');
      }

      setSuccessMsg('🎉 Organization Onboarding Verified & Pilot Operations Activated!');
      setTimeout(() => {
        navigate('/operations/pilot');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const completedStepsCount = onboardingState?.steps?.filter(s => s.status === 'COMPLETED').length || 0;
  const progressPercent = Math.round((completedStepsCount / 9) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              Phase 12 Production Pilot & Productization
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Enterprise Organization Onboarding Wizard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              9-stage non-destructive provisioning for isolated tenant intelligence, governance, and autonomous risk management.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/operations/pilot')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
            >
              Skip to Pilot Operations
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-300">
              Onboarding Progress: {completedStepsCount} of 9 Steps Completed
            </span>
            <span className="text-emerald-400 font-mono font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps Breadcrumb Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-2">
            {STEPS_CONFIG.map(stepMeta => {
              const isCurrent = stepMeta.step === currentStep;
              const isDone = onboardingState?.steps?.find(s => s.stepNumber === stepMeta.step)?.status === 'COMPLETED';
              const StepIcon = stepMeta.icon;

              return (
                <button
                  key={stepMeta.step}
                  onClick={() => setCurrentStep(stepMeta.step)}
                  className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 shadow-sm'
                      : isDone
                      ? 'bg-slate-800/60 border border-emerald-500/20 text-emerald-300 hover:bg-slate-800'
                      : 'bg-slate-900/40 border border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div className="relative mb-1">
                    <StepIcon className="w-5 h-5" />
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold">Step {stepMeta.step}</span>
                  <span className="text-[11px] truncate w-full font-medium">{stepMeta.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active Step Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Step {currentStep} of 9
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              {STEPS_CONFIG[currentStep - 1].title}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {STEPS_CONFIG[currentStep - 1].desc}
            </p>
          </div>

          {/* Form switch based on currentStep */}
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Organization Legal Name</label>
                  <input
                    type="text"
                    value={formData.orgName}
                    onChange={e => handleInputChange('orgName', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Tenant Tier</label>
                  <select
                    value={formData.orgTier}
                    onChange={e => handleInputChange('orgTier', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ENTERPRISE_PILOT">Enterprise Pilot (Isolated VPC)</option>
                    <option value="PRODUCTION_STANDARD">Production Standard</option>
                    <option value="GLOBAL_CONGLOMERATE">Global Conglomerate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Industry Sector</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={e => handleInputChange('industry', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Primary Jurisdiction</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => handleInputChange('country', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Primary Admin Email</label>
                  <input
                    type="email"
                    value={formData.primaryAdminEmail}
                    onChange={e => handleInputChange('primaryAdminEmail', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">RBAC Architecture</label>
                  <select
                    value={formData.rbacMode}
                    onChange={e => handleInputChange('rbacMode', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="FINE_GRAINED_9_PERSONAS">9-Persona Enterprise Matrix (Recommended)</option>
                    <option value="STANDARD_3_TIER">Standard 3-Tier (Admin, Manager, Viewer)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Session Inactivity Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={formData.sessionTimeoutMins}
                    onChange={e => handleInputChange('sessionTimeoutMins', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Pilot Project Title</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={e => handleInputChange('projectName', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Carbon Credit Methodology</label>
                  <select
                    value={formData.methodology}
                    onChange={e => handleInputChange('methodology', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="VM0007">VM0007 - REDD+ Methodology Framework</option>
                    <option value="ACM0002">ACM0002 - Grid-Connected Electricity Generation</option>
                    <option value="VM0042">VM0042 - Improved Agricultural Land Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Baseline Annual Emissions (tCO2e)</label>
                  <input
                    type="number"
                    value={formData.baselineEmissionsTons}
                    onChange={e => handleInputChange('baselineEmissionsTons', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Target Reduction (%)</label>
                  <input
                    type="number"
                    value={formData.reductionTargetPercent}
                    onChange={e => handleInputChange('reductionTargetPercent', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Telemetry Broker</label>
                  <select
                    value={formData.iotProvider}
                    onChange={e => handleInputChange('iotProvider', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="MQTT_BROKER">Embedded Aedes MQTT (Port 1883)</option>
                    <option value="AWS_IOT">AWS IoT Core Broker</option>
                    <option value="AZURE_IOT">Azure IoT Hub Connector</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Enterprise ERP Connector</label>
                  <select
                    value={formData.erpConnector}
                    onChange={e => handleInputChange('erpConnector', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="SAP_S4HANA">SAP S/4HANA Sustainability</option>
                    <option value="ORACLE_FUSION">Oracle Fusion Cloud ESG</option>
                    <option value="REST_GENERIC">Generic REST API Ingestion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Registry Invalidation Feed</label>
                  <select
                    value={formData.registryApi}
                    onChange={e => handleInputChange('registryApi', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="VERRA_VCS">Verra Registry VCS Feed</option>
                    <option value="GOLD_STANDARD">Gold Standard Impact Registry</option>
                    <option value="PURO_EARTH">Puro.earth CORC Registry</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                  <span className="text-emerald-400 font-semibold font-mono">Formula Parity:</span> Risk Score = 0.40 × Probability + 0.30 × Impact + 0.15 × Exposure + 0.15 × Urgency. Calibrate thresholds below.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Critical Severity Score Threshold</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.criticalScoreThreshold}
                      onChange={e => handleInputChange('criticalScoreThreshold', parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Primary Risk Focus</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                      <option>Industrial Decarbonization & Scope 1/2</option>
                      <option>EU CBAM & Carbon Border Adjustment</option>
                      <option>Voluntary Carbon Registry Diligence</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Sensor Polling Cadence (Seconds)</label>
                  <input
                    type="number"
                    value={formData.telemetryPollingIntervalSec}
                    onChange={e => handleInputChange('telemetryPollingIntervalSec', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Anomaly Detection Sensitivity</label>
                  <select
                    value={formData.anomalySensitivity}
                    onChange={e => handleInputChange('anomalySensitivity', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="HIGH">High (Trigger on &gt; 1.5 standard deviations)</option>
                    <option value="BALANCED">Balanced (Trigger on &gt; 2.0 standard deviations)</option>
                    <option value="CONSERVATIVE">Conservative (Trigger on &gt; 3.0 standard deviations)</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Max Tokens Per Request</label>
                  <input
                    type="number"
                    value={formData.maxTokensPerRequest}
                    onChange={e => handleInputChange('maxTokensPerRequest', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Max Agent Steps Per Run</label>
                  <input
                    type="number"
                    value={formData.maxAgentStepsPerRun}
                    onChange={e => handleInputChange('maxAgentStepsPerRun', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Daily Quota (Runs / Day)</label>
                  <input
                    type="number"
                    value={formData.maxAgentRunsDaily}
                    onChange={e => handleInputChange('maxAgentRunsDaily', parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="hitl"
                    checked={formData.requireHITLForCriticalActions}
                    onChange={e => handleInputChange('requireHITLForCriticalActions', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="hitl" className="text-sm font-medium text-slate-200 cursor-pointer">
                    Mandate Human-in-the-Loop (HITL) approval before any write-action or mitigation workflow execution.
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Escalation Timeout (Hours)</label>
                    <input
                      type="number"
                      value={formData.escalationTimeoutHours}
                      onChange={e => handleInputChange('escalationTimeoutHours', parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Signoff Persona Role</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                      <option>ORGANIZATION_ADMIN</option>
                      <option>EXECUTIVE</option>
                      <option>ESG_MANAGER</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Pre-Flight Activation Health Checklist
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> Multi-Tenant Boundary Isolated
                    </div>
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> 9-Persona RBAC Roles Provisioned
                    </div>
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> AI Resource Quota Budget Assigned
                    </div>
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> Deterministic Risk Scoring Formula Verified
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="complianceAgree"
                    checked={formData.agreeCompliance}
                    onChange={e => handleInputChange('agreeCompliance', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="complianceAgree" className="text-xs text-slate-300 cursor-pointer">
                    I verify that all organization configuration parameters comply with CarbonCredit.Network Phase 12 production standards.
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              type="button"
              disabled={currentStep === 1 || saving}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 rounded-lg text-sm bg-slate-850 hover:bg-slate-800 text-slate-300 disabled:opacity-40 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveCurrentStep(false)}
                className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Progress
              </button>

              {currentStep < 9 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveCurrentStep(true)}
                  className="px-5 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-emerald-950 transition"
                >
                  Save & Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || !formData.agreeCompliance}
                  onClick={handleCompleteActivation}
                  className="px-6 py-2 rounded-lg text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-emerald-900 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Complete & Launch Pilot
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
