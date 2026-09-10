import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  Building, Users, FileText, Bot, AlertTriangle, ShieldCheck, 
  Activity, Settings, ClipboardList, Plus, ArrowUpRight, Cpu, HardDrive, 
  Network, Flame, RefreshCw, BarChart2, ShieldAlert, CheckCircle, XCircle, Layout, HelpCircle,
  Search, Calendar, MessageSquare, AlertOctagon, UserCheck, Inbox, Clock, ShieldX, Filter, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

export default function PlatformAdminDashboard() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // State management
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [workQueue, setWorkQueue] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [savedViews, setSavedViews] = useState([
    { name: 'My Pending Work', filter: { assignedTo: user?.email || '', status: 'PENDING' } },
    { name: 'High Priority Issues', filter: { priority: 'CRITICAL', status: 'PENDING' } },
    { name: 'Overdue Verifications', filter: { type: 'VERIFICATION', overdue: true } },
    { name: 'Unassigned Tasks', filter: { unassigned: true } }
  ]);

  // Command Palette & Modal States
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [org360Id, setOrg360Id] = useState(null);
  const [org360Data, setOrg360Data] = useState(null);
  const [activeOrg360Tab, setActiveOrg360Tab] = useState('overview');
  const [activeTaskNoteId, setActiveTaskNoteId] = useState(null);
  const [newTaskNote, setNewTaskNote] = useState('');
  const [escalateTaskId, setEscalateTaskId] = useState(null);
  const [escalationReason, setEscalationReason] = useState('SLA_BREACH');
  const [escalationDesc, setEscalationDesc] = useState('');
  const [escalationPriority, setEscalationPriority] = useState('HIGH');

  // Form input states
  const [newOrgName, setNewOrgName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [newUserOrgId, setNewUserOrgId] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigneeDueDate, setAssigneeDueDate] = useState('');
  const [assignTaskModalId, setAssignTaskModalId] = useState(null);

  // Bulk actions selected keys
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Setup Keyboard Shortcuts Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchOpsData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [statsRes, orgsRes, usersRes, queueRes, logsRes] = await Promise.all([
        fetch('/api/platformadmin/dashboard', { headers }),
        fetch('/api/platformadmin/organizations', { headers }),
        fetch('/api/platformadmin/users', { headers }),
        fetch('/api/platformadmin/work-queue', { headers }),
        fetch('/api/platformadmin/activity', { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (orgsRes.ok) {
        const orgList = await orgsRes.json();
        setOrgs(orgList);
        if (orgList.length > 0) setNewUserOrgId(orgList[0]._id);
      }
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (queueRes.ok) setWorkQueue(await queueRes.json());
      if (logsRes.ok) setActivityLogs(await logsRes.json());
    } catch (err) {
      console.error('Fetch operations failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsData();
  }, [token]);

  // Load Organization 360° Data
  const loadOrg360 = async (orgId) => {
    try {
      const res = await fetch(`/api/platformadmin/organizations/${orgId}/360`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setOrg360Data(await res.json());
        setOrg360Id(orgId);
        setActiveOrg360Tab('overview');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actions
  const handleAddOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platformadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newOrgName })
      });
      if (res.ok) {
        setNewOrgName('');
        fetchOpsData();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platformadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          organizationId: newUserOrgId
        })
      });
      if (res.ok) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchOpsData();
      }
    } catch (err) { console.error(err); }
  };

  const handleAssignTask = async (taskId, assignee, dueDate) => {
    try {
      const res = await fetch(`/api/platformadmin/work-queue/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ assignedTo: assignee, dueDate })
      });
      if (res.ok) {
        setAssignTaskModalId(null);
        setAssigneeEmail('');
        setAssigneeDueDate('');
        fetchOpsData();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddNote = async (taskId) => {
    if (!newTaskNote) return;
    try {
      const res = await fetch(`/api/platformadmin/work-queue/${taskId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ note: newTaskNote })
      });
      if (res.ok) {
        setNewTaskNote('');
        fetchOpsData();
      }
    } catch (err) { console.error(err); }
  };

  const handleEscalateTask = async (e) => {
    e.preventDefault();
    if (!escalateTaskId) return;
    try {
      const res = await fetch(`/api/platformadmin/work-queue/${escalateTaskId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          reason: escalationReason,
          priority: escalationPriority,
          description: escalationDesc
        })
      });
      if (res.ok) {
        setEscalateTaskId(null);
        setEscalationDesc('');
        alert('Escalation request submitted to Super Admin');
        fetchOpsData();
      }
    } catch (err) { console.error(err); }
  };

  const handleBulkAssign = async () => {
    if (selectedTaskIds.length === 0 || !assigneeEmail) return;
    const confirmAction = window.confirm(`Assign ${selectedTaskIds.length} tasks to ${assigneeEmail}?`);
    if (!confirmAction) return;

    try {
      await Promise.all(selectedTaskIds.map(id => 
        fetch(`/api/platformadmin/work-queue/${id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ assignedTo: assigneeEmail })
        })
      ));
      setSelectedTaskIds([]);
      setAssigneeEmail('');
      fetchOpsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmission = async (id, status) => {
    try {
      const res = await fetch(`/api/platformadmin/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchOpsData();
    } catch (err) { console.error(err); }
  };

  const handleExportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8,Timestamp,User,Action,Module\n" +
      activityLogs.map(l => `"${l.timestamp}","${l.user}","${l.action}","${l.module}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Platform_Operations_Feed_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rule-based Recommended Actions Engine
  const recommendedActions = useMemo(() => {
    const list = [];
    workQueue.forEach(item => {
      if (item.priority === 'CRITICAL' && item.status === 'PENDING') {
        list.push({
          type: 'Review Alert',
          desc: `Critical issue flagged: resolve request from ${item.organization}`,
          badge: 'CRITICAL',
          reason: 'High-severity trigger',
          actionLabel: 'Review',
          onClick: () => {
            setSearchParams({ tab: 'work-queue' });
            setPriorityFilter('CRITICAL');
          }
        });
      }
      if (!item.assignedTo && item.status === 'PENDING') {
        list.push({
          type: 'Assign Workload',
          desc: `Unassigned task pending: ${item.type} request from ${item.organization}`,
          badge: 'UNASSIGNED',
          reason: 'Awaiting operator review',
          actionLabel: 'Assign',
          onClick: () => {
            setSearchParams({ tab: 'work-queue' });
            setUnassignedOnly(true);
          }
        });
      }
      if (item.slaStatus === 'OVERDUE' && item.status === 'PENDING') {
        list.push({
          type: 'SLA Breach Risk',
          desc: `Overdue task backlog: review ${item.type} for ${item.organization}`,
          badge: 'OVERDUE',
          reason: 'Breaches system operation timeframe',
          actionLabel: 'Escalate',
          onClick: () => {
            setSearchParams({ tab: 'work-queue' });
            setOverdueOnly(true);
          }
        });
      }
    });
    return list.slice(0, 5);
  }, [workQueue]);

  // Compute Active Work Queue with Filters & Search
  const filteredQueue = useMemo(() => {
    return workQueue.filter(item => {
      const matchSearch = (
        item.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      const matchOrg = orgFilter === 'all' || item.organization === orgFilter;
      const matchPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchAssigned = assignedFilter === 'all' || (assignedFilter === 'me' ? item.assignedTo === user?.email : !!item.assignedTo);
      const matchOverdue = !overdueOnly || item.slaStatus === 'OVERDUE';
      const matchUnassigned = !unassignedOnly || !item.assignedTo;

      return matchSearch && matchOrg && matchPriority && matchStatus && matchAssigned && matchOverdue && matchUnassigned;
    });
  }, [workQueue, searchQuery, orgFilter, priorityFilter, statusFilter, assignedFilter, overdueOnly, unassignedOnly]);

  const workloadCounts = useMemo(() => {
    const counts = { low: 0, normal: 0, high: 0, overloaded: 0 };
    workQueue.forEach(w => {
      if (w.status === 'PENDING') {
        if (w.slaStatus === 'CRITICAL' || w.slaStatus === 'OVERDUE') counts.overloaded++;
        else if (w.priority === 'HIGH') counts.high++;
        else if (w.priority === 'MEDIUM') counts.normal++;
        else counts.low++;
      }
    });
    return counts;
  }, [workQueue]);

  // Saved views filter triggers
  const applySavedView = (viewFilter) => {
    if (viewFilter.assignedTo) setAssignedFilter('me');
    if (viewFilter.status) setStatusFilter(viewFilter.status);
    if (viewFilter.priority) setPriorityFilter(viewFilter.priority);
    if (viewFilter.overdue) setOverdueOnly(true);
    if (viewFilter.unassigned) setUnassignedOnly(true);
    setActiveTab('work-queue');
  };

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50 text-[11px] text-slate-700 font-sans">
      <Navbar title={`Operations Command Center — ${activeTab.toUpperCase()}`} />

      {/* Top Quick command search */}
      <div className="mt-4 flex items-center justify-between bg-white border border-slate-200 shadow-sm px-4 py-3 rounded-2xl">
        <div className="flex items-center space-x-2 w-full max-w-lg">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search organizations, users, tasks... (Press Ctrl+K)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-xs text-slate-800"
          />
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded text-[9px] uppercase">CTRL + K</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 mt-6 mb-6 flex-wrap gap-1">
        {[
          { id: 'dashboard', name: 'Dashboard', icon: Activity },
          { id: 'organizations', name: 'Organizations', icon: Building },
          { id: 'submissions', name: 'Submissions', icon: ClipboardList },
          { id: 'reviews', name: 'Reviews', icon: ShieldCheck },
          { id: 'risk', name: 'AI Risk Monitor', icon: AlertTriangle },
          { id: 'reports', name: 'Reports', icon: FileText }
        ].map(t => {
          const isTabActive = t.id === 'submissions' 
            ? (activeTab === 'submissions' || activeTab === 'work-queue')
            : t.id === 'reviews'
            ? (activeTab === 'reviews' || activeTab === 'verification' || activeTab === 'approvals')
            : t.id === 'risk'
            ? (activeTab === 'risk' || activeTab === 'alerts')
            : activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 px-3 font-bold text-xs flex items-center space-x-2 transition-all border-b-2 ${
                isTabActive ? 'border-forest-600 text-forest-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading Enterprise Operations Dashboard...</div>
      ) : (
        <div>
          {/* 1. OPERATIONS DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Primary KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {[
                  { name: 'Pending Approvals', val: stats.approvalsPending, label: 'Awaiting check', color: 'text-amber-600', icon: CheckCircle },
                  { name: 'Pending Submissions', val: workQueue.filter(q => q.status === 'PENDING' && q.type === 'ORGANIZATION').length, label: 'Registry items', color: 'text-blue-600', icon: Inbox },
                  { name: 'Verification Workload', val: stats.verificationQueueSize, label: 'Audits queue', color: 'text-purple-600', icon: ShieldCheck },
                  { name: 'Data Quality Issues', val: workQueue.filter(q => q.type === 'DATA_QUALITY' && q.status === 'PENDING').length, label: 'Anomalies count', color: 'text-red-500', icon: BarChart2 },
                  { name: 'Environmental Alerts', val: stats.alerts?.critical + stats.alerts?.warning, label: 'Threshold logs', color: 'text-orange-500', icon: AlertTriangle },
                  { name: 'Open Support Tickets', val: workQueue.filter(q => q.type === 'SUPPORT' && q.status === 'PENDING').length, label: 'Tickets queue', color: 'text-slate-600', icon: HelpCircle }
                ].map(c => (
                  <div key={c.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">{c.name}</p>
                      <c.icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xl font-black text-slate-800">{c.val}</h3>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{c.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Priorities & Recommended actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Priorities section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1">
                      <AlertOctagon className="h-4 w-4 text-rose-500" />
                      <span>Today's Critical Priorities</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-rose-800 font-semibold flex justify-between">
                        <span>Critical Issues</span>
                        <span>{stats.alerts?.critical} alerts</span>
                      </div>
                      <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-amber-800 font-semibold flex justify-between">
                        <span>Tasks Due Today</span>
                        <span>{workQueue.filter(q => q.slaStatus === 'AT RISK' && q.status === 'PENDING').length} tasks</span>
                      </div>
                      <div className="p-3 bg-rose-50 border-l-4 border-rose-500 rounded text-rose-800 font-semibold flex justify-between">
                        <span>Overdue Verification Tasks</span>
                        <span>{workQueue.filter(q => q.slaStatus === 'OVERDUE' && q.status === 'PENDING').length} items</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSearchParams({ tab: 'work-queue' });
                      setPriorityFilter('CRITICAL');
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3.5 rounded-lg mt-4 text-center transition"
                  >
                    View Priority Queue
                  </button>
                </div>

                {/* Recommended Actions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1.5">
                    <UserCheck className="h-4 w-4 text-forest-600" />
                    <span>Recommended Operations Actions</span>
                  </h4>
                  <div className="space-y-2.5">
                    {recommendedActions.map((rec, index) => (
                      <div key={index} className="flex justify-between items-start pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
                        <div className="space-y-0.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${
                            rec.badge === 'CRITICAL' ? 'bg-red-500' : (rec.badge === 'OVERDUE' ? 'bg-orange-500' : 'bg-forest-600')
                          }`}>{rec.badge}</span>
                          <p className="font-bold text-slate-800">{rec.type}</p>
                          <p className="text-[9px] text-slate-400">{rec.desc}</p>
                        </div>
                        <button 
                          onClick={rec.onClick}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[9px] transition"
                        >
                          {rec.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Work state */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1.5">
                      <Inbox className="h-4 w-4 text-blue-600" />
                      <span>My Work Roster</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Assigned to Me</p>
                        <h4 className="text-lg font-black text-slate-800">{workQueue.filter(w => w.assignedTo === user?.email && w.status === 'PENDING').length}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Due Today</p>
                        <h4 className="text-lg font-black text-amber-600">{workQueue.filter(w => w.assignedTo === user?.email && w.slaStatus === 'AT RISK').length}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Overdue</p>
                        <h4 className="text-lg font-black text-red-500">{workQueue.filter(w => w.assignedTo === user?.email && w.slaStatus === 'OVERDUE').length}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Completed</p>
                        <h4 className="text-lg font-black text-forest-600">{workQueue.filter(w => w.assignedTo === user?.email && w.status === 'APPROVED').length}</h4>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setAssignedFilter('me');
                      setActiveTab('work-queue');
                    }}
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 px-3.5 rounded-lg mt-4 text-center transition"
                  >
                    View My Tasks
                  </button>
                </div>
              </div>

              {/* SLA Monitor, Risk Indicators & Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3">SLA Compliance Tracking</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                        <span className="font-semibold text-slate-500 flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span>On Track</span>
                        </span>
                        <span className="font-bold text-slate-800">{workQueue.filter(w => w.slaStatus === 'ON TRACK' && w.status === 'PENDING').length} Tasks</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                        <span className="font-semibold text-slate-500 flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>At Risk</span>
                        </span>
                        <span className="font-bold text-amber-600">{workQueue.filter(w => w.slaStatus === 'AT RISK' && w.status === 'PENDING').length} Tasks</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                        <span className="font-semibold text-slate-500 flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                          <span>Overdue</span>
                        </span>
                        <span className="font-bold text-orange-600">{workQueue.filter(w => w.slaStatus === 'OVERDUE' && w.status === 'PENDING').length} Tasks</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500 flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>Critical</span>
                        </span>
                        <span className="font-bold text-red-500">{workQueue.filter(w => w.slaStatus === 'CRITICAL' && w.status === 'PENDING').length} Tasks</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Operations SLA Rating</p>
                    <h3 className="text-xl font-black text-slate-800 mt-0.5">94.8% <span className="text-[10px] text-forest-600 font-bold">↑ 0.4%</span></h3>
                  </div>
                </div>

                {/* Operations trends */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                  <h4 className="font-bold text-slate-800 text-xs mb-3">Platform Operations Flow Analysis</h4>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'Wk 1', submissions: 12, verifications: 8, alerts: 14 },
                        { name: 'Wk 2', submissions: 18, verifications: 14, alerts: 9 },
                        { name: 'Wk 3', submissions: 14, verifications: 16, alerts: 11 },
                        { name: 'Wk 4', submissions: 24, verifications: 19, alerts: 18 }
                      ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorVer" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} />
                        <YAxis stroke="#cbd5e1" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="submissions" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                        <Area type="monotone" dataKey="verifications" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorVer)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Organization Health Scores */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 text-xs mb-3">Onboarded Tenant Health Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { name: 'GreenFuture Ltd.', rating: '92%', trend: '↑', status: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' },
                    { name: 'Aqua Corp', rating: '71%', trend: '↓', status: 'Data quality issues', color: 'text-amber-600', bg: 'bg-amber-50' },
                    { name: 'Eco Industries', rating: '58%', trend: '↓', status: 'Missing evidence', color: 'text-orange-500', bg: 'bg-orange-50' },
                    { name: 'Waste Solutions', rating: '42%', trend: '↓', status: 'Overdue submissions', color: 'text-red-500', bg: 'bg-red-50' },
                    { name: 'AirCare Pvt. Ltd.', rating: '35%', trend: '↓', status: 'Verification pending', color: 'text-red-600', bg: 'bg-red-50' }
                  ].map(o => (
                    <div key={o.name} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800 truncate block max-w-[120px]">{o.name}</span>
                        <span className={`font-bold ${o.color}`}>{o.rating} {o.trend}</span>
                      </div>
                      <span className={`mt-2 block px-2 py-0.5 rounded text-[9px] font-semibold text-center ${o.bg} ${o.color}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. UNIFIED WORK QUEUE / SUBMISSIONS */}
          {(activeTab === 'submissions' || activeTab === 'work-queue') && (
            <div className="space-y-6">
              {/* Filter controls bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4.5 w-4.5 text-slate-400" />
                    <span className="font-bold text-slate-800">Operational Filters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        setOrgFilter('all');
                        setPriorityFilter('all');
                        setStatusFilter('all');
                        setAssignedFilter('all');
                        setOverdueOnly(false);
                        setUnassignedOnly(false);
                      }}
                      className="text-slate-500 hover:text-slate-800 text-[10px] font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tenant Organization</label>
                    <select 
                      value={orgFilter} 
                      onChange={(e) => setOrgFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="all">All Orgs</option>
                      {Array.from(new Set(workQueue.map(q => q.organization))).map(org => (
                        <option key={org} value={org}>{org}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                    <select 
                      value={priorityFilter} 
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status</label>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assigned To</label>
                    <select 
                      value={assignedFilter} 
                      onChange={(e) => setAssignedFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none"
                    >
                      <option value="all">All Assignees</option>
                      <option value="me">Assigned to Me</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <input 
                      type="checkbox" 
                      id="chkOverdue"
                      checked={overdueOnly}
                      onChange={(e) => setOverdueOnly(e.target.checked)}
                      className="rounded text-forest-600 focus:ring-forest-500 h-3.5 w-3.5"
                    />
                    <label htmlFor="chkOverdue" className="font-bold text-slate-600 cursor-pointer">Overdue SLA</label>
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <input 
                      type="checkbox" 
                      id="chkUnassigned"
                      checked={unassignedOnly}
                      onChange={(e) => setUnassignedOnly(e.target.checked)}
                      className="rounded text-forest-600 focus:ring-forest-500 h-3.5 w-3.5"
                    />
                    <label htmlFor="chkUnassigned" className="font-bold text-slate-600 cursor-pointer">Unassigned</label>
                  </div>
                </div>
              </div>

              {/* Bulk actions block */}
              {selectedTaskIds.length > 0 && (
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <span className="font-bold text-xs">{selectedTaskIds.length} tasks selected for bulk action</span>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="email" 
                      placeholder="Assignee email..." 
                      value={assigneeEmail}
                      onChange={(e) => setAssigneeEmail(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                    <button 
                      onClick={handleBulkAssign}
                      className="bg-forest-600 hover:bg-forest-700 text-white px-3.5 py-1 rounded text-xs font-bold transition"
                    >
                      Bulk Assign
                    </button>
                  </div>
                </div>
              )}

              {/* Work queue table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6 text-center w-12">
                        <input 
                          type="checkbox"
                          checked={selectedTaskIds.length === filteredQueue.length && filteredQueue.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTaskIds(filteredQueue.map(f => f.id || f._id));
                            else setSelectedTaskIds([]);
                          }}
                          className="rounded text-forest-600 h-3.5 w-3.5"
                        />
                      </th>
                      <th className="py-4 px-6">Task Item</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">Organization</th>
                      <th className="py-4 px-6">Assigned To</th>
                      <th className="py-4 px-6">Due Date</th>
                      <th className="py-4 px-6 text-center">SLA</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">No active work items match selected filters.</td>
                      </tr>
                    ) : (
                      filteredQueue.map(task => {
                        const taskId = task.id || task._id;
                        return (
                          <tr key={taskId} className="hover:bg-slate-50">
                            <td className="py-4 px-6 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedTaskIds.includes(taskId)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedTaskIds(prev => [...prev, taskId]);
                                  else setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
                                }}
                                className="rounded text-forest-600 h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800">{task.comments || `Resolution details for ${task.type}`}</td>
                            <td className="py-4 px-6 uppercase text-slate-400 font-semibold">{task.type}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                task.priority === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                              }`}>{task.priority}</span>
                            </td>
                            <td className="py-4 px-6 text-slate-600 font-semibold">{task.organization}</td>
                            <td className="py-4 px-6 text-slate-500 font-semibold">{task.assignedTo || 'Unassigned'}</td>
                            <td className="py-4 px-6 text-slate-400 font-semibold">{task.dueDate || 'None'}</td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                task.slaStatus === 'OVERDUE' ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' :
                                task.slaStatus === 'AT RISK' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>{task.slaStatus || 'ON TRACK'}</span>
                            </td>
                            <td className="py-4 px-6 text-center font-bold">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                                task.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                              }`}>{task.status}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex justify-center space-x-2">
                                <button 
                                  onClick={() => {
                                    setAssignTaskModalId(taskId);
                                    setAssigneeEmail(task.assignedTo || '');
                                    setAssigneeDueDate(task.dueDate || '');
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold transition text-[10px]"
                                >
                                  Assign
                                </button>
                                <button 
                                  onClick={() => setActiveTaskNoteId(taskId)}
                                  className="bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded font-bold transition text-[10px]"
                                >
                                  Notes
                                </button>
                                <button 
                                  onClick={() => setEscalateTaskId(taskId)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded font-bold transition text-[10px]"
                                >
                                  Escalate
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ORGANIZATIONS */}
          {activeTab === 'organizations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Operational Organizations</h4>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Registered On</th>
                      <th className="py-4 px-6 text-center">Operational Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgs.map(o => (
                      <tr key={o._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{o.name}</td>
                        <td className="py-4 px-6 text-slate-500">{o.createdAt}</td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => loadOrg360(o._id)}
                            className="bg-forest-600 hover:bg-forest-700 text-white px-3 py-1 rounded font-bold transition text-[10px] flex items-center space-x-1 mx-auto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View 360° Data</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Add Organization */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Building className="h-4.5 w-4.5 text-forest-600" />
                  <span>Onboard Organization</span>
                </h4>
                <form onSubmit={handleAddOrg} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Legal Entity Name</label>
                    <input
                      type="text"
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g. Zeta Corp"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Onboard Tenant</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 4. USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Operational User Profiles</h4>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Associated Org</th>
                      <th className="py-4 px-6 text-center">Assigned Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{u.name}</td>
                        <td className="py-4 px-6 text-slate-500">{u.email}</td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{u.organizationName || 'System'}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            u.role === 'PLATFORM_ADMIN' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Create User */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Users className="h-4.5 w-4.5 text-forest-600" />
                  <span>Manage User Profile</span>
                </h4>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g. user@comp.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Assign Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ESG_MANAGER">ESG MANAGER</option>
                        <option value="AUDITOR">AUDITOR</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Select Org</label>
                      <select
                        value={newUserOrgId}
                        onChange={(e) => setNewUserOrgId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        {orgs.map(o => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Create User Profile</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 5. APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Operational Submissions Approvals Queue</h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Submission Title</th>
                    <th className="py-4 px-6">Company</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Approvals Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workQueue.filter(q => q.type !== 'VERIFICATION').map(appr => {
                    const taskId = appr.id || appr._id;
                    return (
                      <tr key={taskId} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{appr.comments || `Approval request: ${appr.type}`}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{appr.organization}</td>
                        <td className="py-4 px-6 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                            appr.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>{appr.status}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {appr.status === 'PENDING' && (
                            <div className="flex justify-center space-x-2">
                              <button 
                                onClick={() => handleReviewSubmission(taskId, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded transition text-[10px]"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReviewSubmission(taskId, 'REJECTED')}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded transition text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. VERIFICATION & REVIEWS QUEUE */}
          {(activeTab === 'reviews' || activeTab === 'verification') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Verification Pool Evidence Queue</h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Verification Task</th>
                    <th className="py-4 px-6">Organization</th>
                    <th className="py-4 px-6">Assigned To</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workQueue.filter(q => q.type === 'VERIFICATION').map(doc => {
                    const taskId = doc.id || doc._id;
                    return (
                      <tr key={taskId} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{doc.comments || 'Evidence Verification Review'}</td>
                        <td className="py-4 px-6 uppercase text-slate-400 font-semibold">{doc.organization}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{doc.assignedTo || 'Unassigned'}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            doc.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>{doc.status}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {doc.status === 'PENDING' && (
                            <div className="flex justify-center space-x-2">
                              <button 
                                onClick={() => handleReviewSubmission(taskId, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px]"
                              >
                                Verify
                              </button>
                              <button 
                                onClick={() => handleReviewSubmission(taskId, 'REJECTED')}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. DATA QUALITY */}
          {activeTab === 'quality' && (
            <div className="space-y-6 text-slate-700 max-w-xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Data Quality Monitoring Metrics</h4>
                  <p className="text-slate-400 mt-0.5">Summary of platform anomalies</p>
                </div>
                <div className="p-4 bg-forest-50 border border-forest-100 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-forest-800">Actual Readings Ratio:</span>
                  <span className="font-black text-lg text-forest-900">96.2%</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="font-semibold text-slate-500">Unresolved Data Anomalies:</span>
                    <span className="font-bold text-slate-800">0 logs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-500">Compliance check status:</span>
                    <span className="font-bold text-forest-600">PASSED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. AI RISK MONITOR & ENVIRONMENTAL ALERTS */}
          {(activeTab === 'risk' || activeTab === 'alerts') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Environmental Threshold Violations Log</h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Severity</th>
                    <th className="py-4 px-6">Message Description</th>
                    <th className="py-4 px-6">Alert Entity</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workQueue.filter(q => q.type === 'ALERT').map(a => {
                    const taskId = a.id || a._id;
                    return (
                      <tr key={taskId} className="hover:bg-slate-50">
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            a.priority === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>{a.priority}</span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-800">{a.comments || 'System limit exceeded'}</td>
                        <td className="py-4 px-6 text-slate-400">{a.organization}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            a.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>{a.status}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {a.status === 'PENDING' && (
                            <button
                              onClick={() => handleReviewSubmission(taskId, 'APPROVED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded text-[10px]"
                            >
                              Resolve Issue
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 9. COMPLIANCE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-4">Operations Compliance Calendar Deadlines</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { name: 'GHG Verification Due', days: 2, status: 'AT RISK', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { name: 'Water Data Submission', days: 0, status: 'DUE TODAY', color: 'text-red-500', bg: 'bg-red-50' },
                  { name: 'ESG Report Submission', days: 8, status: 'UPCOMING', color: 'text-green-600', bg: 'bg-green-50' },
                  { name: 'Annual Compliance Report', days: -1, status: 'OVERDUE', color: 'text-red-600', bg: 'bg-red-100 animate-pulse' }
                ].map((cal, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${cal.bg} ${cal.color}`}>{cal.status}</span>
                      <h4 className="font-bold text-slate-800 mt-2 text-xs">{cal.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Days Remaining: {cal.days} days</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-xl mx-auto">
              <h4 className="font-bold text-slate-800 text-sm mb-4">Generate Operations Audits & Reports</h4>
              <button 
                onClick={handleExportLogs}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition w-full"
              >
                Export Platform CSV Logs
              </button>
            </div>
          )}

          {/* 11. SUPPORT */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Support Operations Center</h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Ticket Title</th>
                    <th className="py-4 px-6">Organization</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workQueue.filter(q => q.type === 'SUPPORT').map(ticket => {
                    const taskId = ticket.id || ticket._id;
                    return (
                      <tr key={taskId} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{ticket.comments}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{ticket.organization}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            ticket.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>{ticket.status}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {ticket.status === 'PENDING' && (
                            <button 
                              onClick={() => handleReviewSubmission(taskId, 'APPROVED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded text-[10px]"
                            >
                              Resolve Ticket
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 12. AUDIT ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Operational Log Activity Feed</h4>
                <button 
                  onClick={handleExportLogs}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3.5 rounded-xl transition"
                >
                  Export Logs
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">Operator User</th>
                      <th className="py-4 px-6">Action Details</th>
                      <th className="py-4 px-6">Module Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 text-slate-400 font-medium">{log.timestamp}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{log.user}</td>
                        <td className="py-4 px-6 font-semibold">{log.action}</td>
                        <td className="py-4 px-6 font-semibold text-forest-600">{log.module}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task assign modal */}
      {assignTaskModalId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Assign Operational Task</h4>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Verifier / Operator Email</label>
              <input 
                type="email" 
                placeholder="auditor@acme.com" 
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Due Date</label>
              <input 
                type="date" 
                value={assigneeDueDate}
                onChange={(e) => setAssigneeDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => setAssignTaskModalId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAssignTask(assignTaskModalId, assigneeEmail, assigneeDueDate)}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task notes modal */}
      {activeTaskNoteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Task Notes & Collaboration Trail</h4>
            
            <div className="max-h-48 overflow-y-auto space-y-2 border-b border-slate-100 pb-3">
              {(() => {
                const activeTask = workQueue.find(q => (q.id || q._id) === activeTaskNoteId);
                let notes = [];
                if (activeTask && activeTask.internalNotes) {
                  try {
                    notes = JSON.parse(activeTask.internalNotes);
                  } catch {
                    notes = [];
                  }
                }
                if (notes.length === 0) return <p className="text-slate-400 text-center py-4">No notes recorded.</p>;
                return notes.map((n, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold mb-1">
                      <span>{n.author}</span>
                      <span>{n.timestamp.split('T')[0]}</span>
                    </div>
                    <p className="text-slate-800 text-[10px]">{n.content}</p>
                  </div>
                ));
              })()}
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Add Note</label>
              <textarea 
                rows={3}
                placeholder="Write private operator notes..."
                value={newTaskNote}
                onChange={(e) => setNewTaskNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs"
              />
            </div>
            
            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => {
                  setActiveTaskNoteId(null);
                  setNewTaskNote('');
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition"
              >
                Close
              </button>
              <button 
                onClick={() => handleAddNote(activeTaskNoteId)}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl transition"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Escalation Modal */}
      {escalateTaskId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <span>Escalate to Super Admin</span>
            </h4>
            <form onSubmit={handleEscalateTask} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Escalation Reason</label>
                <select 
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs font-semibold"
                >
                  <option value="SLA_BREACH">SLA SLA Breach</option>
                  <option value="AUTHORITY_LIMIT">Authority Limits Exceeded</option>
                  <option value="COMPLIANCE_DISPUTE">Compliance Verification Dispute</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Priority</label>
                <select 
                  value={escalationPriority}
                  onChange={(e) => setEscalationPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs font-semibold"
                >
                  <option value="HIGH">HIGH PRIORITY</option>
                  <option value="CRITICAL">CRITICAL PRIORITY</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2">Description & Context</label>
                <textarea 
                  rows={4}
                  required
                  value={escalationDesc}
                  onChange={(e) => setEscalationDesc(e.target.value)}
                  placeholder="Provide supporting logs and requested actions details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-xs"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEscalateTaskId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition shadow"
                >
                  Submit Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization 360° Detailed modal view */}
      {org360Id && org360Data && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden">
            {/* Header branding */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Organization 360° Roster Details</span>
                <h3 className="text-base font-black">{org360Data.organization.name}</h3>
              </div>
              <button 
                onClick={() => {
                  setOrg360Id(null);
                  setOrg360Data(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Inner sub tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 py-2 gap-1 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'users', name: 'Users Roster' },
                { id: 'data', name: 'Environmental Data' },
                { id: 'submissions', name: 'Submissions' },
                { id: 'activity', name: 'Timeline feed' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveOrg360Tab(sub.id)}
                  className={`px-3 py-1.5 rounded font-bold text-xs transition ${
                    activeOrg360Tab === sub.id ? 'bg-forest-600 text-white shadow' : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>

            {/* Inner detailed view contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeOrg360Tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Estimated Emissions</p>
                      <h3 className="text-lg font-black mt-1 text-slate-800">{org360Data.metrics.totalEmissions} tons CO2e</h3>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Credits Issued</p>
                      <h3 className="text-lg font-black mt-1 text-slate-800">{org360Data.metrics.creditsGenerated} credits</h3>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Compliance Score</p>
                      <h3 className="text-lg font-black mt-1 text-forest-600">{org360Data.metrics.complianceScore}</h3>
                    </div>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-xl bg-green-50 border-green-100">
                    <h4 className="font-bold text-green-900 text-xs mb-1">Compliance Check status: PASSED</h4>
                    <p className="text-green-800 text-[10px]">All necessary verification files and submissions have been verified by third-party auditors.</p>
                  </div>
                </div>
              )}

              {activeOrg360Tab === 'users' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org360Data.users.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">No users registered for this organization.</td>
                      </tr>
                    ) : (
                      org360Data.users.map(u => (
                        <tr key={u._id} className="border-b border-slate-100">
                          <td className="py-2.5 px-4 font-bold text-slate-800">{u.name}</td>
                          <td className="py-2.5 px-4 text-slate-500">{u.email}</td>
                          <td className="py-2.5 px-4 text-slate-400 uppercase font-semibold">{u.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeOrg360Tab === 'data' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs">Environmental Projects Register</h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                        <th className="py-2.5 px-4">Project Name</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Methodology</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org360Data.projects.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">No environmental data or projects recorded.</td>
                        </tr>
                      ) : (
                        org360Data.projects.map(p => (
                          <tr key={p._id} className="border-b border-slate-100">
                            <td className="py-2.5 px-4 font-bold text-slate-800">{p.name}</td>
                            <td className="py-2.5 px-4 text-slate-500">{p.location}</td>
                            <td className="py-2.5 px-4 text-slate-400 font-semibold">{p.methodology}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase">{p.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeOrg360Tab === 'submissions' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-2.5 px-4">Approval ID</th>
                      <th className="py-2.5 px-4">Submission Request</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org360Data.approvals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">No submission records in queue.</td>
                      </tr>
                    ) : (
                      org360Data.approvals.map(app => (
                        <tr key={app._id} className="border-b border-slate-100">
                          <td className="py-2.5 px-4 text-slate-400 font-medium">{app._id}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{app.comments || `Resolution details for ${app.type}`}</td>
                          <td className="py-2.5 px-4">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-bold">{app.priority}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[8px] font-bold uppercase">{app.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeOrg360Tab === 'activity' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs font-bold uppercase">Audit Activity Timeline</h4>
                  <div className="space-y-3">
                    {[
                      { action: 'GHG Submission Reviewed', timestamp: new Date().toISOString() },
                      { action: 'Onboarding completed', timestamp: org360Data.organization.createdAt }
                    ].map((act, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-slate-400"> by System operator</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{act.timestamp.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center z-50 p-4 pt-[15vh]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center space-x-2.5">
              <Search className="h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search command palette or filters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-slate-800"
                autoFocus
              />
            </div>
            <div className="p-2 max-h-60 overflow-y-auto space-y-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3.5 py-2">Quick Navigation Commands</div>
              {[
                { name: 'View My Pending Work', action: () => applySavedView({ assignedTo: user?.email, status: 'PENDING' }) },
                { name: 'Onboard New Organization', action: () => setActiveTab('organizations') },
                { name: 'Manage System Users', action: () => setActiveTab('users') },
                { name: 'Review Submission Approvals', action: () => setActiveTab('approvals') },
                { name: 'Compliance Deadlines Calendar', action: () => setActiveTab('calendar') },
                { name: 'System Audits Logs Reports', action: () => setActiveTab('reports') }
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    cmd.action();
                    setShowCommandPalette(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                >
                  {cmd.name}
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button 
                onClick={() => setShowCommandPalette(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Press ESC to close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
