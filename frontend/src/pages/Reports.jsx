import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Download, FileText, Printer, FileDown, RefreshCw, CheckCircle, Eye } from 'lucide-react';

export default function Reports() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState('Quarterly');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const fetchReportSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/environment/reports?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReportSummary();
  }, [token, period]);

  const handleExportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESG_Environmental_Report_${period}_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCSV = (moduleName, dataArray) => {
    if (!dataArray || dataArray.length === 0) return alert(`No ${moduleName} data to export for ${period}.`);
    const headers = Object.keys(dataArray[0]).filter(k => !['_id', '__v', 'organizationId'].includes(k));
    const csvRows = [
      headers.join(','),
      ...dataArray.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName}_Report_${period}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reportModules = [
    { id: 'summary', name: 'Consolidated ESG Sustainability Summary', desc: 'Holistic multi-module performance, data completion rate, and active mitigation targets.', dataKey: 'summary' },
    { id: 'energy', name: 'Energy Consumption & Renewable Share Report', desc: 'Electricity readings, grid vs renewable breakdowns, and energy efficiency initiatives.', dataKey: 'readings' },
    { id: 'ghg', name: 'GHG Scope 1, Scope 2 & Scope 3 Disclosures', desc: 'Emission activity logs, calculation factors, and total CO2 equivalent footprint metrics.', dataKey: 'emissions' },
    { id: 'water', name: 'Water Sourcing & Recycling Audit', desc: 'Freshwater withdrawal volumes, wastewater treatment, and recycled water flow metrics.', dataKey: 'water' },
    { id: 'waste', name: 'Waste Manifest & Circular Diversion Report', desc: 'Hazardous/non-hazardous waste streams, recycling, and landfill diversion percentages.', dataKey: 'waste' },
    { id: 'pollution', name: 'Pollution Monitoring & Incident Register', desc: 'Air, water, and soil emissions measurements versus statutory limits.', dataKey: 'pollution' }
  ];

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12 text-[11px] text-slate-700 font-sans">
      <Navbar title="Environmental Reports & Audit Disclosures" />

      <main className="max-w-5xl mx-auto px-8 pt-8 space-y-6">
        
        {/* Filter and Overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800">Export Environmental Sustainability Disclosures</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Generate auditable, regulatory-ready reports from your live organization records.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none"
            >
              <option value="Monthly">Monthly Cycle</option>
              <option value="Quarterly">Quarterly Cycle</option>
              <option value="Yearly">Yearly Cycle</option>
            </select>
            <button
              onClick={handleExportJSON}
              disabled={!reportData}
              className="bg-forest-600 hover:bg-forest-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-sm"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export Full Package (JSON)</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Highlights */}
        {reportData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Total Energy</p>
              <h4 className="text-base font-black text-slate-800 mt-1">{reportData.summary.totalEnergyKWh.toLocaleString()} kWh</h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 font-bold uppercase">GHG Footprint</p>
              <h4 className="text-base font-black text-slate-800 mt-1">{reportData.summary.totalEmissionsTCO2e} tCO2e</h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Water Withdrawn</p>
              <h4 className="text-base font-black text-slate-800 mt-1">{reportData.summary.totalWaterM3.toLocaleString()} m³</h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Waste Managed</p>
              <h4 className="text-base font-black text-slate-800 mt-1">{reportData.summary.totalWasteKg.toLocaleString()} kg</h4>
            </div>
          </div>
        )}

        {/* Module Download Cards */}
        <div className="space-y-4">
          {reportModules.map((rpt) => {
            const rawArray = reportData ? reportData[rpt.dataKey] : [];
            const count = Array.isArray(rawArray) ? rawArray.length : (reportData?.summary ? 1 : 0);

            return (
              <div key={rpt.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-forest-600" />
                    <span>{rpt.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.2 rounded-full">
                      {count} records
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 max-w-xl">{rpt.desc}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => rpt.id === 'summary' ? handleExportJSON() : handleExportCSV(rpt.id, rawArray)}
                    className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-3.5 rounded-xl text-xs transition border border-emerald-200"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs transition border border-slate-200"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
