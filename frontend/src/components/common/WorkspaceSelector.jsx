import React from 'react';
import { useFacilities } from '../../context/FacilityContext';

export default function WorkspaceSelector() {
  const { facilities, selectedFacilityId, setSelectedFacilityId } = useFacilities();

  if (facilities.length <= 1) {
    return null; // No need to choose if only 1 facility is allowed
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <span className="font-bold text-slate-400 uppercase tracking-wider">Workspace:</span>
      <select
        value={selectedFacilityId}
        onChange={(e) => setSelectedFacilityId(e.target.value)}
        className="bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-forest-400"
      >
        <option value="all">All Scope Sites</option>
        {facilities.map(f => (
          <option key={f._id || f.id} value={f._id || f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  );
}
