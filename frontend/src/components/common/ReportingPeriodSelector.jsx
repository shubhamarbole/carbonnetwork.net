import React from 'react';

export default function ReportingPeriodSelector({ value, onChange }) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <span className="font-bold text-slate-400 uppercase tracking-wider">Reporting Period:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-forest-400"
      >
        <option value="Monthly">Monthly</option>
        <option value="Quarterly">Quarterly</option>
        <option value="Yearly">Yearly</option>
      </select>
    </div>
  );
}
