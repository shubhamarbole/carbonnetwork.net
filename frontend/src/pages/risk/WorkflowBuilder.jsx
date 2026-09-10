import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Trash2, ArrowLeft, Check, ShieldCheck,
  AlertTriangle, Clock, Bot, Bell, ShieldAlert, Sparkles, CheckCheck
} from 'lucide-react';

const TRIGGER_OPTIONS = [
  { value: 'RISK_ESCALATED', label: 'Risk Escalated (Score crossed threshold)' },
  { value: 'CRITICAL_RISK_DETECTED', label: 'Critical Risk Detected' },
  { value: 'COMPLIANCE_DEADLINE_MISSED', label: 'Compliance Deadline Missed' },
  { value: 'ESG_THRESHOLD_EXCEEDED', label: 'ESG Metric Threshold Exceeded' },
  { value: 'CARBON_THRESHOLD_EXCEEDED', label: 'Carbon Emissions Threshold Exceeded' },
  { value: 'MITIGATION_OVERDUE', label: 'Mitigation Plan Overdue' },
  { value: 'SUPPLIER_RISK_INCREASED', label: 'Supplier Risk Score Increased' },
  { value: 'MANUAL', label: 'Manual Trigger (On-demand)' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'greater_than_or_equal', label: 'Greater Than Or Equal (>=)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'less_than_or_equal', label: 'Less Than Or Equal (<=)' },
  { value: 'crosses_threshold', label: 'Crosses Threshold' },
  { value: 'increase_percentage', label: 'Increases By (%)' },
  { value: 'decrease_percentage', label: 'Decreases By (%)' },
  { value: 'missing', label: 'Is Missing / Empty' },
  { value: 'overdue', label: 'Is Overdue (Date)' }
];

const ACTION_OPTIONS = [
  { value: 'CREATE_ALERT', label: 'Create Alert', isSensitive: false },
  { value: 'CREATE_MITIGATION', label: 'Create Mitigation Proposal', isSensitive: false },
  { value: 'CREATE_TASK', label: 'Create Operational Task', isSensitive: false },
  { value: 'ASSIGN_OWNER', label: 'Assign Workflow Owner', isSensitive: false },
  { value: 'SET_DEADLINE', label: 'Set Resolution Deadline', isSensitive: false },
  { value: 'CREATE_NOTIFICATION', label: 'Send Internal Notification', isSensitive: false },
  { value: 'TRIGGER_AI_AGENT', label: 'Trigger AI Agent Investigation (Phase 5)', isSensitive: false },
  { value: 'CHANGE_RISK_OWNER', label: 'Change Risk Owner (Sensitive: Approval Required)', isSensitive: true },
  { value: 'CHANGE_COMPLIANCE_STATUS', label: 'Change Compliance Status (Sensitive: Approval Required)', isSensitive: true },
  { value: 'EXTERNAL_NOTIFICATION', label: 'External Notification (Sensitive: Approval Required)', isSensitive: true }
];

export default function WorkflowBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('RISK_ESCALATED');
  const [enabled, setEnabled] = useState(true);
  const [deadlineHours, setDeadlineHours] = useState(48);

  const [conditions, setConditions] = useState([
    { field: 'severity', operator: 'equals', value: 'CRITICAL', threshold: '' }
  ]);

  const [actions, setActions] = useState([
    {
      step_number: 1,
      action_type: 'CREATE_ALERT',
      parameters: { severity: 'CRITICAL', title: 'Critical Risk Automated Alert' },
      requires_approval: false
    },
    {
      step_number: 2,
      action_type: 'CREATE_MITIGATION',
      parameters: { title: 'Mandatory Mitigation Protocol' },
      requires_approval: false
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'risk_score', operator: 'greater_than', value: '75', threshold: '' }]);
  };

  const handleRemoveCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index, key, val) => {
    const updated = [...conditions];
    updated[index][key] = val;
    setConditions(updated);
  };

  const handleAddAction = () => {
    const nextStep = actions.length + 1;
    setActions([
      ...actions,
      {
        step_number: nextStep,
        action_type: 'CREATE_NOTIFICATION',
        parameters: { title: 'Automated notification' },
        requires_approval: false
      }
    ]);
  };

  const handleRemoveAction = (index) => {
    const updated = actions.filter((_, i) => i !== index).map((act, i) => ({
      ...act,
      step_number: i + 1
    }));
    setActions(updated);
  };

  const handleActionChange = (index, key, val) => {
    const updated = [...actions];
    updated[index][key] = val;

    // Check if sensitive action requires approval automatically
    if (key === 'action_type') {
      const opt = ACTION_OPTIONS.find(o => o.value === val);
      if (opt && opt.isSensitive) {
        updated[index].requires_approval = true;
      }
    }
    setActions(updated);
  };

  const handleActionParamChange = (index, paramKey, val) => {
    const updated = [...actions];
    updated[index].parameters = {
      ...(updated[index].parameters || {}),
      [paramKey]: val
    };
    setActions(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Workflow name is required');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        trigger,
        enabled,
        deadlineConfig: {
          duration_hours: Number(deadlineHours),
          warning_threshold_pct: 75.0
        },
        conditions: conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
          threshold: c.threshold ? Number(c.threshold) : null
        })),
        actions: actions.map((a, idx) => ({
          step_number: idx + 1,
          action_type: a.action_type,
          parameters: a.parameters || {},
          requires_approval: Boolean(a.requires_approval)
        }))
      };

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Workflow created successfully!');
        setTimeout(() => navigate('/workflow-manager'), 1000);
      } else {
        setErrorMsg(json.message || 'Failed to create workflow definition');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2">
          <CheckCheck className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex items-center space-x-3 text-slate-500 hover:text-slate-800 transition">
        <button onClick={() => navigate('/workflow-manager')} className="flex items-center space-x-1 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Workflows</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visual Workflow Builder</h1>
          <p className="text-sm text-slate-500">
            Define safe, automated operational sequences triggered by monitored events.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            <span>1. General Configuration</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Workflow Name *</label>
              <input
                type="text"
                placeholder="e.g. Critical Environmental Escalation Workflow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Resolution Deadline (Hours)</label>
              <input
                type="number"
                min="1"
                max="720"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Outline the operational objective of this automated workflow..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="enableToggle"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="enableToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
              Enable workflow immediately upon creation
            </label>
          </div>
        </div>

        {/* Section 2: Trigger */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span>2. Event Trigger</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Triggering Monitored Event *</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {TRIGGER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Safe Conditions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>3. Filter Conditions (Deterministic & Safe)</span>
            </h2>
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1 bg-emerald-50 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Condition</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            All conditions must match (AND logic). No arbitrary scripts or code expressions permitted.
          </p>

          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Field</label>
                  <input
                    type="text"
                    placeholder="field e.g. severity"
                    value={cond.field}
                    onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Operator</label>
                  <select
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {OPERATOR_OPTIONS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Value / Target</label>
                  <input
                    type="text"
                    placeholder="Target value"
                    value={cond.value}
                    onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCondition(idx)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition mt-4"
                  title="Remove condition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Workflow Action Steps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>4. Action Steps Orchestration</span>
            </h2>
            <button
              type="button"
              onClick={handleAddAction}
              className="flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1 bg-emerald-50 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </button>
          </div>

          <div className="space-y-4">
            {actions.map((act, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-700">Step {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Action Type</label>
                    <select
                      value={act.action_type}
                      onChange={(e) => handleActionChange(idx, 'action_type', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {ACTION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Action Title / Note</label>
                    <input
                      type="text"
                      placeholder="Title or instruction"
                      value={act.parameters?.title || ''}
                      onChange={(e) => handleActionParamChange(idx, 'title', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id={`approval_${idx}`}
                    checked={act.requires_approval}
                    onChange={(e) => handleActionChange(idx, 'requires_approval', e.target.checked)}
                    className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor={`approval_${idx}`} className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Requires explicit Human-In-The-Loop approval before executing this step
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/workflow-manager')}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-forest-500 hover:from-emerald-700 text-white font-bold rounded-xl text-sm shadow transition flex items-center space-x-2"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'Creating Workflow...' : 'Save & Publish Workflow'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
