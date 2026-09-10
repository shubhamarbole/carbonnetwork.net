import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle,
  ToggleLeft, ToggleRight, X, Filter, RefreshCw, Layers
} from 'lucide-react';

const EVENT_TYPE_CATEGORIES = {
  'Risk Events': [
    'RISK_SCORE_CHANGED',
    'RISK_ESCALATED',
    'RISK_DE_ESCALATED'
  ],
  'ESG Events': [
    'ESG_THRESHOLD_EXCEEDED',
    'ESG_DATA_MISSING',
    'ESG_DATA_OVERDUE'
  ],
  'Carbon Events': [
    'CARBON_THRESHOLD_EXCEEDED',
    'CARBON_DATA_MISSING',
    'CARBON_TARGET_DEVIATION'
  ],
  'Compliance Events': [
    'COMPLIANCE_DEADLINE_APPROACHING',
    'COMPLIANCE_DEADLINE_MISSED',
    'COMPLIANCE_DOCUMENT_MISSING',
    'COMPLIANCE_STATUS_CHANGED'
  ],
  'Supplier Events': [
    'SUPPLIER_RISK_INCREASED',
    'SUPPLIER_DOCUMENT_EXPIRING',
    'SUPPLIER_PERFORMANCE_DETERIORATED'
  ],
  'Project Events': [
    'PROJECT_DELAYED',
    'PROJECT_MILESTONE_MISSED',
    'PROJECT_DATA_MISSING'
  ]
};

const OPERATORS = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal (>=)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal (<=)' },
  { value: 'crosses_threshold', label: 'Crosses Threshold' },
  { value: 'increase_percentage', label: 'Increase Percentage (%)' },
  { value: 'decrease_percentage', label: 'Decrease Percentage (%)' },
  { value: 'missing', label: 'Is Missing / Empty' },
  { value: 'overdue', label: 'Is Overdue' }
];

export default function MonitoringRulesManager() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('RISK_ESCALATED');
  const [action, setAction] = useState('CREATE_ALERT');
  const [conditions, setConditions] = useState([
    { field: 'current_severity', operator: 'equals', value: 'HIGH' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/monitoring/rules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRules(json.data || []);
      } else {
        setError(json.message || 'Failed to fetch rules.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (rule) => {
    try {
      const res = await fetch(`/api/monitoring/rules/${rule.ruleId || rule._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !rule.enabled })
      });
      if (res.ok) {
        showToast(`Rule "${rule.name}" ${!rule.enabled ? 'enabled' : 'disabled'}.`);
        fetchRules();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.name}"?`)) return;
    try {
      const res = await fetch(`/api/monitoring/rules/${rule.ruleId || rule._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Rule deleted successfully.`);
        fetchRules();
      }
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'current_value', operator: 'greater_than', value: 0 }]);
  };

  const handleRemoveCondition = (index) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index, fieldName, val) => {
    const updated = [...conditions];
    updated[index][fieldName] = val;
    setConditions(updated);
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!name.trim() || conditions.length === 0) {
      alert('Please provide a rule name and at least one condition.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/monitoring/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          eventType,
          action,
          conditions: conditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: isNaN(c.value) || c.value === '' ? c.value : Number(c.value)
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Rule created successfully.');
        setModalOpen(false);
        // Reset form
        setName('');
        setDescription('');
        setConditions([{ field: 'current_severity', operator: 'equals', value: 'HIGH' }]);
        fetchRules();
      } else {
        alert(data.message || 'Failed to create rule.');
      }
    } catch (err) {
      alert(`Error creating rule: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/risk-manager/monitoring"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoring Rules Manager</h1>
            <p className="text-sm text-gray-500">Configure deterministic event thresholds, anomaly rules, and autonomous AI actions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
          <button
            onClick={fetchRules}
            className="p-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ShieldAlert className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-700">No Monitoring Rules Defined</p>
            <p className="text-xs text-gray-400 mt-1">Create your first monitoring rule to watch for anomalies.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Rule Name & Justification</th>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">Conditions (AND)</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.ruleId || r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{r.description || 'Enterprise anomaly detection rule'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                      {r.eventType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">
                    <div className="space-y-1">
                      {(r.conditions || []).map((c, i) => (
                        <div key={i} className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-[11px] font-mono">
                          {c.field} {c.operator} {c.value ?? c.threshold}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      r.action === 'TRIGGER_AI_AGENT' ? 'bg-purple-100 text-purple-700' :
                      r.action === 'TRIGGER_AI_ANALYSIS' ? 'bg-blue-100 text-blue-700' :
                      r.action === 'CREATE_ALERT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                        r.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {r.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Visual Condition Builder Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Create New Proactive Monitoring Rule</h2>
              <p className="text-xs text-gray-500">Construct safe conditions evaluated deterministically during automated sweeps.</p>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              {/* Rule Name & Description */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Critical Scope 1 GHG Surge Alert"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the risk trigger"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Event Type & Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Target Event Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    {Object.entries(EVENT_TYPE_CATEGORIES).map(([cat, types]) => (
                      <optgroup key={cat} label={cat}>
                        {types.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Action upon Match *</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="CREATE_ALERT">CREATE_ALERT (Dispatch to Alert Queue)</option>
                    <option value="TRIGGER_AI_AGENT">TRIGGER_AI_AGENT (Launch Autonomous Investigation)</option>
                    <option value="TRIGGER_AI_ANALYSIS">TRIGGER_AI_ANALYSIS (Run LLM Analysis)</option>
                    <option value="LOG_ONLY">LOG_ONLY (Record Event)</option>
                  </select>
                </div>
              </div>

              {/* Condition Builder (AND logic) */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Criteria Conditions (ALL Must Match - AND logic)</span>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Condition
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={cond.field}
                        onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                        className="w-1/3 border border-gray-300 rounded p-1.5 text-xs bg-white"
                        required
                      />

                      <select
                        value={cond.operator}
                        onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                        className="w-1/3 border border-gray-300 rounded p-1.5 text-xs bg-white"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Target value"
                        value={cond.value}
                        onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                        className="w-1/3 border border-gray-300 rounded p-1.5 text-xs bg-white"
                      />

                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(idx)}
                          className="text-gray-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Monitoring Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
