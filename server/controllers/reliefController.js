const ReliefEntry = require('../models/ReliefEntry');
const { findDuplicateGroups } = require('../utils/deduplication');

const reliefController = {
  // Get all raw entries across the 3 lists
  async getEntries(req, res) {
    try {
      const entries = await ReliefEntry.getAll();
      return res.status(200).json({
        success: true,
        count: entries.length,
        entries,
      });
    } catch (error) {
      console.error('Error fetching entries:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch entries' });
    }
  },

  // Add a single entry to Union Council, Own Survey, or Partner Org
  async addEntry(req, res) {
    try {
      const { source_list, name, age, village, family_members, spouse_name, fathers_name, notes, raw_entry } = req.body;

      if (!source_list || !name || !village) {
        return res.status(400).json({
          success: false,
          message: 'Source list, beneficiary name, and village/location are required.',
        });
      }

      if (!['union_council', 'own_survey', 'partner_org'].includes(source_list)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid source list. Must be union_council, own_survey, or partner_org.',
        });
      }

      const created = await ReliefEntry.create({
        source_list,
        name,
        age,
        village,
        family_members,
        spouse_name,
        fathers_name,
        notes,
        raw_entry,
        user_id: req.user ? req.user.id : null,
      });

      return res.status(201).json({
        success: true,
        message: 'Entry added successfully',
        entry: created,
      });
    } catch (error) {
      console.error('Error adding entry:', error);
      return res.status(500).json({ success: false, message: 'Failed to add relief entry' });
    }
  },

  // Bulk add entries (useful for pasting multiple lines)
  async bulkAdd(req, res) {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ success: false, message: 'Entries array is required.' });
      }

      const createdList = [];
      for (const item of entries) {
        if (item.name && item.village && item.source_list) {
          const itemCreated = await ReliefEntry.create({
            ...item,
            user_id: req.user ? req.user.id : null,
          });
          createdList.push(itemCreated);
        }
      }

      return res.status(201).json({
        success: true,
        message: `Imported ${createdList.length} entries successfully.`,
        entries: createdList,
      });
    } catch (error) {
      console.error('Error in bulkAdd:', error);
      return res.status(500).json({ success: false, message: 'Bulk import failed' });
    }
  },

  // Delete an entry
  async deleteEntry(req, res) {
    try {
      const { id } = req.params;
      await ReliefEntry.delete(id);
      return res.status(200).json({ success: true, message: 'Entry removed successfully' });
    } catch (error) {
      console.error('Error deleting entry:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete entry' });
    }
  },

  // Reset to default sample scenario from the assessment paper
  async resetSample(req, res) {
    try {
      const samples = await ReliefEntry.resetSamples();
      return res.status(200).json({
        success: true,
        message: "Reset to Ruma's assessment benchmark sample entries.",
        entries: samples,
      });
    } catch (error) {
      console.error('Error resetting samples:', error);
      return res.status(500).json({ success: false, message: 'Failed to reset samples' });
    }
  },

  // Run the Deduplication Matching Algorithm and return groups with explainable reasons
  async getDuplicateAnalysis(req, res) {
    try {
      const entries = await ReliefEntry.getAll();
      const decisions = await ReliefEntry.getDecisions();
      const groups = findDuplicateGroups(entries, decisions);

      return res.status(200).json({
        success: true,
        totalEntries: entries.length,
        candidateGroupsCount: groups.length,
        groups,
        decisions,
      });
    } catch (error) {
      console.error('Error running duplicate analysis:', error);
      return res.status(500).json({ success: false, message: 'Analysis failed' });
    }
  },

  // Save Ruma's decision on a candidate duplicate group
  async recordDecision(req, res) {
    try {
      const {
        group_signature,
        entry_ids,
        decision_type, // 'merge', 'separate', 'field_check'
        resolved_name,
        resolved_age,
        resolved_village,
        resolved_family_members,
        resolved_spouse,
        resolved_fathers_name,
        notes,
      } = req.body;

      if (!group_signature || !decision_type) {
        return res.status(400).json({
          success: false,
          message: 'group_signature and decision_type are required.',
        });
      }

      const decision = await ReliefEntry.saveDecision({
        group_signature,
        entry_ids: Array.isArray(entry_ids) ? entry_ids : [],
        decision_type,
        resolved_name,
        resolved_age,
        resolved_village,
        resolved_family_members,
        resolved_spouse,
        resolved_fathers_name,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'Decision saved successfully',
        decision,
      });
    } catch (error) {
      console.error('Error recording decision:', error);
      return res.status(500).json({ success: false, message: 'Failed to record decision' });
    }
  },
};

module.exports = reliefController;
