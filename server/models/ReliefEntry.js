const { pool } = require('../config/db');

// In-memory fallback store when MySQL client is offline
const memoryEntries = [];
const memoryDecisions = {};

let idCounter = 1;

// Default initial sample dataset representing Ruma's assessment scenario
const DEFAULT_SAMPLE_ENTRIES = [
  {
    id: 1,
    source_list: 'union_council',
    name: 'Md. Abdul Karim',
    age: 45,
    village: 'Char Para',
    family_members: 1,
    spouse_name: null,
    fathers_name: null,
    notes: 'Union Council Register #402',
    raw_entry: 'Md. Abdul Karim, 45, Char Para'
  },
  {
    id: 2,
    source_list: 'own_survey',
    name: 'Abdul Korim Mia',
    age: 47,
    village: 'Charpara',
    family_members: 5,
    spouse_name: null,
    fathers_name: null,
    notes: 'Volunteer survey note: tin roof house near river bank damaged by flood.',
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
    fathers_name: null,
    notes: 'Partner Org (Red Crescent) aid roster: wife Rahima listed.',
    raw_entry: 'A. Karim, Char Para, wife Rahima'
  },
  {
    id: 4,
    source_list: 'union_council',
    name: 'Abdul Karim',
    age: 33,
    village: 'Uttar Para',
    family_members: 1,
    spouse_name: null,
    fathers_name: 'Late Rafiq Karim',
    notes: 'Second Abdul Karim in the village (lives in Uttar Para, not Char Para).',
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
    fathers_name: null,
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
    fathers_name: null,
    notes: 'Partner Org list: husband Kashem',
    raw_entry: 'Fatema Begum, Char Para, husband Kashem'
  },
  {
    id: 7,
    source_list: 'union_council',
    name: 'Fatema Khatun',
    age: 40,
    village: 'Charpara',
    family_members: 1,
    spouse_name: null,
    fathers_name: null,
    notes: 'Union council list',
    raw_entry: 'Fatema Khatun, 40, Charpara'
  }
];

// Initialize memory with default samples
memoryEntries.push(...DEFAULT_SAMPLE_ENTRIES);
idCounter = 10;

