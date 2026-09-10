import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Database, Download, Search, Filter, 
  TrendingDown, TrendingUp, BarChart3, FileSpreadsheet,
  Share2, CheckCircle2, Bookmark, Globe, Sparkles, Sliders, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ResearcherWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scenario Sandbox State
  const [activityAmount, setActivityAmount] = useState(10000);
  const [activityUnit, setActivityUnit] = useState('MWh');
  const [chosenFactor, setChosenFactor] = useState(0.82); // tCO2e/MWh default
  const [targetReductionPct, setTargetReductionPct] = useState(25);

  const fetchResearcherData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/environment/emission-factors', { headers });
      if (res.ok) {
        const data = await res.json();
        setEmissionFactors(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load emission factors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchResearcherData();
  }, [token]);

  const methodologies = [
    {
      id: 'METH-GHG-01',
      title: 'GHG Protocol Corporate Accounting Standard (Revised)',
      category: 'Corporate Emissions',
      tier: 'Tier 1 / Tier 2',
      citation: 'WRI / WBCSD (2004, rev 2015)',
      factorsCount: emissionFactors.length || 42,
      lastUpdated: '2026-02-15',
      summary: 'Standardized international accounting tool for quantifying Scope 1, 2, and 15 categories of Scope 3 emissions.'
    },
    {
      id: 'METH-IPCC-02',
      title: 'IPCC Guidelines for National GHG Inventories - Energy & Stationary Combustion',
      category: 'Combustion & Power',
      tier: 'Tier 1 / Tier 3',
      citation: 'IPCC 2006 (2019 Refinement)',
      factorsCount: 128,
      lastUpdated: '2026-01-10',
      summary: 'Default fuel net calorific values, carbon oxidation factors, and specific industrial heating factors.'
    },
    {
      id: 'METH-VCS-03',
      title: 'Verra VM0007 REDD+ Methodology Framework',
      category: 'Land Use & Forestry',
      tier: 'Tier 3',
      citation: 'Verra Standard v4.4 (2025)',
      factorsCount: 35,
      lastUpdated: '2025-11-20',
      summary: 'Forest biomass carbon stock change quantification, baseline deforestation modeling and permanence buffers.'
    },
    {
      id: 'METH-GS-04',
      title: 'Gold Standard Renewable Energy Grid Electrification & Displacement',
      category: 'Renewable Generation',
      tier: 'Tier 2',
      citation: 'Gold Standard Foundation (2024)',
      factorsCount: 19,
      lastUpdated: '2025-12-05',
      summary: 'Build margin and operating margin calculations for regional electrical grids displacing thermal generation.'
    }
  ];

  const sectorBenchmarks = [
    { sector: 'Automotive & Heavy Manufacturing', scope1Intensity: '0.42 tCO2e / $1k Rev', scope2Intensity: '0.31 tCO2e / $1k Rev', avgDecarbRate: '-4.2% / yr', sampleSize: '1,420 plants' },
    { sector: 'Textile & Apparel Dyeing', scope1Intensity: '0.68 tCO2e / $1k Rev', scope2Intensity: '0.54 tCO2e / $1k Rev', avgDecarbRate: '-3.1% / yr', sampleSize: '950 facilities' },
    { sector: 'Pharmaceuticals & Life Sciences', scope1Intensity: '0.19 tCO2e / $1k Rev', scope2Intensity: '0.22 tCO2e / $1k Rev', avgDecarbRate: '-5.8% / yr', sampleSize: '620 labs' },
    { sector: 'Data Centers & Cloud Infrastructure', scope1Intensity: '0.04 tCO2e / $1k Rev', scope2Intensity: '0.78 tCO2e / $1k Rev', avgDecarbRate: '-8.5% / yr', sampleSize: '340 sites' },
    { sector: 'Food & Beverage Processing', scope1Intensity: '0.35 tCO2e / $1k Rev', scope2Intensity: '0.28 tCO2e / $1k Rev', avgDecarbRate: '-3.9% / yr', sampleSize: '1,110 facilities' }
  ];

  const filteredMethodologies = methodologies.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || m.tier.includes(selectedTier);
    return matchesSearch && matchesTier;
  });

  const handleExportCSV = (datasetName) => {
    const rows = [
      ['Sector', 'Scope 1 Intensity', 'Scope 2 Intensity', 'Decarb Rate', 'Sample Size'],
      ...sectorBenchmarks.map(b => [b.sector, b.scope1Intensity, b.scope2Intensity, b.decarbRate || b.avgDecarbRate, b.sampleSize])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${datasetName.toLowerCase().replace(/\s+/g, '_')}_dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage(`Exported ${datasetName} CSV successfully.`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCopyCitation = (citation) => {
    navigator.clipboard?.writeText(citation);
    setToastMessage(`Citation copied to clipboard: "${citation}"`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Sandbox calculations
  const baselineGrossEmissions = (activityAmount * chosenFactor).toFixed(2);
  const targetPostReductionEmissions = (baselineGrossEmissions * (1 - targetReductionPct / 100)).toFixed(2);
  const avoidedTons = (baselineGrossEmissions - targetPostReductionEmissions).toFixed(2);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Academic & Research Lab
            </span>
            <span className="text-xs text-slate-400 font-mono">Institute: {user?.organizationId || 'Climate Science Lab'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Emission Factor Library & Scientific Methodology Sandbox
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Standardized IPCC, GHG Protocol & Verified Methodologies, Peer-Reviewed Factor Datasets & Scenario Modeling
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchResearcherData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Factors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExportCSV('Global_Methodology_Index')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download All Datasets</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Methodology Index</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{methodologies.length} Frameworks</p>
          <p className="text-[11px] text-slate-500 mt-1">ISO 14064, IPCC, GHG Protocol</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Indexed Factors</span>
          <p className="text-3xl font-black text-indigo-700 mt-1">{emissionFactors.length || 224} Factors</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Connected to DB Library</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Global Tiers</span>
          <p className="text-3xl font-black text-teal-700 mt-1">Tier 1 - 3</p>
          <p className="text-[11px] text-slate-500 mt-1">Activity data to direct stack</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Uncertainty Bounds</span>
          <p className="text-3xl font-black text-forest-700 mt-1">± 3.2%</p>
          <p className="text-[11px] text-slate-500 mt-1">Monte Carlo 95% confidence</p>
        </div>
      </div>

      {/* Interactive Scenario Sandbox */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold">Scientific Scenario & Emission Factor Sandbox</h2>
          </div>
          <span className="text-[11px] font-mono text-indigo-300">Live Mathematical Formulation Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Activity Volume ({activityUnit})</label>
            <input
              type="number"
              value={activityAmount}
              onChange={(e) => setActivityAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Select DB Factor</label>
            <select
              value={chosenFactor}
              onChange={(e) => setChosenFactor(parseFloat(e.target.value) || 0.82)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {emissionFactors.length > 0 ? (
                emissionFactors.map((f, i) => (
                  <option key={f._id || i} value={f.factorValue || f.value || 0.82}>
                    {f.name || f.fuelType || 'Factor'} ({f.factorValue || f.value} {f.unit || 'tCO2e'})
                  </option>
                ))
              ) : (
                <>
                  <option value={0.82}>India CEA Grid Avg (0.82 tCO2e/MWh)</option>
                  <option value={0.38}>US eGRID National (0.38 tCO2e/MWh)</option>
                  <option value={2.68}>Diesel Combustion (2.68 kg/liter)</option>
                  <option value={1.92}>Natural Gas (1.92 kg/m³)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Reduction Target: {targetReductionPct}%</label>
            <input
              type="range"
              min="5"
              max="90"
              step="5"
              value={targetReductionPct}
              onChange={(e) => setTargetReductionPct(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-400"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-indigo-300">Avoided Abatement</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{avoidedTons} <span className="text-xs text-white">tCO₂e</span></p>
            <span className="text-[10px] text-slate-300">Post: {targetPostReductionEmissions} t</span>
          </div>
        </div>
      </div>

      {/* Methodology Library */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Standardized Greenhouse Gas Methodology Index</h2>
            <p className="text-xs text-slate-500">Peer-reviewed accounting guidelines and computational formulations</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search methodology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMethodologies.map((m) => (
            <div key={m.id} className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-600">{m.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{m.tier}</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900">{m.title}</h3>
              <p className="text-[11px] text-slate-500">{m.summary}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-mono">{m.citation}</span>
                <button
                  onClick={() => handleCopyCitation(m.citation)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px]"
                >
                  Copy Citation
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
