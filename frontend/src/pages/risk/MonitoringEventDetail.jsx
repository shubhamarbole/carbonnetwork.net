import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeft, Bot, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock, Hash, FileCode, Layers, ExternalLink, Play
} from 'lucide-react';

export default function MonitoringEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [notes, setNotes] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/monitoring/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEventData(json.data);
      } else {
        setError(json.message || 'Event not found.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleInvestigate = async () => {
    try {
      setInvestigating(true);
      const res = await fetch(`/api/monitoring/events/${id}/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`AI Investigation launched (Run ID: ${json.data?.agentRunId})`);
        fetchEvent();
      } else {
        showToast(`Failed: ${json.message}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setInvestigating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Activity className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        <p>Loading event telemetry...</p>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">Event Not Found</h2>
        <p className="text-sm text-gray-500">{error || 'Could not locate event.'}</p>
        <Link to="/risk-manager/monitoring" className="inline-block text-emerald-600 hover:underline text-sm font-medium">
          ← Back to Monitoring Overview
        </Link>
      </div>
    );
  }

  const { event, matchedRule, diff } = eventData;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
          <button
            onClick={() => navigate('/risk-manager/monitoring')}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                {event.eventType}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                event.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {event.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">
              Event {event.eventId} on {event.resourceType}
            </h1>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <p>Detected: {new Date(event.detectedAt).toLocaleString()}</p>
          <p className="text-gray-400">Source: {event.source}</p>
        </div>
      </div>

      {/* Visual Diff Box */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          State Transition & Metric Differential
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
          {/* Previous Value */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <span className="text-xs text-gray-400 font-semibold uppercase">Previous Value</span>
            <p className="text-xl font-bold text-gray-600 mt-1">
              {diff?.previous !== null && diff?.previous !== undefined ? String(diff.previous) : 'None / Baseline'}
            </p>
          </div>

          {/* Transition Indicator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
              <span>Transformed to</span>
              <span>→</span>
            </div>
            {diff?.delta !== null && diff?.delta !== undefined && (
              <p className="text-xs font-semibold text-rose-600 mt-2">
                Delta: {diff.delta > 0 ? `+${diff.delta}` : diff.delta}
              </p>
            )}
          </div>

          {/* Current Value */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <span className="text-xs text-gray-400 font-semibold uppercase">Current Value</span>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {String(diff?.current || 'N/A')}
            </p>
          </div>
        </div>
      </div>

      {/* Matched Rule & AI Investigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matched Rule */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Matched Rule Configuration
          </h2>

          {matchedRule ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Rule Name:</span>
                <span className="font-semibold text-gray-900">{matchedRule.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Action:</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {matchedRule.action}
                </span>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <span className="text-gray-500 block mb-1">Conditions:</span>
                <div className="space-y-1">
                  {(matchedRule.conditions || []).map((cond, idx) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-gray-700 font-mono text-[11px]">
                      {cond.field} {cond.operator} {cond.value ?? cond.threshold}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-gray-500 italic mt-2">{matchedRule.description}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4">No specific rule matched; evaluated by event type default.</p>
          )}
        </div>

        {/* AI Investigation Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-600" />
            Autonomous AI Investigation
          </h2>

          {event.aiAgentRunId ? (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900">AI Investigation Active</span>
                  <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded font-semibold text-[10px]">
                    COMPLETED / IN PROGRESS
                  </span>
                </div>
                <p className="text-purple-700 mt-1">Run ID: <strong>{event.aiAgentRunId}</strong></p>
              </div>

              <Link
                to={`/risk-manager/agent?runId=${event.aiAgentRunId}`}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Agent Investigation & Steps
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                No AI investigation has been executed for this event yet. Launch an autonomous investigation to discover root causes and generate concrete mitigations.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional operator notes or focus instructions for the AI agent..."
                rows={2}
                className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={handleInvestigate}
                disabled={investigating}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {investigating ? 'Launching Agent...' : 'Investigate with AI Agent'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payload Details Box */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-500" />
          Event Payload & Deduplication Fingerprint
        </h2>

        <div className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto">
          <div className="text-gray-400 mb-2">// Fingerprint SHA-256: {event.fingerprint}</div>
          <pre>{JSON.stringify(event.payload, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
