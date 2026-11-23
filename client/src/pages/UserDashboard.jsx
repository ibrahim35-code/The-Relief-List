import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const INTAKE_OPTIONS = [
  {
    id: 'Union Council',
    title: 'Union Council',
    subtitle: 'Data Format: Name, Age, Address',
    desc: 'Local government & Union Parishad records. Format: Name, Age, and Address.',
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    cardBorder: 'hover:border-blue-500 hover:shadow-blue-100',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
    fieldsSummary: 'Name • Age • Address',
  },
  {
    id: 'Volunteer Survey',
    title: 'Volunteer Survey',
    subtitle: 'Data Format: Name, Age, Total Family Members, Address',
    desc: 'On-ground survey data. Format: Name, Age, Total Family Members, and Address.',
    icon: (
      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cardBorder: 'hover:border-emerald-500 hover:shadow-emerald-100',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    fieldsSummary: 'Name • Age • Total Family Members • Address',
  },
  {
    id: 'Partner Organization',
    title: 'Partner Organization',
    subtitle: 'Data Format: Name, Address, Wife Name',
    desc: 'Partner NGOs and charity agencies. Format: Name, Address, and Wife Name.',
    icon: (
      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    cardBorder: 'hover:border-purple-500 hover:shadow-purple-100',
    btnBg: 'bg-purple-600 hover:bg-purple-700',
    fieldsSummary: 'Name • Address • Wife Name',
  },
];

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('All');

  // Exact Form State (NO Category, Urgency, or Contact)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    familyMembers: '',
    wifeName: '',
    address: '',
  });

  // Fetch logged in user's requests
  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/relief/my');
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load user relief requests:', err);
      toast.error('Could not load your submissions.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Initiate submission for a selected intake channel
  const handleSelectIntake = (option) => {
    setSelectedIntake(option);
    setFormData({
      name: '',
      age: '',
      familyMembers: '',
      wifeName: '',
      address: '',
    });
    setShowSubmitModal(true);
  };

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit relief request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter the Name.');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Please enter the Address.');
      return;
    }

    if (selectedIntake.id === 'Union Council') {
      if (!formData.age) {
        toast.error('Age is required for Union Council data.');
        return;
      }
    } else if (selectedIntake.id === 'Volunteer Survey') {
      if (!formData.age) {
        toast.error('Age is required for Volunteer Survey.');
        return;
      }
      if (!formData.familyMembers) {
        toast.error('Total Family Members count is required for Volunteer Survey.');
        return;
      }
    } else if (selectedIntake.id === 'Partner Organization') {
      if (!formData.wifeName.trim()) {
        toast.error("Wife's name is required for Partner Organization data.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        sourceType: selectedIntake.id,
      };

      const res = await api.post('/relief', payload);
      if (res.data?.success) {
        toast.success(`Data recorded under ${selectedIntake.title}!`);
        setShowSubmitModal(false);
        if (res.data.data) {
          setRequests((prev) => [res.data.data, ...prev.filter(item => String(item.id) !== String(res.data.data.id))]);
        }
        fetchMyRequests();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit data.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logout handler
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Helpers
  const getSourceMeta = (source) => {
    const s = (source || '').toLowerCase();
    if (s.includes('union')) {
      return {
        label: 'Union Council',
        methodName: 'Union',
        icon: '🏛️',
        badge: 'bg-blue-100 text-blue-900 border-blue-300',
        subBadge: 'bg-blue-600 text-white',
      };
    }
    if (s.includes('partner')) {
      return {
        label: 'Partner Organization',
        methodName: 'Partner',
        icon: '🤝',
        badge: 'bg-purple-100 text-purple-900 border-purple-300',
        subBadge: 'bg-purple-600 text-white',
      };
    }
    return {
      label: 'Volunteer Survey',
      methodName: 'Survey',
      icon: '📋',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      subBadge: 'bg-emerald-600 text-white',
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

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const q = (searchFilter || '').trim().toLowerCase();
    const matchSearch =
      !q ||
      r.beneficiary_name?.toLowerCase().includes(q) ||
      r.address?.toLowerCase().includes(q) ||
      r.wife_name?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.source_type?.toLowerCase().includes(q);

    const matchChannel =
      channelFilter === 'All' ||
      r.source_type === channelFilter ||
      (channelFilter === 'Union Council' && (r.source_type || '').toLowerCase().includes('union')) ||
      (channelFilter === 'Volunteer Survey' && (r.source_type || '').toLowerCase().includes('survey')) ||
      (channelFilter === 'Partner Organization' && (r.source_type || '').toLowerCase().includes('partner'));

    return matchSearch && matchChannel;
  });

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
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                User Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              User (Input Only)
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
        {/* Banner with Policy Notice */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-indigo-100 mb-2 border border-white/20">
              Data Intake Channels
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Relief Beneficiary Intake
            </h1>
            <p className="mt-1 text-sm text-indigo-100 max-w-2xl">
              Select one of the 3 channels below to input data in its designated format. Regular users have input-only access; all modifications and approvals are managed by Administrators.
            </p>
          </div>
        </div>

        {/* 3 INTAKE OPTIONS CARDS */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Choose Data Intake Channel</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {INTAKE_OPTIONS.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelectIntake(option)}
                className={`bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${option.cardBorder} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {option.icon}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${option.badgeColor}`}>
                      {option.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{option.title}</h3>
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Exact Fields:</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">{option.fieldsSummary}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{option.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Click to Open &rarr;
                  </span>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md ${option.btnBg} transition-colors`}
                  >
                    Input Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Policy Notice */}
        <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Access Control Policy:</span> Users have <strong>Input-Only</strong> access to record information. All record edits, modifications, and status changes are restricted strictly to <strong>System Administrators</strong>.
          </div>
        </div>

        {/* User Submissions History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">My Input History</h2>
              <p className="text-xs text-slate-500">Read-only live tracker of your submitted records</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="All">All Channels</option>
                <option value="Union Council">Union Council</option>
                <option value="Volunteer Survey">Volunteer Survey</option>
                <option value="Partner Organization">Partner Organization</option>
              </select>

              <input
                type="text"
                placeholder="Search name, address..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3.5 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-indigo-500 w-52"
              />
              <button
                onClick={fetchMyRequests}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Refresh"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {loadingRequests ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading your records...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No submissions found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click any of the 3 cards above to input your first record.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Age / Members / Wife Name</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Admin Remarks</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getSourceMeta(req.source_type).badge}`}>
                            <span>{getSourceMeta(req.source_type).icon}</span>
                            <span>{getSourceMeta(req.source_type).label}</span>
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${getSourceMeta(req.source_type).subBadge}`}>
                            Method: {getSourceMeta(req.source_type).methodName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {req.beneficiary_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {req.source_type === 'Union Council' && (
                          <div>
                            <span className="text-slate-400">Age:</span> <strong className="text-slate-800">{req.age ?? '—'}</strong>
                          </div>
                        )}
                        {req.source_type === 'Volunteer Survey' && (
                          <div>
                            <div><span className="text-slate-400">Age:</span> <strong className="text-slate-800">{req.age ?? '—'}</strong></div>
                            <div><span className="text-slate-400">Family Members:</span> <strong className="text-emerald-700">{req.family_members ?? '—'}</strong></div>
                          </div>
                        )}
                        {req.source_type === 'Partner Organization' && (
                          <div>
                            <span className="text-slate-400">Wife Name:</span> <strong className="text-purple-700">{req.wife_name || '—'}</strong>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        {req.address}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                        {req.admin_notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* INPUT DATA MODAL: ONLY THE REQUESTED FIELDS */}
      {showSubmitModal && selectedIntake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${selectedIntake.badgeColor}`}>
                  {selectedIntake.title}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Input Data</h3>
                  <p className="text-[11px] text-slate-500">{selectedIntake.fieldsSummary}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              {/* 1. NAME (In all 3 forms) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* 2. AGE (In Union Council and Volunteer Survey) */}
              {(selectedIntake.id === 'Union Council' || selectedIntake.id === 'Volunteer Survey') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    min="1"
                    max="130"
                    required
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* 3. TOTAL FAMILY MEMBERS (Only in Volunteer Survey) */}
              {selectedIntake.id === 'Volunteer Survey' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Family Members <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="familyMembers"
                    min="1"
                    max="50"
                    required
                    placeholder="Enter total family members count"
                    value={formData.familyMembers}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 font-semibold text-emerald-800"
                  />
                </div>
              )}

              {/* 4. WIFE NAME (Only in Partner Organization) */}
              {selectedIntake.id === 'Partner Organization' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Wife Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="wifeName"
                    required
                    placeholder="Enter wife name"
                    value={formData.wifeName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              )}

              {/* 5. ADDRESS (In all 3 forms) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  rows="3"
                  required
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-white font-bold rounded-lg shadow-md ${selectedIntake.btnBg} disabled:opacity-50 cursor-pointer flex items-center gap-1.5`}
                >
                  {isSubmitting ? 'Submitting...' : `Submit Data`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="text-base font-bold text-slate-800 mb-2">Sign Out</h3>
            <p className="text-xs text-slate-500 mb-5">Are you sure you want to log out of your relief account?</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                {isLoggingOut ? 'Logging out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
