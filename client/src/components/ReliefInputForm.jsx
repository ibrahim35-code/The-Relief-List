import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ReliefInputForm({ onAddEntry, onBulkAdd, onLoadBenchmark, entriesCount }) {
  const [activeTab, setActiveTab] = useState('union_council'); // 'union_council' | 'own_survey' | 'partner_org' | 'quick_import'

  // Union Council Form State
  const [ucName, setUcName] = useState('');
  const [ucAge, setUcAge] = useState('');
  const [ucVillage, setUcVillage] = useState('Char Para');
  const [ucFathersName, setUcFathersName] = useState('');
  const [ucNotes, setUcNotes] = useState('');

  // Own Survey Form State
  const [osName, setOsName] = useState('');
  const [osAge, setOsAge] = useState('');
  const [osVillage, setOsVillage] = useState('Charpara');
  const [osFamilyMembers, setOsFamilyMembers] = useState('5');
  const [osNotes, setOsNotes] = useState('');
  const [osFathersName, setOsFathersName] = useState('');

  // Partner Org Form State
  const [poName, setPoName] = useState('');
  const [poVillage, setPoVillage] = useState('Char Para');
  const [poSpouse, setPoSpouse] = useState('');
  const [poAge, setPoAge] = useState('');
  const [poOrgName, setPoOrgName] = useState('Red Crescent Relief');
  const [poNotes, setPoNotes] = useState('');
  const [poFathersName, setPoFathersName] = useState('');

  // Quick Paste State
  const [rawText, setRawText] = useState('');
  const [quickSource, setQuickSource] = useState('union_council');

  // Submit Union Council
  const handleSubmitUC = (e) => {
    e.preventDefault();
    if (!ucName.trim() || !ucVillage.trim()) {
      toast.error('Name and Village/Location are required');
      return;
    }
    onAddEntry({
      source_list: 'union_council',
      name: ucName.trim(),
      age: ucAge ? parseInt(ucAge, 10) : null,
      village: ucVillage.trim(),
      family_members: 1,
      spouse_name: '',
      fathers_name: ucFathersName.trim(),
      notes: ucNotes.trim() || 'Union Council Register Entry',
      raw_entry: `${ucName.trim()}${ucAge ? `, ${ucAge}` : ''}, ${ucVillage.trim()}`,
    });
    setUcName('');
    setUcAge('');
    setUcFathersName('');
    setUcNotes('');
    toast.success('Union Council entry added!');
  };

  // Submit Own Survey
  const handleSubmitOS = (e) => {
    e.preventDefault();
    if (!osName.trim() || !osVillage.trim()) {
      toast.error('Name and Village/Location are required');
      return;
    }
    onAddEntry({
      source_list: 'own_survey',
      name: osName.trim(),
      age: osAge ? parseInt(osAge, 10) : null,
      village: osVillage.trim(),
      family_members: osFamilyMembers ? parseInt(osFamilyMembers, 10) : 1,
      spouse_name: '',
      fathers_name: osFathersName.trim(),
      notes: osNotes.trim() || 'Volunteer Survey Entry',
      raw_entry: `${osName.trim()}${osAge ? `, ${osAge}` : ''}, ${osVillage.trim()}${osFamilyMembers ? `, ${osFamilyMembers} members` : ''}`,
    });
    setOsName('');
    setOsAge('');
    setOsFamilyMembers('5');
    setOsFathersName('');
    setOsNotes('');
    toast.success('Own Survey entry added!');
  };

  // Submit Partner Org
  const handleSubmitPO = (e) => {
    e.preventDefault();
    if (!poName.trim() || !poVillage.trim()) {
      toast.error('Name and Village/Location are required');
      return;
    }
    onAddEntry({
      source_list: 'partner_org',
      name: poName.trim(),
      age: poAge ? parseInt(poAge, 10) : null,
      village: poVillage.trim(),
      family_members: 2,
      spouse_name: poSpouse.trim(),
      fathers_name: poFathersName.trim(),
      notes: `${poOrgName ? `[${poOrgName}] ` : ''}${poNotes.trim()}`,
      raw_entry: `${poName.trim()}, ${poVillage.trim()}${poSpouse ? `, wife ${poSpouse}` : ''}`,
    });
    setPoName('');
    setPoSpouse('');
    setPoAge('');
    setPoFathersName('');
    setPoNotes('');
    toast.success('Partner Org entry added!');
  };

  // Parse & Import Raw Lines
  const handleParseRawText = (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      toast.error('Please paste or write lines to import');
      return;
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];

    lines.forEach(line => {
      // Clean leading source labels if pasted like "Union council : Md. Abdul Karim, 45, Char Para"
      let src = quickSource;
      let cleanLine = line;

      if (/^union\s*council\s*[:\-]/i.test(line)) {
        src = 'union_council';
        cleanLine = line.replace(/^union\s*council\s*[:\-]/i, '').trim();
      } else if (/^own\s*survey\s*[:\-]/i.test(line)) {
        src = 'own_survey';
        cleanLine = line.replace(/^own\s*survey\s*[:\-]/i, '').trim();
      } else if (/^partner\s*(org|organisation)\s*[:\-]/i.test(line)) {
        src = 'partner_org';
        cleanLine = line.replace(/^partner\s*(org|organisation)\s*[:\-]/i, '').trim();
      }

      const parts = cleanLine.split(',').map(p => p.trim());
      const name = parts[0] || 'Unknown';
      let age = null;
      let village = 'Char Para';
      let members = 1;
      let spouse = '';

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (/^\d+$/.test(p)) {
          age = parseInt(p, 10);
        } else if (/(\d+)\s*members?/i.test(p)) {
          const match = p.match(/(\d+)\s*members?/i);
          if (match) members = parseInt(match[1], 10);
        } else if (/^(wife|husband|spouse)\s+(.*)/i.test(p)) {
          const match = p.match(/^(wife|husband|spouse)\s+(.*)/i);
          if (match) spouse = match[2];
        } else if (p.toLowerCase().includes('para') || p.toLowerCase().includes('village') || p.toLowerCase().includes('ward')) {
          village = p;
        } else if (!village || village === 'Char Para') {
          village = p;
        }
      }

      parsed.push({
        source_list: src,
        name,
        age,
        village,
        family_members: members,
        spouse_name: spouse,
        fathers_name: '',
        notes: `Imported from pasted text: "${cleanLine}"`,
        raw_entry: cleanLine,
      });
    });

    if (parsed.length > 0) {
      onBulkAdd(parsed);
      setRawText('');
      toast.success(`Imported ${parsed.length} entries from text!`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header & Benchmark quick load */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Assessment Data Input
            </span>
            <span className="text-xs text-slate-300">
              Active Entries: <strong className="text-white">{entriesCount.total}</strong> ({entriesCount.uc} UC, {entriesCount.os} Survey, {entriesCount.po} Partner)
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
            Relief Source Lists Input
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Input data from the three distinct sources described in the assessment: <strong>Union Council</strong>, <strong>Own Survey</strong>, and <strong>Partner Organisation</strong>.
          </p>
        </div>

        {/* Benchmark 1-Click Load Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadBenchmark}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load Assessment Scenario
          </button>
        </div>
      </div>

      {/* Source Selection Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 pt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('union_council')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'union_council'
              ? 'bg-white text-indigo-700 border-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>1. Union Council Register</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
            {entriesCount.uc}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('own_survey')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'own_survey'
              ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>2. Own Survey (Volunteers)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
            {entriesCount.os}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('partner_org')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'partner_org'
              ? 'bg-white text-purple-700 border-purple-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>3. Partner Organisation</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
            {entriesCount.po}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quick_import')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'quick_import'
              ? 'bg-white text-amber-700 border-amber-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 border-transparent'
          }`}
        >
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Batch / Raw Text Import</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {/* TAB 1: UNION COUNCIL */}
        {activeTab === 'union_council' && (
          <form onSubmit={handleSubmitUC} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-blue-900">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                UC
              </div>
              <div>
                <strong>Union Council Register Criteria:</strong> Official government roster format.
                <div className="mt-0.5 text-blue-800 font-mono text-[11px]">
                  Example from image: <code>Md. Abdul Karim, 45, Char Para</code>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beneficiary Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Abdul Karim"
                  value={ucName}
                  onChange={(e) => setUcName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 45"
                  value={ucAge}
                  onChange={(e) => setUcAge(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Para <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Char Para"
                  value={ucVillage}
                  onChange={(e) => setUcVillage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name (Optional field verification note)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Rafiq Karim (Not in original list, but can be recorded)"
                  value={ucFathersName}
                  onChange={(e) => setUcFathersName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Register Serial / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward 4 register page 12"
                  value={ucNotes}
                  onChange={(e) => setUcNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Union Council Register
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: OWN SURVEY */}
        {activeTab === 'own_survey' && (
          <form onSubmit={handleSubmitOS} className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-emerald-900">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                OS
              </div>
              <div>
                <strong>Own Survey Criteria:</strong> Field survey conducted by Ruma's volunteers with household size.
                <div className="mt-0.5 text-emerald-800 font-mono text-[11px]">
                  Example from image: <code>Abdul Korim Mia, 47, Charpara, 5 members</code>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beneficiary Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdul Korim Mia"
                  value={osName}
                  onChange={(e) => setOsName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 47"
                  value={osAge}
                  onChange={(e) => setOsAge(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Family Members Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  placeholder="e.g. 5"
                  value={osFamilyMembers}
                  onChange={(e) => setOsFamilyMembers(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Para <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charpara"
                  value={osVillage}
                  onChange={(e) => setOsVillage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name (Optional / If verified)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Father's name if asked during survey"
                  value={osFathersName}
                  onChange={(e) => setOsFathersName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Volunteer Observations &amp; Damage Status
                </label>
                <input
                  type="text"
                  placeholder="e.g. Riverbank flooded, house submerged"
                  value={osNotes}
                  onChange={(e) => setOsNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Own Volunteer Survey
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PARTNER ORGANISATION */}
        {activeTab === 'partner_org' && (
          <form onSubmit={handleSubmitPO} className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-purple-900">
              <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                PO
              </div>
              <div>
                <strong>Partner Organisation Criteria:</strong> Relief NGO roster, commonly recording spouse/household relation.
                <div className="mt-0.5 text-purple-800 font-mono text-[11px]">
                  Example from image: <code>A. Karim, Char Para, wife Rahima</code>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beneficiary Name (or Initial) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A. Karim"
                  value={poName}
                  onChange={(e) => setPoName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Para <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Char Para"
                  value={poVillage}
                  onChange={(e) => setPoVillage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spouse / Household Contact (Key Criteria)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahima (Wife)"
                  value={poSpouse}
                  onChange={(e) => setPoSpouse(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Partner Organization Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Red Crescent / Local NGO"
                  value={poOrgName}
                  onChange={(e) => setPoOrgName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 46 (if available)"
                  value={poAge}
                  onChange={(e) => setPoAge(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Father's name"
                  value={poFathersName}
                  onChange={(e) => setPoFathersName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Partner Org List
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: QUICK / RAW TEXT IMPORT */}
        {activeTab === 'quick_import' && (
          <form onSubmit={handleParseRawText} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
              <strong>Bulk Import Parser:</strong> Paste rows copied from lists or spreadsheets. You can prefix lines with <code>Union council : </code>, <code>Own survey : </code>, or <code>Partner org : </code>, or choose a default target source below.
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold text-slate-700">
                Default Source for Unlabeled Lines:
              </label>
              <select
                value={quickSource}
                onChange={(e) => setQuickSource(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="union_council">Union Council Register</option>
                <option value="own_survey">Own Survey (Volunteers)</option>
                <option value="partner_org">Partner Organisation</option>
              </select>
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste lines here, for example:&#10;Union council : Md. Abdul Karim, 45, Char Para&#10;Own survey : Abdul Korim Mia, 47, Charpara, 5 members&#10;Partner org : A. Karim, Char Para, wife Rahima"
              className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Parse &amp; Import Lines
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