const ReliefEntry = {
  async getAll(userId = null) {
    try {
      const query = 'SELECT * FROM relief_entries ORDER BY id ASC';
      const [rows] = await pool.query(query);
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      // Fallback to memory
    }
    return [...memoryEntries];
  },

  async create(entryData) {
    const {
      source_list,
      name,
      age = null,
      village,
      family_members = 1,
      spouse_name = null,
      fathers_name = null,
      notes = null,
      raw_entry = null,
      user_id = null,
    } = entryData;

    try {
      const query = `
        INSERT INTO relief_entries 
        (source_list, name, age, village, family_members, spouse_name, fathers_name, notes, raw_entry, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const values = [
        source_list,
        name.trim(),
        age ? parseInt(age, 10) : null,
        village.trim(),
        family_members ? parseInt(family_members, 10) : 1,
        spouse_name ? spouse_name.trim() : null,
        fathers_name ? fathers_name.trim() : null,
        notes ? notes.trim() : null,
        raw_entry || `${name}, ${age || ''}, ${village}`,
        user_id,
      ];
      const [result] = await pool.query(query, values);
      return {
        id: result.insertId,
        source_list,
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        village: village.trim(),
        family_members: family_members ? parseInt(family_members, 10) : 1,
        spouse_name: spouse_name ? spouse_name.trim() : null,
        fathers_name: fathers_name ? fathers_name.trim() : null,
        notes: notes ? notes.trim() : null,
        raw_entry: raw_entry || `${name}, ${age || ''}, ${village}`,
        created_at: new Date().toISOString(),
      };
    } catch (e) {
      // Fallback to memory store
      const newEntry = {
        id: idCounter++,
        source_list,
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        village: village.trim(),
        family_members: family_members ? parseInt(family_members, 10) : 1,
        spouse_name: spouse_name ? spouse_name.trim() : null,
        fathers_name: fathers_name ? fathers_name.trim() : null,
        notes: notes ? notes.trim() : null,
        raw_entry: raw_entry || `${name}, ${age || ''}, ${village}`,
        created_at: new Date().toISOString(),
      };
      memoryEntries.push(newEntry);
      return newEntry;
    }
  },

  async delete(id) {
    const numId = parseInt(id, 10);
    try {
      await pool.query('DELETE FROM relief_entries WHERE id = ?', [numId]);
    } catch (e) {
      const idx = memoryEntries.findIndex(e => e.id === numId);
      if (idx !== -1) memoryEntries.splice(idx, 1);
    }
    return true;
  },

  async resetSamples() {
    try {
      await pool.query('DELETE FROM relief_entries;');
      await pool.query('DELETE FROM relief_decisions;');
      for (const item of DEFAULT_SAMPLE_ENTRIES) {
        await pool.query(
          `INSERT INTO relief_entries (id, source_list, name, age, village, family_members, spouse_name, fathers_name, notes, raw_entry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.source_list, item.name, item.age, item.village, item.family_members, item.spouse_name, item.fathers_name, item.notes, item.raw_entry]
        );
      }
    } catch (e) {
      // Memory reset
      memoryEntries.length = 0;
      memoryEntries.push(...JSON.parse(JSON.stringify(DEFAULT_SAMPLE_ENTRIES)));
      for (const k in memoryDecisions) delete memoryDecisions[k];
    }
    return [...DEFAULT_SAMPLE_ENTRIES];
  },

  async getDecisions() {
    try {
      const [rows] = await pool.query('SELECT * FROM relief_decisions');
      const map = {};
      if (rows && Array.isArray(rows)) {
        rows.forEach(r => {
          map[r.group_signature] = {
            ...r,
            entry_ids: typeof r.entry_ids === 'string' ? JSON.parse(r.entry_ids) : r.entry_ids,
          };
        });
      }
      return map;
    } catch (e) {
      return { ...memoryDecisions };
    }
  },

  async saveDecision(decisionData) {
    const {
      group_signature,
      entry_ids,
      decision_type,
      resolved_name,
      resolved_age,
      resolved_village,
      resolved_family_members,
      resolved_spouse,
      resolved_fathers_name,
      notes,
    } = decisionData;

    const entryIdsJson = JSON.stringify(entry_ids || []);

    try {
      const query = `
        INSERT INTO relief_decisions 
        (group_signature, entry_ids, decision_type, resolved_name, resolved_age, resolved_village, resolved_family_members, resolved_spouse, resolved_fathers_name, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          decision_type = VALUES(decision_type),
          resolved_name = VALUES(resolved_name),
          resolved_age = VALUES(resolved_age),
          resolved_village = VALUES(resolved_village),
          resolved_family_members = VALUES(resolved_family_members),
          resolved_spouse = VALUES(resolved_spouse),
          resolved_fathers_name = VALUES(resolved_fathers_name),
          notes = VALUES(notes),
          updated_at = CURRENT_TIMESTAMP;
      `;
      const values = [
        group_signature,
        entryIdsJson,
        decision_type,
        resolved_name,
        resolved_age ? parseInt(resolved_age, 10) : null,
        resolved_village,
        resolved_family_members ? parseInt(resolved_family_members, 10) : 1,
        resolved_spouse,
        resolved_fathers_name,
        notes,
      ];
      await pool.query(query, values);

      return {
        group_signature,
        entry_ids,
        decision_type,
        resolved_name,
        resolved_age: resolved_age ? parseInt(resolved_age, 10) : null,
        resolved_village,
        resolved_family_members: resolved_family_members ? parseInt(resolved_family_members, 10) : 1,
        resolved_spouse,
        resolved_fathers_name,
        notes,
        updated_at: new Date().toISOString(),
      };
    } catch (e) {
      const saved = {
        group_signature,
        entry_ids,
        decision_type,
        resolved_name,
        resolved_age: resolved_age ? parseInt(resolved_age, 10) : null,
        resolved_village,
        resolved_family_members: resolved_family_members ? parseInt(resolved_family_members, 10) : 1,
        resolved_spouse,
        resolved_fathers_name,
        notes,
        updated_at: new Date().toISOString(),
      };
      memoryDecisions[group_signature] = saved;
      return saved;
    }
  }
};

module.exports = ReliefEntry;
