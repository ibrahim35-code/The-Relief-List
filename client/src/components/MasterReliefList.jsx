import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function MasterReliefList({ entries, decisions, duplicateGroups, onUpdateFatherName, onDeleteEntry }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'merged' | 'field_check' | 'separate'
  const [villageFilter, setVillageFilter] = useState('all');

  // Compute finalized roster
  // 1. Groups that are merged -> collapse into 1 resolved entry
  // 2. Entries in groups marked separate or without decision -> remain individual entries with badges
  // 3. Entries not in any duplicate group -> remain individual entries

  const mergedGroupSignatures = Object.keys(decisions).filter(k => decisions[k].decision_type === 'merge');
  const mergedEntryIdSet = new Set();
  const mergedRosterItems = [];

  mergedGroupSignatures.forEach(sig => {
    const dec = decisions[sig];
    const group = duplicateGroups.find(g => g.groupId === sig);
    if (group) {
      group.entries.forEach(e => mergedEntryIdSet.add(e.id));
      mergedRosterItems.push({
        isMerged: true,
        groupId: sig,
        name: dec.resolved_name || group.entries[0]?.name,
        age: dec.resolved_age || group.entries[0]?.age,
        village: dec.resolved_village || group.entries[0]?.village,
        family_members: dec.resolved_family_members || 1,
        spouse_name: dec.resolved_spouse || '',
        fathers_name: dec.resolved_fathers_name || '',
        status: 'Merged & Verified',
        sources: group.entries.map(e => e.source_list),
        notes: dec.notes || 'Consolidated duplicate from multiple lists',
        originalEntries: group.entries,
      });
    }
  });

  // Now process unmerged entries
  const standaloneRosterItems = [];
  entries.forEach(entry => {
    if (mergedEntryIdSet.has(entry.id)) return; // already merged

    // Check if it's in a separate or field_check group
    const parentGroup = duplicateGroups.find(g => g.entries.some(e => e.id === entry.id));
    const parentDecision = parentGroup ? decisions[parentGroup.groupId] : null;

    let status = 'Single Source';
    if (parentDecision?.decision_type === 'separate') {
      status = 'Separate Individual';
    } else if (parentDecision?.decision_type === 'field_check') {
      status = 'Pending Field Check';
    } else if (parentGroup) {
      status = 'Pending Decision';
    }

    standaloneRosterItems.push({
      isMerged: false,
      id: entry.id,
      groupId: parentGroup?.groupId || null,
      name: entry.name,
      age: entry.age,
      village: entry.village,
      family_members: entry.family_members || 1,
      spouse_name: entry.spouse_name || '',
      fathers_name: entry.fathers_name || parentDecision?.resolved_fathers_name || '',
      status,
      sources: [entry.source_list],
      notes: entry.notes || entry.raw_entry || '',
      originalEntries: [entry],
    });
  });

  const allFinalRoster = [...mergedRosterItems, ...standaloneRosterItems];

  // Filtering
  const filteredRoster = allFinalRoster.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.fathers_name && item.fathers_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'merged' && item.isMerged) ||
      (statusFilter === 'field_check' && item.status === 'Pending Field Check') ||
      (statusFilter === 'separate' && item.status === 'Separate Individual');

    const matchesVillage =
      villageFilter === 'all' || item.village.toLowerCase() === villageFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesVillage;
  });

  // Villages list
  const uniqueVillages = Array.from(new Set(allFinalRoster.map(i => i.village).filter(Boolean)));

  // Relief statistics
  const totalRaw = entries.length;
  const duplicatePackagesSaved = mergedRosterItems.reduce((acc, curr) => acc + (curr.originalEntries.length - 1), 0);
  const totalBeneficiaryFamilies = allFinalRoster.length;
  const pendingFieldChecks = allFinalRoster.filter(i => i.status === 'Pending Field Check').length;

  const exportCSV = () => {
    const headers = ['Serial', 'Beneficiary Name', "Father's Name", 'Age', 'Village / Para', 'Family Members', 'Spouse', 'Sources', 'Status', 'Notes'];
    const rows = filteredRoster.map((item, idx) => [
      idx + 1,
      `"${item.name}"`,
      `"${item.fathers_name || 'N/A'}"`,
      item.age || '',
      `"${item.village}"`,
      item.family_members,
      `"${item.spouse_name || ''}"`,
      `"${item.sources.join(' + ')}"`,
      `"${item.status}"`,
      `"${item.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `the_relief_list_final_distribution_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relief Distribution List exported to CSV!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Metric Counters Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200 bg-slate-50/80 divide-x divide-y lg:divide-y-0 divide-slate-200 text-center">
        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Raw Inputs
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalRaw}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across 3 source lists</div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Duplicate Packages Saved
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            +{duplicatePackagesSaved}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Double-giving avoided!</div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Final Relief Families
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {totalBeneficiaryFamilies}
          </div>
          <div className="text-[11px] text-indigo-700/80 mt-0.5">Unique households to receive aid</div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Field Checks Needed
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {pendingFieldChecks}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Verify father's name in village</div>
        </div>
      </div>

      {/* Roster Controls & Search */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Distribution Roster
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            The Relief List (Finalized Recipient Roster)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clean, disambiguated relief recipient list with duplicate protections and household metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center shadow-sm"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center shadow-sm"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Roster
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name, village, or father's name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Beneficiaries</option>
            <option value="merged">Merged Duplicates Only</option>
            <option value="field_check">Field Checks Only</option>
            <option value="separate">Separate Individuals</option>
          </select>
        </div>

        {uniqueVillages.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Village:</span>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Villages</option>
              {uniqueVillages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Master Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Beneficiary Name</th>
              <th className="px-4 py-3">Father's Name (Key Differentiator)</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Village / Para</th>
              <th className="px-4 py-3">Family Members</th>
              <th className="px-4 py-3">Spouse</th>
              <th className="px-4 py-3">Reconciled Sources</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-slate-400">
                  No beneficiaries match the current filter.
                </td>
              </tr>
            ) : (
              filteredRoster.map((item, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isMerged ? 'bg-emerald-50/15' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-3">
                    {item.fathers_name ? (
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {item.fathers_name}
                      </span>
                    ) : item.status === 'Pending Field Check' ? (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[10px]">
                        ⚠️ Needs Field Check
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {item.age ? `${item.age} yrs` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {item.village}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-bold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.family_members} {item.family_members === 1 ? 'person' : 'members'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.spouse_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.sources.map((src, sIdx) => {
                        let label = 'UC';
                        let color = 'bg-blue-100 text-blue-700';
                        if (src === 'own_survey') { label = 'Survey'; color = 'bg-emerald-100 text-emerald-700'; }
                        if (src === 'partner_org') { label = 'Partner'; color = 'bg-purple-100 text-purple-700'; }
                        return (
                          <span
                            key={sIdx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'Merged & Verified' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1"></span>
                        Merged (Safe)
                      </span>
                    )}
                    {item.status === 'Separate Individual' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1"></span>
                        Separate Person
                      </span>
                    )}
                    {item.status === 'Pending Field Check' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1"></span>
                        Field Verification
                      </span>
                    )}
                    {item.status === 'Pending Decision' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center w-max">
                        Pending Ruma
                      </span>
                    )}
                    {item.status === 'Single Source' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center w-max">
                        Standard Entry
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
