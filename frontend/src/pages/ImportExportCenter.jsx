import React, { useState } from 'react';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, 
  ArrowRight, RefreshCw, FileText, Check, Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ImportExportCenter() {
  const { token } = useAuth();
  const [selectedModule, setSelectedModule] = useState('Energy');
  const [file, setFile] = useState(null);
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [rawText, setRawText] = useState('');

  // Sample CSV generator for testing
  const sampleCSV = `Meter ID,Date,Reading,Unit,Source
MTR-101,2026-09-01,1450.5,kWh,GRID
MTR-102,2026-09-01,2890.0,kWh,SOLAR
MTR-103,2026-09-02,-50.0,kWh,GRID
MTR-104,2026-09-02,3120.0,kWh,GRID
MTR-105,,1800.0,kWh,WIND`;

  const handleUseSample = () => {
    setRawText(sampleCSV);
  };

  const handleFileChange = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawText(event.target.result);
      };
      reader.readAsText(uploaded);
    }
  };

  const parseCSVToRows = (csv) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      return row;
    });
  };

  const handleValidatePreview = async () => {
    if (!rawText.trim()) return;
    setValidating(true);
    try {
      const rows = parseCSVToRows(rawText);
      const res = await fetch('/api/import-export/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ module: selectedModule, rows })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPreviewData(json.data);
        setImportStep(2);
      }
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleCommitValid = async () => {
    if (!previewData || !previewData.validRows) return;
    setCommitting(true);
    try {
      const res = await fetch('/api/import-export/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ module: selectedModule, validRows: previewData.validRows })
      });
      const json = await res.json();
      if (json.success) {
        setCommitResult(json);
        setImportStep(3);
      }
    } catch (err) {
      console.error('Commit failed:', err);
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sample_${selectedModule}_Import.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Import / Export Center</h1>
              <p className="text-xs text-slate-500 font-medium">
                Production CSV/Excel Data Ingestion Pipeline & Validated Database Commitment
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Import Wizard */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  importStep >= 1 ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>1</span>
                <span className="text-xs font-bold text-slate-700">Upload Data</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
              <div className="flex items-center space-x-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  importStep >= 2 ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>2</span>
                <span className="text-xs font-bold text-slate-700">Validate & Preview</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
              <div className="flex items-center space-x-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  importStep === 3 ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>3</span>
                <span className="text-xs font-bold text-slate-700">Database Commit</span>
              </div>
            </div>

            {/* Step 1: Upload / Input */}
            {importStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target ESG Module</label>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-forest-500"
                    >
                      <option value="Energy">Energy (Electricity Meters & Readings)</option>
                      <option value="GHG">Greenhouse Gas Activity Data</option>
                      <option value="Water">Water Consumption Meters</option>
                      <option value="Waste">Waste Diversion Manifests</option>
                    </select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={handleDownloadSample}
                      className="px-3 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition w-full"
                    >
                      Download Sample Template
                    </button>
                    <button
                      onClick={handleUseSample}
                      className="px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition whitespace-nowrap"
                    >
                      Paste Sample Data
                    </button>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100 cursor-pointer"
                  />
                </div>

                {/* Raw CSV Text Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CSV Data Input</label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste CSV rows here..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500"
                  />
                </div>

                <button
                  onClick={handleValidatePreview}
                  disabled={validating || !rawText.trim()}
                  className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {validating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Validating Rows against ESG Schema...</span>
                    </>
                  ) : (
                    <>
                      <span>Validate & Preview Rows</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Validation Results & Error Table */}
            {importStep === 2 && previewData && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Detected</span>
                    <p className="text-xl font-black text-slate-900">{previewData.totalRowsDetected}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Valid Rows</span>
                    <p className="text-xl font-black text-emerald-600">{previewData.validCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-red-600 uppercase">Errors Detected</span>
                    <p className="text-xl font-black text-red-600">{previewData.errorCount}</p>
                  </div>
                </div>

                {/* Error Table if Any */}
                {previewData.errorRows?.length > 0 && (
                  <div className="border border-red-200 bg-red-50/30 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-red-700 font-bold text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Syntax / Value Errors (Will be Skipped on Commit)</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {previewData.errorRows.map((err, idx) => (
                        <div key={idx} className="text-[11px] text-red-800 bg-white/80 p-2 rounded-lg border border-red-100 flex items-start justify-between">
                          <span>Row #{err.row}: {err.errors.join(', ')}</span>
                          <span className="font-mono text-[9px] text-slate-400">{JSON.stringify(err.data)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Rows Preview */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                    Previewing {previewData.validCount} Valid Records Ready to Commit
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
                    {previewData.validRows.map((r, idx) => (
                      <div key={idx} className="px-4 py-2 flex items-center justify-between">
                        <span>Meter: {r.meterNumber || r['Meter ID'] || 'MTR'}</span>
                        <span>Date: {r.readingDate}</span>
                        <span className="font-bold text-forest-700">{r.consumption} {r.unit || 'kWh'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setImportStep(1)}
                    className="w-1/3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleCommitValid}
                    disabled={committing || previewData.validCount === 0}
                    className="w-2/3 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {committing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Import {previewData.validCount} Valid Records into MongoDB</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Confirmation */}
            {importStep === 3 && commitResult && (
              <div className="text-center py-8 space-y-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-block">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Database Commit Completed</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {commitResult.message} Records are now live and visible in your Environmental Overview, Energy, and Analytics dashboards.
                </p>
                <button
                  onClick={() => {
                    setImportStep(1);
                    setRawText('');
                    setPreviewData(null);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Import Another Batch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Instant Data Exports */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-forest-600" />
              <h2 className="text-sm font-bold text-slate-900">Export ESG Data</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate audit-grade datasets in CSV, Excel, and structured JSON format based on your active organization permissions.
            </p>

            <div className="space-y-2 pt-2">
              {[
                { title: 'Energy & Electricity Telemetry', desc: 'Active meters & consumption history', endpoint: '/api/environment/readings' },
                { title: 'GHG Scope 1, 2, 3 Emissions', desc: 'Activity data with emission factor lineage', endpoint: '/api/ghg' },
                { title: 'Water & Effluent Measurements', desc: 'Withdrawal, recycling & discharge', endpoint: '/api/environment/water' },
                { title: 'Full BRSR / GRI Compliance Pack', desc: 'Consolidated multi-module report', endpoint: '/api/reports' }
              ].map((exp, idx) => (
                <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{exp.title}</p>
                    <p className="text-[10px] text-slate-400">{exp.desc}</p>
                  </div>
                  <a
                    href={exp.endpoint}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white text-forest-700 hover:bg-forest-50 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
