import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  Cpu, Radio, Play, Square, Send, RefreshCw, AlertTriangle, 
  Zap, Droplets, Wind, Trash2, CheckCircle2, ShieldCheck, Activity, Terminal
} from 'lucide-react';

export default function IoTSimulator() {
  const { token, user } = useAuth();
  const { facilities } = useFacilities();

  const [stats, setStats] = useState({ port: 1883, activeClients: 0, recentMessages: [] });
  const [ingestionLogs, setIngestionLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simulator controls
  const [deviceType, setDeviceType] = useState('energy');
  const [facilityId, setFacilityId] = useState('fac-main');
  const [deviceId, setDeviceId] = useState('SMART-METER-01');
  const [sourceType, setSourceType] = useState('GRID');
  
  // Dynamic metric values
  const [energyReading, setEnergyReading] = useState(12500);
  const [waterVolume, setWaterVolume] = useState(15.4);
  const [pm25Value, setPm25Value] = useState(42.5);
  const [legalLimit, setLegalLimit] = useState(60.0);
  const [wasteWeight, setWasteWeight] = useState(25.0);

  // Auto-stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIntervalRef = useRef(null);
  const [lastPublished, setLastPublished] = useState(null);
  const [publishStatus, setPublishStatus] = useState('');

  const fetchStatsAndLogs = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/environment/iot/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/environment/iot/logs', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (logsRes.ok) setIngestionLogs(await logsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatsAndLogs();
      const interval = setInterval(fetchStatsAndLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Publish telemetry packet
  const handlePublish = async (overrideData = null) => {
    setLoading(true);
    setPublishStatus('');
    try {
      let payload = {};

      if (deviceType === 'energy') {
        const curr = overrideData ? overrideData.reading : energyReading;
        payload = {
          currentReading: curr,
          unit: 'kWh',
          sourceType,
          usageCategory: 'PRODUCTION_MACHINERY',
          timestamp: new Date().toISOString()
        };
        if (!overrideData) setEnergyReading(prev => prev + Math.round(Math.random() * 25 + 5));
      } else if (deviceType === 'water') {
        const vol = overrideData ? overrideData.consumption : waterVolume;
        payload = {
          consumption: vol,
          source: 'Municipal Water',
          unit: 'm3',
          timestamp: new Date().toISOString()
        };
      } else if (deviceType === 'pollution') {
        const val = overrideData ? overrideData.actualValue : pm25Value;
        payload = {
          medium: 'Air',
          pollutantType: 'PM2.5',
          actualValue: val,
          legalLimit,
          unit: 'µg/m3',
          timestamp: new Date().toISOString()
        };
      } else if (deviceType === 'waste') {
        payload = {
          quantity: wasteWeight,
          unit: 'kg',
          category: 'Recyclable Plastic',
          disposalMethod: 'Recycling',
          timestamp: new Date().toISOString()
        };
      }

      const res = await fetch('/api/environment/iot/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleType: deviceType,
          facilityId,
          deviceId,
          payload
        })
      });

      const resData = await res.json();
      if (res.ok) {
        setLastPublished({
          topic: resData.topic,
          payload,
          time: new Date().toLocaleTimeString()
        });
        setPublishStatus('Published & Ingested Successfully');
        fetchStatsAndLogs();
      } else {
        setPublishStatus(`Failed: ${resData.error}`);
      }
    } catch (err) {
      setPublishStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Live Auto-Stream
  const toggleStreaming = () => {
    if (isStreaming) {
      clearInterval(streamIntervalRef.current);
      setIsStreaming(false);
    } else {
      setIsStreaming(true);
      streamIntervalRef.current = setInterval(() => {
        handlePublish();
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12 text-[11px] text-slate-700 font-sans">
      <Navbar title="IoT Smart Meter Telemetry Studio (MQTT)" />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-6">

        {/* Header and Broker Banner */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold tracking-wide">Embedded MQTT Telemetry Broker (TCP :1883)</h2>
              <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[9px] border border-emerald-500/40 uppercase">
                Active & Listening
              </span>
            </div>
            <p className="text-[10px] text-slate-400 max-w-xl">
              Streams live sub-meter power telemetry, flow sensor metrics, and pollution monitoring packets directly into your tenant database with automatic Scope 2 emission factor multiplication.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Broker Port</p>
              <p className="text-emerald-400 font-mono font-bold">{stats.port || 1883}</p>
            </div>
            <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase">MQTT Clients</p>
              <p className="text-white font-bold">{stats.activeClients || 1}</p>
            </div>
            <button
              onClick={fetchStatsAndLogs}
              className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700 transition"
              title="Refresh Broker Metrics"
            >
              <RefreshCw className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Main Grid: Simulator Controls & Live Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Device Simulator (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-forest-600" />
                <span>IoT Sensor Device Configuration</span>
              </h3>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                QoS 0 Telemetry
              </span>
            </div>

            {/* Device Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Sensor / Meter Protocol</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'energy', label: 'Electricity Meter', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                  { id: 'water', label: 'Water Flow Meter', icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  { id: 'pollution', label: 'PM2.5 Air Sensor', icon: Wind, color: 'text-rose-600 bg-rose-50 border-rose-200' },
                  { id: 'waste', label: 'Smart Waste Scale', icon: Trash2, color: 'text-purple-600 bg-purple-50 border-purple-200' }
                ].map(d => {
                  const Icon = d.icon;
                  const active = deviceType === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDeviceType(d.id);
                        setDeviceId(d.id === 'energy' ? 'SMART-METER-01' : (d.id === 'water' ? 'FLOW-SENSOR-02' : 'AIR-MONITOR-03'));
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${active ? d.color + ' ring-2 ring-forest-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-[11px] font-bold truncate">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Device Parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Facility</label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  {facilities.map(f => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                  <option value="fac-main">Main Plant Facility</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Device Identifier</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Metric Sliders */}
            {deviceType === 'energy' && (
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Cumulative Reading (kWh)</span>
                  <span className="text-xs font-mono font-bold text-amber-900">{energyReading.toLocaleString()} kWh</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="50"
                  value={energyReading}
                  onChange={(e) => setEnergyReading(parseFloat(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <div className="flex justify-between text-[9px] text-amber-700 font-semibold">
                  <span>Source: {sourceType}</span>
                  <button
                    type="button"
                    onClick={() => setSourceType(s => s === 'GRID' ? 'SOLAR' : 'GRID')}
                    className="underline hover:text-amber-900"
                  >
                    Toggle Source ({sourceType})
                  </button>
                </div>
              </div>
            )}

            {deviceType === 'water' && (
              <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-800 uppercase">Flow Rate Consumption</span>
                  <span className="text-xs font-mono font-bold text-blue-900">{waterVolume} m³</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="0.5"
                  value={waterVolume}
                  onChange={(e) => setWaterVolume(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {deviceType === 'pollution' && (
              <div className="space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase">PM2.5 Sensor Reading</span>
                  <span className={`text-xs font-mono font-bold ${pm25Value > legalLimit ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                    {pm25Value} µg/m³ (Limit: {legalLimit})
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="1"
                  value={pm25Value}
                  onChange={(e) => setPm25Value(parseFloat(e.target.value))}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[9px]">
                  <button
                    type="button"
                    onClick={() => setPm25Value(35)}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Normal (35 µg/m³)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPm25Value(95)}
                    className="text-red-600 font-bold hover:underline"
                  >
                    🚨 Trigger Breach Alert (95 µg/m³)
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePublish()}
                  disabled={loading}
                  className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Publish Single MQTT Packet</span>
                </button>

                <button
                  type="button"
                  onClick={toggleStreaming}
                  className={`font-bold py-2.5 px-4 rounded-xl text-xs flex items-center space-x-1.5 transition ${isStreaming ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {isStreaming ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      <span>Stop Stream</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Auto Stream (3s)</span>
                    </>
                  )}
                </button>
              </div>

              {publishStatus && (
                <p className={`text-[10px] text-center font-bold ${publishStatus.includes('Success') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {publishStatus}
                </p>
              )}
            </div>

          </div>

          {/* Right Column: Live Terminal & Ingestion Logs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Terminal Window */}
            <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl shadow-md border border-slate-800 font-mono text-[10px] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-slate-300">Live MQTT Telemetry Stream</span>
                </div>
                <div className="flex items-center space-x-2 text-[9px] text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Broker: mqtt://localhost:1883</span>
                </div>
              </div>

              {lastPublished ? (
                <div className="space-y-1.5 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-slate-400 text-[9px]">
                    <span className="text-emerald-400 font-bold">TOPIC: {lastPublished.topic}</span>
                    <span>{lastPublished.time}</span>
                  </div>
                  <pre className="text-slate-100 overflow-x-auto text-[10px]">
                    {JSON.stringify(lastPublished.payload, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 italic">
                  No packets published yet. Click "Publish Single MQTT Packet" or "Auto Stream" to transmit telemetry.
                </div>
              )}
            </div>

            {/* Ingested Records History */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-forest-600" />
                  <span>Real-Time Database Ingestion Feed</span>
                </h4>
                <span className="text-[9px] text-slate-400 font-semibold">{ingestionLogs.length} events logged</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {ingestionLogs.length === 0 ? (
                  <p className="py-6 text-center text-slate-400 text-[10px] italic">
                    Waiting for incoming IoT telemetry packets...
                  </p>
                ) : (
                  ingestionLogs.map((log, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-[10px] hover:bg-slate-50/50 px-2 rounded-lg transition">
                      <div className="space-y-0.5">
                        <p className="font-mono font-bold text-slate-800">{log.topic}</p>
                        <p className="text-slate-400 text-[9px]">
                          {typeof log.payload === 'object' ? JSON.stringify(log.payload) : log.payload}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`inline-block font-bold text-[8px] px-2 py-0.5 rounded-full ${
                          log.status.includes('ENERGY') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          log.status.includes('POLLUTION') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {log.status}
                        </span>
                        <p className="text-[8px] text-slate-400">{new Date(log.receivedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
