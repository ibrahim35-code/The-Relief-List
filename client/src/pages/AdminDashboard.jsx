import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import ReliefInputForm from '../components/ReliefInputForm';
import ReliefReviewQueue from '../components/ReliefReviewQueue';
import MasterReliefList from '../components/MasterReliefList';
import {
  findDuplicateGroups,
  DEFAULT_BENCHMARK_DATA,
} from '../utils/matchingAlgorithm';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Active view section ('all' | 'input' | 'review' | 'roster')
  const [activeSection, setActiveSection] = useState('all');

  // Relief system state
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('the_relief_list_entries');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_BENCHMARK_DATA;
  });

  const [decisions, setDecisions] = useState(() => {
    const saved = localStorage.getItem('the_relief_list_decisions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('the_relief_list_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('the_relief_list_decisions', JSON.stringify(decisions));
  }, [decisions]);

  // Fetch backend data if available
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const [entriesRes, dupsRes] = await Promise.all([
          api.get('/relief/entries'),
          api.get('/relief/duplicates'),
        ]);

        if (entriesRes.data?.entries && entriesRes.data.entries.length > 0) {
          setEntries(entriesRes.data.entries);
        }
        if (dupsRes.data?.decisions) {
          setDecisions(dupsRes.data.decisions);
        }
      } catch (err) {}
    };

    fetchBackendData();
  }, []);

  const duplicateGroups = useMemo(() => {
    return findDuplicateGroups(entries, decisions);
  }, [entries, decisions]);

  const handleAddEntry = async (entryData) => {
    const newEntry = {
      ...entryData,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    setEntries(prev => [newEntry, ...prev]);
    try { await api.post('/relief/entries', entryData); } catch (e) {}
  };

  const handleBulkAdd = async (newEntries) => {
    const formatted = newEntries.map((e, idx) => ({
      ...e,
      id: Date.now() + idx,
      created_at: new Date().toISOString(),
    }));
    setEntries(prev => [...formatted, ...prev]);
    try { await api.post('/relief/bulk', { entries: newEntries }); } catch (e) {}
  };

  const handleLoadBenchmark = async () => {
    setEntries(DEFAULT_BENCHMARK_DATA);
    setDecisions({});
    localStorage.removeItem('the_relief_list_decisions');
    toast.success("Loaded Ruma's assessment benchmark scenario!");
    try { await api.post('/relief/reset-sample'); } catch (e) {}
  };

  const handleRecordDecision = async (decisionData) => {
    const updated = {
      ...decisions,
      [decisionData.group_signature]: {
        ...decisionData,
        updated_at: new Date().toISOString(),
      },
    };
    setDecisions(updated);
    try { await api.post('/relief/decide', decisionData); } catch (e) {}
  };

  const handleDeleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await api.delete(`/relief/entries/${id}`); } catch (e) {}
    toast.success('Entry removed');
  };

  const entriesCount = {
    total: entries.length,
    uc: entries.filter(e => e.source_list === 'union_council').length,
    os: entries.filter(e => e.source_list === 'own_survey').length,
    po: entries.filter(e => e.source_list === 'partner_org').length,
  };

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
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
                The Relief List
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                HQ Admin Control
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Admin
            </span>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-sm">
              HQ Administration
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Deduplication Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Relief Roster Coordination &amp; Duplicate Resolution
          </h1>

          <p className="mt-2 text-sm text-slate-300 max-w-3xl">
            Reconcile disparate beneficiary lists from the Union Council register, Volunteer Survey, and Partner Organisation with full explainability and fraud-prevention controls.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'all'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              All Sections
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('input')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'input'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Data Input ({entriesCount.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('review')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'review'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Review Queue ({duplicateGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('roster')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === 'roster'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Final Master List
            </button>
          </div>
        </div>

        {/* 1. DATA INPUT */}
        {(activeSection === 'all' || activeSection === 'input') && (
          <section id="input-section">
            <ReliefInputForm
              onAddEntry={handleAddEntry}
              onBulkAdd={handleBulkAdd}
              onLoadBenchmark={handleLoadBenchmark}
              entriesCount={entriesCount}
            />
          </section>
        )}

        {/* 2. DUPLICATE REVIEW QUEUE */}
        {(activeSection === 'all' || activeSection === 'review') && (
          <section id="review-section">
            <ReliefReviewQueue
              groups={duplicateGroups}
              onDecide={handleRecordDecision}
              onDeleteEntry={handleDeleteEntry}
            />
          </section>
        )}

        {/* 3. MASTER DISTRIBUTION ROSTER */}
        {(activeSection === 'all' || activeSection === 'roster') && (
          <section id="roster-section">
            <MasterReliefList
              entries={entries}
              decisions={decisions}
              duplicateGroups={duplicateGroups}
              onDeleteEntry={handleDeleteEntry}
            />
          </section>
        )}
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Confirm Logout</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to end your current session?
            </p>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
