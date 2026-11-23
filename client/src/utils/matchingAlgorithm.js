/**
 * Client-Side Deduplication & Entity Disambiguation Engine
 * Designed for Ruma's Flood Relief Distribution Assessment
 */

export const HONORIFICS = [
  'md.', 'md', 'mohammad', 'mohammed', 'muhammad', 'mst.', 'mst', 
  'most.', 'most', 'mrs.', 'mrs', 'mr.', 'mr', 'al-haj', 'haji'
];

export const SUFFIXES = [
  'mia', 'miah', 'ali', 'chowdhury', 'khan', 'sardar', 'sheikh', 
  'mondol', 'molla', 'khatun', 'begum', 'ahmed', 'hossain'
];

export const normalizePhonetics = (text) => {
  if (!text) return '';
  let str = text.toLowerCase().trim();

  // Strip punctuation except single spaces
  str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Remove standard honorifics
  str = str.replace(/\bmd\b/g, '')
           .replace(/\bmohammad\b/g, '')
           .replace(/\bmohammed\b/g, '')
           .replace(/\bmuhammad\b/g, '');

  // Normalize phonetic vowels & transliteration variations common in Bangladesh
  str = str.replace(/ee/g, 'i')
           .replace(/oo/g, 'u')
           .replace(/korim/g, 'karim')
           .replace(/rohim/g, 'rahim')
           .replace(/khaton/g, 'khatun')
           .replace(/sh/g, 's')
           .replace(/ck/g, 'k');

  return str.replace(/\s+/g, ' ').trim();
};

export const normalizeLocation = (loc) => {
  if (!loc) return '';
  return loc.toLowerCase().replace(/[\s\-_]/g, '').trim();
};

export const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  // Check prefix abbreviation (e.g. "A. Karim" vs "Abdul Karim")
  const parts1 = s1.split(/\s+/).filter(Boolean);
  const parts2 = s2.split(/\s+/).filter(Boolean);

  if (parts1.length > 0 && parts2.length > 0) {
    const isAbbr1 = parts1[0].length === 1 || (parts1[0].length === 2 && parts1[0].endsWith('.'));
    const isAbbr2 = parts2[0].length === 1 || (parts2[0].length === 2 && parts2[0].endsWith('.'));

    if (isAbbr1 || isAbbr2) {
      const initial = isAbbr1 ? parts1[0][0] : parts2[0][0];
      const fullWord = isAbbr1 ? parts2[0] : parts1[0];
      const rest1 = parts1.slice(1).join(' ');
      const rest2 = parts2.slice(1).join(' ');

      if (fullWord.startsWith(initial) && (rest1 === rest2 || rest1.includes(rest2) || rest2.includes(rest1))) {
        return 0.90;
      }
    }
  }

  // Levenshtein distance
  const matrix = Array.from({ length: s2.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
};

export const compareEntries = (entryA, entryB) => {
  const reasons = [];
  let score = 0;

  // 1. Location match
  const locA = normalizeLocation(entryA.village);
  const locB = normalizeLocation(entryB.village);
  const isLocationSame = locA && locB && (locA === locB || locA.includes(locB) || locB.includes(locA));

  if (isLocationSame) {
    score += 35;
    reasons.push({
      type: 'location_match',
      label: 'Location Matches',
      detail: `Both reside in "${entryA.village}" / "${entryB.village}" (normalized village area).`,
      impact: 'positive'
    });
  } else if (locA && locB) {
    score -= 30;
    reasons.push({
      type: 'location_diff',
      label: 'Different Locations',
      detail: `Locations differ: "${entryA.village}" vs "${entryB.village}". Strongly suggests distinct individuals.`,
      impact: 'negative'
    });
  }

  // 2. Name similarity
  const rawSim = calculateStringSimilarity(entryA.name, entryB.name);
  const normA = normalizePhonetics(entryA.name);
  const normB = normalizePhonetics(entryB.name);
  const normSim = calculateStringSimilarity(normA, normB);
  const nameScore = Math.max(rawSim, normSim);

  if (nameScore >= 0.85) {
    score += 45;
    reasons.push({
      type: 'name_strong',
      label: 'Strong Name Match',
      detail: `"${entryA.name}" and "${entryB.name}" match core root phonetics and transliteration ("${normA}" ~ "${normB}").`,
      impact: 'positive'
    });
  } else if (nameScore >= 0.65) {
    score += 30;
    reasons.push({
      type: 'name_moderate',
      label: 'Moderate Name Similarity',
      detail: `Names "${entryA.name}" and "${entryB.name}" have partial similarity or common honorific variations.`,
      impact: 'positive'
    });
  } else {
    score -= 25;
    reasons.push({
      type: 'name_low',
      label: 'Low Name Similarity',
      detail: `Names "${entryA.name}" and "${entryB.name}" are notably different.`,
      impact: 'negative'
    });
  }

  // 3. Age proximity
  if (entryA.age && entryB.age) {
    const ageDiff = Math.abs(parseInt(entryA.age) - parseInt(entryB.age));
    if (ageDiff <= 3) {
      score += 20;
      reasons.push({
        type: 'age_close',
        label: 'Ages Are Close',
        detail: `Age ${entryA.age} vs ${entryB.age} (difference of ${ageDiff} year${ageDiff === 1 ? '' : 's'}, typical for field survey estimates).`,
        impact: 'positive'
      });
    } else if (ageDiff <= 6) {
      score += 10;
      reasons.push({
        type: 'age_moderate',
        label: 'Ages Moderately Close',
        detail: `Age ${entryA.age} vs ${entryB.age} (difference of ${ageDiff} years).`,
        impact: 'neutral'
      });
    } else {
      score -= 30;
      reasons.push({
        type: 'age_distant',
        label: 'Significant Age Gap',
        detail: `Age ${entryA.age} vs ${entryB.age} (difference of ${ageDiff} years indicates distinct generations).`,
        impact: 'negative'
      });
    }
  }

  // 4. Spouse match
  if (entryA.spouse_name && entryB.spouse_name) {
    const spouseSim = calculateStringSimilarity(entryA.spouse_name, entryB.spouse_name);
    if (spouseSim > 0.7) {
      score += 20;
      reasons.push({
        type: 'spouse_match',
        label: 'Spouse Name Matches',
        detail: `Spouse matches: "${entryA.spouse_name}" ~ "${entryB.spouse_name}".`,
        impact: 'positive'
      });
    }
  }

  // 5. Father's name
  if (entryA.fathers_name && entryB.fathers_name) {
    const fatherSim = calculateStringSimilarity(entryA.fathers_name, entryB.fathers_name);
    if (fatherSim > 0.7) {
      score += 25;
      reasons.push({
        type: 'father_match',
        label: "Father's Name Matches",
        detail: `Father's name matches: "${entryA.fathers_name}".`,
        impact: 'positive'
      });
    } else {
      score -= 50;
      reasons.push({
        type: 'father_diff',
        label: "Different Father's Name",
        detail: `Father names differ: "${entryA.fathers_name}" vs "${entryB.fathers_name}". Confirms different individuals!`,
        impact: 'negative'
      });
    }
  } else {
    // Village warning from the assessment document
    if (isLocationSame && nameScore >= 0.70) {
      reasons.push({
        type: 'father_warning',
        label: "Assessment Alert: Check Father's Name",
        detail: "The village has multiple residents with this name. Check father's name before deciding to merge.",
        impact: 'warning'
      });
    }
  }

  const confidence = Math.max(0, Math.min(100, Math.round(score)));

  return {
    confidence,
    reasons,
    isMatchCandidate: confidence >= 55,
  };
};

export const findDuplicateGroups = (entries, existingDecisions = {}) => {
  const n = entries.length;
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < n; i++) {
    if (visited.has(entries[i].id)) continue;

    const currentGroup = [entries[i]];
    const candidateReasons = [];
    let groupConfidence = 100;

    for (let j = i + 1; j < n; j++) {
      if (visited.has(entries[j].id)) continue;

      const comparison = compareEntries(entries[i], entries[j]);

      if (comparison.isMatchCandidate) {
        currentGroup.push(entries[j]);
        visited.add(entries[j].id);
        candidateReasons.push(...comparison.reasons);
        groupConfidence = Math.min(groupConfidence, comparison.confidence);
      }
    }

    if (currentGroup.length > 1) {
      visited.add(entries[i].id);
      const groupKey = currentGroup.map(e => e.id).sort().join('-');
      const existingDecision = existingDecisions[groupKey] || null;

      groups.push({
        groupId: groupKey,
        confidence: groupConfidence,
        entries: currentGroup,
        reasons: Array.from(new Set(candidateReasons.map(r => JSON.stringify(r)))).map(s => JSON.parse(s)),
        decision: existingDecision,
      });
    }
  }

  return groups;
};

