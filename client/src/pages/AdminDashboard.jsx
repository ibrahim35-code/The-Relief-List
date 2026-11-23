import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const INTAKE_CHANNELS = [
  { id: 'All', label: 'All Methods (Union, Survey, Partner)', code: 'all' },
  { id: 'Union Council', label: 'Union Council (Method: Union)', code: 'union' },
  { id: 'Volunteer Survey', label: 'Volunteer Survey (Method: Survey)', code: 'survey' },
  { id: 'Partner Organization', label: 'Partner Organization (Method: Partner)', code: 'partner' },
];

const STATUS_LIST = [
  'All',
  'Pending',
  'Approved',
  'In Progress',
  'Dispatched',
  'Completed',
  'Rejected',
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    bySource: {
      unionCouncil: 0,
      volunteerSurvey: 0,
      partnerOrganization: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterChannel, setFilterChannel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [inspectRequest, setInspectRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [statusModalRequest, setStatusModalRequest] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'Approved', adminNotes: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch all requests and metrics
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterChannel !== 'All') params.sourceType = filterChannel;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (search.trim()) params.search = search.trim();

      const [reqRes, statsRes] = await Promise.all([
        api.get('/relief/all', { params }),
        api.get('/relief/stats'),
      ]);

      if (reqRes.data?.success) {
        setRequests(reqRes.data.data || []);
      }
      if (statsRes.data?.success) {
        setMetrics(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('Failed to load relief submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [filterChannel, filterStatus]);

  // Search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAdminData();
  };

  // Status Change Submit
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalRequest) return;

    setIsProcessing(true);
    try {
      const res = await api.patch(`/relief/${statusModalRequest.id}/status`, {
        status: statusForm.status,
        adminNotes: statusForm.adminNotes,
      });

      if (res.data?.success) {
        toast.success(`Request marked as ${statusForm.status}`);
        setStatusModalRequest(null);
        loadAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Full Edit Submit
  const handleFullEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    setIsProcessing(true);
    try {
      const payload = {
        sourceType: editingRequest.source_type,
        name: editingRequest.beneficiary_name,
        beneficiaryName: editingRequest.beneficiary_name,
        age: editingRequest.age,
        familyMembers: editingRequest.family_members,
        wifeName: editingRequest.wife_name,
        address: editingRequest.address,
        status: editingRequest.status,
        adminNotes: editingRequest.admin_notes,
      };

      const res = await api.put(`/relief/${editingRequest.id}`, payload);
      if (res.data?.success) {
        toast.success('Record modified successfully.');
        setEditingRequest(null);
        loadAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to modify record.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Request Submit
  const handleDeleteSubmit = async () => {
    if (!deleteConfirmId) return;

    setIsProcessing(true);
    try {
      const res = await api.delete(`/relief/${deleteConfirmId}`);
      if (res.data?.success) {
        toast.success('Record deleted successfully.');
        setDeleteConfirmId(null);
        loadAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const getSourceMeta = (source) => {
    const s = (source || '').toLowerCase();
    if (s.includes('union')) {
      return {
        label: 'Union Council',
        methodName: 'Union',
        icon: '🏛️',
        badge: 'bg-blue-100 text-blue-900 border-blue-300',
        subBadge: 'bg-blue-600 text-white',
        formatDesc: 'Name, Age, Address',
        expectedFields: ['Name', 'Age', 'Address'],
      };
    }
    if (s.includes('partner')) {
      return {
        label: 'Partner Organization',
        methodName: 'Partner',
        icon: '🤝',
        badge: 'bg-purple-100 text-purple-900 border-purple-300',
        subBadge: 'bg-purple-600 text-white',
        formatDesc: 'Name, Address, Wife Name',
        expectedFields: ['Name', 'Address', 'Wife Name'],
      };
    }
    return {
      label: 'Volunteer Survey',
      methodName: 'Survey',
      icon: '📋',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      subBadge: 'bg-emerald-600 text-white',
      formatDesc: 'Name, Age, Total Family Members, Address',
      expectedFields: ['Name', 'Age', 'Total Family Members', 'Address'],
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Dispatched':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Approved':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const unionCount = metrics.bySource?.unionCouncil || 0;
  const surveyCount = metrics.bySource?.volunteerSurvey || 0;
  const partnerCount = metrics.bySource?.partnerOrganization || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">
                Relief Management System
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Admin Control Center
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              Admin (Full Access)
            </span>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all 3 input methods</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-black text-amber-800 mt-1">{metrics.pending}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">Awaiting admin verification</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-sm">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Active Operations</div>
            <div className="text-2xl font-black text-indigo-800 mt-1">{metrics.active}</div>
            <div className="text-[11px] text-indigo-600 mt-0.5">Approved / Dispatched</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{metrics.completed}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Relief distributed</div>
          </div>
        </div>

        {/* Input Methods Breakdown & Quick Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Data Input Methods (Union, Survey, Partner)
              </h2>
              <p className="text-xs text-slate-500">
                Click any card to isolate and inspect data inputted from that specific method.
              </p>
            </div>
            {filterChannel !== 'All' && (
              <button
                onClick={() => setFilterChannel('All')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Clear filter (Show all {metrics.total})</span>
                <span className="font-bold">✕</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Union Council Method */}
            <div
              onClick={() => setFilterChannel(filterChannel === 'Union Council' ? 'All' : 'Union Council')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                filterChannel === 'Union Council'
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🏛️</span>
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">
                      Union Council
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">
                      Method: Union
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-900">{unionCount}</span>
                  <span className="text-[10px] text-blue-700 block font-semibold">
                    {metrics.total > 0 ? `${Math.round((unionCount / metrics.total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Inputted Data Format:</span>
                <span className="font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded">
                  Name • Age • Address
                </span>
              </div>
            </div>

            {/* 2. Volunteer Survey Method */}
            <div
              onClick={() => setFilterChannel(filterChannel === 'Volunteer Survey' ? 'All' : 'Volunteer Survey')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                filterChannel === 'Volunteer Survey'
                  ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📋</span>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Volunteer Survey
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                      Method: Survey
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-900">{surveyCount}</span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    {metrics.total > 0 ? `${Math.round((surveyCount / metrics.total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Inputted Data Format:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  Name • Age • Family Members • Address
                </span>
              </div>
            </div>

            {/* 3. Partner Organization Method */}
            <div
              onClick={() => setFilterChannel(filterChannel === 'Partner Organization' ? 'All' : 'Partner Organization')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                filterChannel === 'Partner Organization'
                  ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🤝</span>
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">
                      Partner Organization
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-600 text-white">
                      Method: Partner
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-purple-900">{partnerCount}</span>
                  <span className="text-[10px] text-purple-700 block font-semibold">
                    {metrics.total > 0 ? `${Math.round((partnerCount / metrics.total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Inputted Data Format:</span>
                <span className="font-bold text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded">
                  Name • Address • Wife Name
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Context Banner */}
        {filterChannel !== 'All' && (
          <div className="mb-6 p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getSourceMeta(filterChannel).icon}</span>
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>Filtered by Method:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-100 text-indigo-800">
                    {filterChannel} (Method: {getSourceMeta(filterChannel).methodName})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Showing only data inputted using the <strong>{filterChannel}</strong> template. Expected fields: <strong>{getSourceMeta(filterChannel).formatDesc}</strong>.
                </div>
              </div>
            </div>
            <button
              onClick={() => setFilterChannel('All')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Show All Methods
            </button>
          </div>
        )}

        {/* Control & Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Beneficiary Records &amp; Input Methods</h2>
                <p className="text-xs text-slate-500">
                  Track which data fields were collected from which intake method (Union, Survey, Partner) with full edit and verification controls.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdminData}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Quick Method Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter by Method:</span>
              <button
                type="button"
                onClick={() => setFilterChannel('All')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterChannel === 'All'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Methods ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterChannel('Union Council')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterChannel === 'Union Council'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>🏛️ Union Council (Union)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
                  {unionCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterChannel('Volunteer Survey')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterChannel === 'Volunteer Survey'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>📋 Volunteer Survey (Survey)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
                  {surveyCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterChannel('Partner Organization')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterChannel === 'Partner Organization'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <span>🤝 Partner Org (Partner)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
                  {partnerCount}
                </span>
              </button>
            </div>

            {/* Filter Toolbar */}
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Intake Method Selector
                </label>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white font-medium"
                >
                  {INTAKE_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status Filter</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Search (Name, Address, Wife, Method)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Search union, survey, partner, name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 cursor-pointer"
                  >
                    Go
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading records...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <div className="text-3xl mb-2">🔍</div>
              No matching records found for the selected method or filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3.5">ID &amp; Input Method</th>
                    <th className="py-3 px-3.5">Beneficiary Name</th>
                    <th className="py-3 px-3.5">Method-Specific Inputted Data</th>
                    <th className="py-3 px-3.5">Address / Village</th>
                    <th className="py-3 px-3.5">Recorded By</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => {
                    const meta = getSourceMeta(req.source_type);
                    const isUnion = meta.methodName === 'Union';
                    const isSurvey = meta.methodName === 'Survey';
                    const isPartner = meta.methodName === 'Partner';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. ID & Input Method with prominent indicator */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-mono text-slate-400 text-[10px]">#{req.id}</div>
                          <div className="mt-1 flex flex-col items-start gap-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${meta.badge}`}>
                              <span>{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${meta.subBadge}`}>
                              Method: {meta.methodName}
                            </span>
                          </div>
                        </td>

                        {/* 2. Beneficiary Name */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900 text-sm">
                            {req.beneficiary_name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {req.category || 'Food Supplies'}
                          </div>
                        </td>

                        {/* 3. Method-Specific Inputted Data */}
                        <td className="py-3.5 px-3.5 text-slate-700">
                          {isUnion && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Age
                                </span>
                                <strong className="text-slate-900 font-bold">{req.age ? `${req.age} yrs` : '—'}</strong>
                              </div>
                              <div className="text-[10px] text-slate-400 italic">
                                Format: Name, Age, Address
                              </div>
                            </div>
                          )}

                          {isSurvey && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Age
                                </span>
                                <strong className="text-slate-900 font-bold">{req.age ? `${req.age} yrs` : '—'}</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Family Members
                                </span>
                                <span className="px-2 py-0.2 rounded font-extrabold bg-emerald-100 text-emerald-900">
                                  {req.family_members ?? '1'} members
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 italic">
                                Format: Name, Age, Family Members, Address
                              </div>
                            </div>
                          )}

                          {isPartner && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  Wife Name
                                </span>
                                <span className="font-extrabold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                                  {req.wife_name || '—'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 italic">
                                Format: Name, Address, Wife Name
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 4. Address */}
                        <td className="py-3.5 px-3.5 text-slate-600 max-w-xs">
                          <div className="font-semibold text-slate-800">{req.address}</div>
                          {req.location && req.location !== req.address && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{req.location}</div>
                          )}
                        </td>

                        {/* 5. Recorded By */}
                        <td className="py-3.5 px-3.5 text-slate-600">
                          <div className="font-medium text-slate-800">{req.submitted_by_name || 'System'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{req.submitted_by_email || '—'}</div>
                        </td>

                        {/* 6. Status */}
                        <td className="py-3.5 px-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                          {req.admin_notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[150px] truncate" title={req.admin_notes}>
                              Note: {req.admin_notes}
                            </div>
                          )}
                        </td>

                        {/* 7. Admin Actions */}
                        <td className="py-3.5 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Inspect Details Button */}
                            <button
                              onClick={() => setInspectRequest(req)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                              title="Inspect Method & Inputted Data"
                            >
                              <span>🔍</span>
                              <span>Inspect</span>
                            </button>

                            {/* Quick Status Button */}
                            <button
                              onClick={() => {
                                setStatusModalRequest(req);
                                setStatusForm({ status: req.status, adminNotes: req.admin_notes || '' });
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                              title="Update Status"
                            >
                              Status
                            </button>

                            {/* Full Edit Button */}
                            <button
                              onClick={() => setEditingRequest({ ...req })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-semibold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                              title="Edit record"
                            >
                              Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmId(req.id)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                              title="Delete record"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* INSPECT METHOD & DATA MODAL (ADMIN ONLY) */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getSourceMeta(inspectRequest.source_type).icon}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Input Method Details: #{inspectRequest.id}
                  </h3>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getSourceMeta(inspectRequest.source_type).subBadge}`}>
                    Method: {getSourceMeta(inspectRequest.source_type).methodName} ({getSourceMeta(inspectRequest.source_type).label})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Method Format Specification Card */}
            <div className={`p-4 rounded-xl border mb-4 ${getSourceMeta(inspectRequest.source_type).badge}`}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1">
                Method Specification Rule:
              </div>
              <div className="text-xs font-semibold">
                Inputted via: <strong>{inspectRequest.source_type}</strong>
              </div>
              <div className="text-[11px] mt-1">
                Expected Format: <strong>{getSourceMeta(inspectRequest.source_type).formatDesc}</strong>
              </div>
            </div>

            {/* Field-by-Field Input Breakdown */}
            <div className="space-y-3 text-xs mb-5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Beneficiary Name</div>
                <div className="text-sm font-bold text-slate-900">{inspectRequest.beneficiary_name}</div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Age */}
                <div className={`p-3 rounded-xl border ${
                  getSourceMeta(inspectRequest.source_type).methodName === 'Union' || getSourceMeta(inspectRequest.source_type).methodName === 'Survey'
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Age
                  </div>
                  <div className="font-bold text-slate-900">
                    {inspectRequest.age ? `${inspectRequest.age} yrs` : (
                      <span className="text-slate-400 italic text-[11px]">Not collected</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {getSourceMeta(inspectRequest.source_type).methodName === 'Partner' ? 'N/A for Partner' : 'In method format'}
                  </div>
                </div>

                {/* Family Members */}
                <div className={`p-3 rounded-xl border ${
                  getSourceMeta(inspectRequest.source_type).methodName === 'Survey'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Family Members
                  </div>
                  <div className="font-bold text-slate-900">
                    {inspectRequest.family_members ? `${inspectRequest.family_members} members` : (
                      <span className="text-slate-400 italic text-[11px]">Not collected</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {getSourceMeta(inspectRequest.source_type).methodName === 'Survey' ? 'In Survey format' : 'N/A for this method'}
                  </div>
                </div>

                {/* Wife Name */}
                <div className={`p-3 rounded-xl border ${
                  getSourceMeta(inspectRequest.source_type).methodName === 'Partner'
                    ? 'bg-purple-50/50 border-purple-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Wife Name
                  </div>
                  <div className="font-bold text-slate-900 truncate">
                    {inspectRequest.wife_name || (
                      <span className="text-slate-400 italic text-[11px]">Not collected</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {getSourceMeta(inspectRequest.source_type).methodName === 'Partner' ? 'In Partner format' : 'N/A for this method'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address / Village</div>
                <div className="text-xs font-semibold text-slate-800">{inspectRequest.address}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Submitted By:</span>
                  <span className="font-semibold text-slate-800">{inspectRequest.submitted_by_name || 'System'}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">{inspectRequest.submitted_by_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Current Status:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getStatusBadge(inspectRequest.status)}`}>
                    {inspectRequest.status}
                  </span>
                </div>
              </div>

              {inspectRequest.admin_notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">Admin Remarks</div>
                  <div className="text-xs text-amber-900 italic">{inspectRequest.admin_notes}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectRequest(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK STATUS UPDATE MODAL (ADMIN ONLY) */}
      {statusModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Update Status: #{statusModalRequest.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-semibold">
              Beneficiary: {statusModalRequest.beneficiary_name} ({statusModalRequest.source_type} - Method: {getSourceMeta(statusModalRequest.source_type).methodName})
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select New Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white font-medium"
                >
                  {STATUS_LIST.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrator Notes / Remarks</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Verified by administrative unit. Approved for distribution..."
                  value={statusForm.adminNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, adminNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalRequest(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Saving...' : 'Apply Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL RECORD MODIFICATION MODAL (ADMIN ONLY) */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Modify Record #{editingRequest.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Admin Edit: Modify beneficiary details according to format.
            </p>

            <form onSubmit={handleFullEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Input Method</label>
                  <select
                    value={editingRequest.source_type}
                    onChange={(e) => setEditingRequest({ ...editingRequest, source_type: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                  >
                    {INTAKE_CHANNELS.filter((c) => c.id !== 'All').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editingRequest.beneficiary_name || ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, beneficiary_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              {/* Conditional Format Fields */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age (Union &amp; Survey)</label>
                  <input
                    type="number"
                    min="1"
                    max="130"
                    placeholder="Union & Survey"
                    value={editingRequest.age ?? ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, age: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Family Members (Survey)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Survey only"
                    value={editingRequest.family_members ?? ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, family_members: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wife Name (Partner)</label>
                  <input
                    type="text"
                    placeholder="Partner only"
                    value={editingRequest.wife_name || ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, wife_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows="2"
                  required
                  value={editingRequest.address || ''}
                  onChange={(e) => setEditingRequest({ ...editingRequest, address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingRequest.status}
                  onChange={(e) => setEditingRequest({ ...editingRequest, status: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white font-medium"
                >
                  {STATUS_LIST.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={editingRequest.admin_notes || ''}
                  onChange={(e) => setEditingRequest({ ...editingRequest, admin_notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Saving Changes...' : 'Save Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (ADMIN ONLY) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to permanently delete relief record #{deleteConfirmId}?
            </p>
            <div className="flex justify-center gap-3 text-xs font-semibold">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="text-base font-bold text-slate-800 mb-2">Sign Out</h3>
            <p className="text-xs text-slate-500 mb-5">Sign out of administrator console?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
