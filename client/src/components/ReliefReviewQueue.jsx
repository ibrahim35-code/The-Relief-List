import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ReliefReviewQueue({ groups, onDecide, onDeleteEntry }) {
  const [selectedGroupForMerge, setSelectedGroupForMerge] = useState(null);

  // Merge modal fields
  const [mergedName, setMergedName] = useState('');
  const [mergedAge, setMergedAge] = useState('');
  const [mergedVillage, setMergedVillage] = useState('');
  const [mergedMembers, setMergedMembers] = useState('1');
  const [mergedSpouse, setMergedSpouse] = useState('');
  const [mergedFathersName, setMergedFathersName] = useState('');
  const [mergeNotes, setMergeNotes] = useState('');

  // Field check father name input state map
  const [fatherInputs, setFatherInputs] = useState({});

  const handleOpenMergeModal = (group) => {
    setSelectedGroupForMerge(group);

    // Pick smart defaults from group entries
    const names = group.entries.map(e => e.name);
    // Prefer longer/official name (like Union Council)
    const ucEntry = group.entries.find(e => e.source_list === 'union_council');
    const osEntry = group.entries.find(e => e.source_list === 'own_survey');
    const poEntry = group.entries.find(e => e.source_list === 'partner_org');

    setMergedName(ucEntry?.name || group.entries[0]?.name || '');
    setMergedAge(osEntry?.age || ucEntry?.age || '');
    setMergedVillage(ucEntry?.village || group.entries[0]?.village || '');
    setMergedMembers(osEntry?.family_members || poEntry?.family_members || 1);
    setMergedSpouse(poEntry?.spouse_name || '');
    setMergedFathersName(ucEntry?.fathers_name || osEntry?.fathers_name || '');
    setMergeNotes('Merged by Ruma after reviewing cross-list duplicate indicators.');
  };

  const handleConfirmMerge = () => {
    if (!selectedGroupForMerge) return;

    if (!mergedName.trim() || !mergedVillage.trim()) {
      toast.error('Primary beneficiary name and village are required for merge');
      return;
    }

    onDecide({
      group_signature: selectedGroupForMerge.groupId,
      entry_ids: selectedGroupForMerge.entries.map(e => e.id),
      decision_type: 'merge',
      resolved_name: mergedName.trim(),
      resolved_age: mergedAge ? parseInt(mergedAge, 10) : null,
      resolved_village: mergedVillage.trim(),
      resolved_family_members: mergedMembers ? parseInt(mergedMembers, 10) : 1,
      resolved_spouse: mergedSpouse.trim(),
      resolved_fathers_name: mergedFathersName.trim(),
      notes: mergeNotes.trim(),
    });

    setSelectedGroupForMerge(null);
    toast.success('Beneficiary records merged successfully! Duplicate relief prevented.');
  };

  const handleSeparate = (group) => {
    onDecide({
      group_signature: group.groupId,
      entry_ids: group.entries.map(e => e.id),
      decision_type: 'separate',
      resolved_name: null,
      resolved_age: null,
      resolved_village: null,
      resolved_family_members: null,
      resolved_spouse: null,
      resolved_fathers_name: null,
      notes: 'Confirmed by Ruma as separate individuals. Both will receive independent relief.',
    });
    toast.success('Confirmed as separate individuals. Both remain on relief roster.');
  };

  const handleFlagFieldCheck = (group) => {
    const enteredFather = fatherInputs[group.groupId] || '';
    onDecide({
      group_signature: group.groupId,
      entry_ids: group.entries.map(e => e.id),
      decision_type: 'field_check',
      resolved_name: null,
      resolved_age: null,
      resolved_village: null,
      resolved_family_members: null,
      resolved_spouse: null,
      resolved_fathers_name: enteredFather.trim() || null,
      notes: "Flagged by Ruma: Must verify father's name with local community elders before distribution.",
    });
    toast('Flagged for field verification of father\'s name.', { icon: '⚠️' });
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'union_council':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Union Council Register</span>;
      case 'own_survey':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Own Volunteer Survey</span>;
      case 'partner_org':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Partner Organisation</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{source}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Decision &amp; Disambiguation Station
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Potential Duplicate Matches ({groups.length})
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              The system analyzes name transliterations, village locations, and age proximity across the 3 lists. 
              <strong> You (Ruma) make the final decision</strong> to ensure no family is cheated out of relief, and no duplicate packages are handed out.
            </p>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 shrink-0 self-start">
            Ruma's Choice: Merge vs Separate
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {groups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-bold text-slate-800">No duplicate matches found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add more entries using the form above or click <strong>"Load Assessment Scenario"</strong> to see Ruma's benchmark test case in action.
            </p>
          </div>
        ) : (
          groups.map((group, idx) => {
            const decision = group.decision;
            const isMerged = decision?.decision_type === 'merge';
            const isSeparate = decision?.decision_type === 'separate';
            const isFieldCheck = decision?.decision_type === 'field_check';

            return (
              <div
                key={group.groupId}
                className={`rounded-2xl border transition-all ${
                  isMerged
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                    : isSeparate
                    ? 'border-blue-300 bg-blue-50/20 shadow-sm'
                    : isFieldCheck
                    ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                    : 'border-slate-300 bg-white shadow-sm hover:border-indigo-300'
                }`}
              >
                {/* Group Top Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Candidate Group: {group.entries.map(e => e.name).join(' ↔ ')}
                      </h3>
                      <div className="text-xs text-slate-500">
                        {group.entries.length} records compared across sources
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Match Confidence: {group.confidence}%
                    </span>

                    {/* Decision Status Badge */}
                    {isMerged && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-600 text-white flex items-center shadow-sm">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Merged into 1 Beneficiary
                      </span>
                    )}
                    {isSeparate && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white flex items-center shadow-sm">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Confirmed as Separate People
                      </span>
                    )}
                    {isFieldCheck && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white flex items-center shadow-sm">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Pending Field Check (Father's Name)
                      </span>
                    )}
                    {!decision && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Decision Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Compared Records Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          {getSourceBadge(entry.source_list)}
                          <span className="text-[10px] text-slate-400 font-mono">ID #{entry.id}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{entry.name}</div>
                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center">
                            <span className="w-16 font-semibold text-slate-400">Village:</span>
                            <span className="font-medium text-slate-800">{entry.village}</span>
                          </div>
                          {entry.age && (
                            <div className="flex items-center">
                              <span className="w-16 font-semibold text-slate-400">Age:</span>
                              <span className="font-medium text-slate-800">{entry.age} yrs</span>
                            </div>
                          )}
                          {entry.family_members > 1 && (
                            <div className="flex items-center">
                              <span className="w-16 font-semibold text-slate-400">Family:</span>
                              <span className="font-medium text-slate-800">{entry.family_members} members</span>
                            </div>
                          )}
                          {entry.spouse_name && (
                            <div className="flex items-center">
                              <span className="w-16 font-semibold text-slate-400">Spouse:</span>
                              <span className="font-medium text-slate-800">{entry.spouse_name}</span>
                            </div>
                          )}
                          {entry.fathers_name && (
                            <div className="flex items-center text-indigo-700 font-semibold">
                              <span className="w-16 text-slate-400">Father:</span>
                              <span>{entry.fathers_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400 font-mono italic truncate">
                        "{entry.raw_entry || entry.name}"
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transparent Match Reasons Panel ("WHY THE SYSTEM THINKS THEY ARE THE SAME PERSON") */}
                <div className="px-4 sm:px-5 pb-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-white">
                    <div className="flex items-center space-x-2 mb-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Why the system thinks these entries are the same person:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {group.reasons.map((r, rIdx) => {
                        let icon = '✔';
                        let pillClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
                        if (r.impact === 'warning') {
                          icon = '⚠';
                          pillClass = 'bg-amber-950/80 text-amber-300 border-amber-700/50';
                        } else if (r.impact === 'negative') {
                          icon = '✖';
                          pillClass = 'bg-rose-950/80 text-rose-300 border-rose-700/50';
                        }

                        return (
                          <div
                            key={rIdx}
                            className={`p-2.5 rounded-lg border flex items-start space-x-2 text-[11px] ${pillClass}`}
                          >
                            <span className="font-bold text-sm shrink-0">{icon}</span>
                            <div>
                              <strong className="block font-semibold">{r.label}</strong>
                              <span className="opacity-90">{r.detail}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ruma's Decision Controls */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Ruma's Decision Required:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Choose whether these represent the same household or separate families.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Button 1: Merge as same person */}
                    <button
                      type="button"
                      onClick={() => handleOpenMergeModal(group)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Merge as Same Person
                    </button>

                    {/* Button 2: Separate individuals */}
                    <button
                      type="button"
                      onClick={() => handleSeparate(group)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Confirm as Separate People
                    </button>

                    {/* Button 3: Flag for field check */}
                    <button
                      type="button"
                      onClick={() => handleFlagFieldCheck(group)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Flag for Field Check
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MERGE DECISION MODAL */}
      {selectedGroupForMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Finalize Merged Beneficiary Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    Consolidating {selectedGroupForMerge.entries.length} duplicate entries into 1 verified relief recipient.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGroupForMerge(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canonical Beneficiary Name (To print on relief roster)
                </label>
                <input
                  type="text"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Suggestions:</span>
                  {selectedGroupForMerge.entries.map((e, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMergedName(e.name)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verified Age
                  </label>
                  <input
                    type="number"
                    value={mergedAge}
                    onChange={(e) => setMergedAge(e.target.value)}
                    placeholder="e.g. 45 or 47"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmed Village / Para
                  </label>
                  <input
                    type="text"
                    value={mergedVillage}
                    onChange={(e) => setMergedVillage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Household Members (Relief Ration Size)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mergedMembers}
                    onChange={(e) => setMergedMembers(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Spouse Name (If available)
                  </label>
                  <input
                    type="text"
                    value={mergedSpouse}
                    onChange={(e) => setMergedSpouse(e.target.value)}
                    placeholder="e.g. Rahima"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name (Important differentiator noted in paper)
                </label>
                <input
                  type="text"
                  value={mergedFathersName}
                  onChange={(e) => setMergedFathersName(e.target.value)}
                  placeholder="e.g. Late Rafiq Karim (Distinguishes the two Abdul Karims)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ruma's Resolution Notes
                </label>
                <input
                  type="text"
                  value={mergeNotes}
                  onChange={(e) => setMergeNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedGroupForMerge(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95"
              >
                Confirm Merge &amp; Prevent Double Distribution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
