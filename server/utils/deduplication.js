/**
 * Intelligent Deduplication & Entity Matching Engine
 * Designed for Ruma's Flood Relief Distribution
 * 
 * Compares entries from Union Council, Own Survey, and Partner Organisation
 * and produces explainable match candidate groups.
 */

// Common Bangladeshi honorifics and suffixes to normalize
const HONORIFICS = [
  'md.', 'md', 'mohammad', 'mohammed', 'muhammad', 'mst.', 'mst', 
  'most.', 'most', 'mrs.', 'mrs', 'mr.', 'mr', 'al-haj', 'haji'
];

const SUFFIXES = [
  'mia', 'miah', 'ali', 'chowdhury', 'khan', 'sardar', 'sheikh', 
  'mondol', 'molla', 'khatun', 'begum', 'ahmed', 'hossain'
];

/**
 * Phonetic/transliteration normalization for Bengali names in English
 */
const normalizePhonetics = (text) => {
  if (!text) return '';
  let str = text.toLowerCase().trim();

  // Strip punctuation except single spaces
  str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

  // Standardize common vowels and double letters
  str = str.replace(/\bmd\b/g, '')
           .replace(/\bmohammad\b/g, '')
           .replace(/\bmohammed\b/g, '')
           .replace(/\bmuhammad\b/g, '');

  str = str.replace(/ee/g, 'i')
           .replace(/oo/g, 'u')
           .replace(/korim/g, 'karim')
           .replace(/rohim/g, 'rahim')
           .replace(/khaton/g, 'khatun')
           .replace(/sh/g, 's')
           .replace(/ck/g, 'k');

  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Normalize location (e.g. "Char Para" vs "Charpara")
 */
const normalizeLocation = (loc) => {
  if (!loc) return '';
  return loc.toLowerCase().replace(/[\s\-_]/g, '').trim();
};

/**
 * Calculate Jaro-Winkler or Levenshtein string similarity (0 to 1)
 */
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  // Check prefix abbreviation (e.g. "a. karim" vs "abdul karim")
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
};

/**
 * Compare two relief entries and compute similarity + explainable reasons
 */
const compareEntries = (entryA, entryB) => {
  const reasons = [];
  let score = 0;
  let maxScore = 100;

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
    score -= 25;
    reasons.push({
      type: 'location_diff',
      label: 'Different Locations',
      detail: `Locations differ: "${entryA.village}" vs "${entryB.village}". May be different individuals with same name.`,
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
      detail: `"${entryA.name}" and "${entryB.name}" share core root words, phonetic variants, or abbreviations.`,
      impact: 'positive'
    });
  } else if (nameScore >= 0.65) {
    score += 30;
    reasons.push({
      type: 'name_moderate',
      label: 'Moderate Name Similarity',
      detail: `Names "${entryA.name}" and "${entryB.name}" have partial overlap or alternate transliterations.`,
      impact: 'positive'
    });
  } else {
    score -= 20;
    reasons.push({
      type: 'name_low',
      label: 'Low Name Similarity',
      detail: `Names "${entryA.name}" and "${entryB.name}" are notably different.`,
      impact: 'negative'
    });
  }

  // 3. Age proximity (if both have ages)
  if (entryA.age && entryB.age) {
    const ageDiff = Math.abs(parseInt(entryA.age) - parseInt(entryB.age));
    if (ageDiff <= 3) {
      score += 20;
      reasons.push({
        type: 'age_close',
        label: 'Ages Are Close',
        detail: `Age ${entryA.age} vs ${entryB.age} (difference of ${ageDiff} years, typical volunteer survey variance).`,
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
      score -= 25;
      reasons.push({
        type: 'age_distant',
        label: 'Large Age Discrepancy',
        detail: `Age ${entryA.age} vs ${entryB.age} (difference of ${ageDiff} years indicates potentially different generations).`,
        impact: 'negative'
      });
    }
  }

  // 4. Household / Spouse / Father context
  if (entryA.spouse_name && entryB.spouse_name) {
    const spouseSim = calculateStringSimilarity(entryA.spouse_name, entryB.spouse_name);
    if (spouseSim > 0.7) {
      score += 15;
      reasons.push({
        type: 'spouse_match',
        label: 'Spouse Name Matches',
        detail: `Spouse confirmed as "${entryA.spouse_name}".`,
        impact: 'positive'
      });
    }
  }

  // Father's name check (if recorded)
  if (entryA.fathers_name && entryB.fathers_name) {
    const fatherSim = calculateStringSimilarity(entryA.fathers_name, entryB.fathers_name);
    if (fatherSim > 0.7) {
      score += 20;
      reasons.push({
        type: 'father_match',
        label: "Father's Name Matches",
        detail: `Both records share father's name: "${entryA.fathers_name}".`,
        impact: 'positive'
      });
    } else {
      score -= 40;
      reasons.push({
        type: 'father_diff',
        label: "Different Father's Name",
        detail: `Distinct father names recorded ("${entryA.fathers_name}" vs "${entryB.fathers_name}"). Confirms different people!`,
        impact: 'negative'
      });
    }
  } else {
    // Village warning from the assessment document
    if (isLocationSame && nameScore >= 0.75) {
      reasons.push({
        type: 'father_warning',
        label: "Assessment Note: Father's Name Missing",
        detail: "In this village, multiple individuals may share this name. Verify father's name if unsure before final distribution.",
        impact: 'warning'
      });
    }
  }

  const finalConfidence = Math.max(0, Math.min(100, Math.round(score)));

  return {
    confidence: finalConfidence,
    reasons,
    isMatchCandidate: finalConfidence >= 60,
  };
};

/**
 * Cluster entries across the 3 lists into duplicate candidate groups
 */
const findDuplicateGroups = (entries, existingDecisions = {}) => {
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

      // Don't merge entries from the exact same source unless flagged
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

module.exports = {
  calculateStringSimilarity,
  normalizePhonetics,
  normalizeLocation,
  compareEntries,
  findDuplicateGroups,
};