export const DEFAULT_BENCHMARK_DATA = [
  {
    id: 1,
    source_list: 'union_council',
    name: 'Md. Abdul Karim',
    age: 45,
    village: 'Char Para',
    family_members: 1,
    spouse_name: '',
    fathers_name: '',
    notes: 'Official Union Council beneficiary ledger #104',
    raw_entry: 'Md. Abdul Karim, 45, Char Para'
  },
  {
    id: 2,
    source_list: 'own_survey',
    name: 'Abdul Korim Mia',
    age: 47,
    village: 'Charpara',
    family_members: 5,
    spouse_name: '',
    fathers_name: '',
    notes: 'Volunteer survey note: 5 members in household, riverbank location flooded.',
    raw_entry: 'Abdul Korim Mia, 47, Charpara, 5 members'
  },
  {
    id: 3,
    source_list: 'partner_org',
    name: 'A. Karim',
    age: null,
    village: 'Char Para',
    family_members: 2,
    spouse_name: 'Rahima',
    fathers_name: '',
    notes: 'Red Crescent partner relief list: wife Rahima listed.',
    raw_entry: 'A. Karim, Char Para, wife Rahima'
  },
  {
    id: 4,
    source_list: 'union_council',
    name: 'Abdul Karim',
    age: 33,
    village: 'Uttar Para',
    family_members: 1,
    spouse_name: '',
    fathers_name: 'Late Rafiq Karim',
    notes: 'Second Abdul Karim in the village (lives in Uttar Para).',
    raw_entry: 'Abdul Karim, 33, Uttar Para'
  },
  {
    id: 5,
    source_list: 'own_survey',
    name: 'Abdul Karim',
    age: 32,
    village: 'Uttar Para',
    family_members: 3,
    spouse_name: 'Jorina',
    fathers_name: '',
    notes: 'Own survey team: Farmer, 3 members, Uttar Para.',
    raw_entry: 'Abdul Karim, 32, Uttar Para, 3 members'
  },
  {
    id: 6,
    source_list: 'partner_org',
    name: 'Fatema Begum',
    age: null,
    village: 'Char Para',
    family_members: 2,
    spouse_name: 'Kashem',
    fathers_name: '',
    notes: 'Partner organization list: husband Kashem',
    raw_entry: 'Fatema Begum, Char Para, husband Kashem'
  },
  {
    id: 7,
    source_list: 'union_council',
    name: 'Fatema Khatun',
    age: 40,
    village: 'Charpara',
    family_members: 1,
    spouse_name: '',
    fathers_name: '',
    notes: 'Union council list',
    raw_entry: 'Fatema Khatun, 40, Charpara'
  }
];
