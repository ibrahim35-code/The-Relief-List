const { validationResult } = require('express-validator');
const ReliefRequest = require('../models/ReliefRequest');

/**
 * Submit a new relief request
 * Supports exact channel formats:
 * - Union Council: name, age, address
 * - Volunteer Survey: name, age, total family members, address
 * - Partner: name, address, wife name
 * POST /api/relief
 */
const createRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const {
      sourceType,
      name,
      beneficiaryName,
      age,
      familyMembers,
      wifeName,
      address,
      category,
      urgency,
      contactNumber,
      description,
    } = req.body;

    const assignedName = name || beneficiaryName;

    const newRequest = await ReliefRequest.create({
      userId: req.user.id,
      submittedByName: req.user.name,
      submittedByEmail: req.user.email,
      sourceType: sourceType || 'Volunteer Survey',
      beneficiaryName: assignedName,
      age: age ? parseInt(age, 10) : null,
      familyMembers: familyMembers ? parseInt(familyMembers, 10) : null,
      wifeName: wifeName || null,
      address,
      category: category || 'Food Supplies',
      urgency: urgency || 'Medium',
      contactNumber: contactNumber || null,
      description: description || '',
    });

    return res.status(201).json({
      success: true,
      message: `Data recorded successfully under ${newRequest.source_type}. Queued for administrator review.`,
      data: newRequest,
    });
  } catch (error) {
    console.error('Error creating relief request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit relief request. Please try again.',
    });
  }
};

/**
 * Get submissions belonging to the logged-in user
 * Accessible by: Regular Users & Admins (Reads own records)
 * GET /api/relief/my
 */
const getMyRequests = async (req, res) => {
  try {
    const requests = await ReliefRequest.findByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your relief submissions.',
    });
  }
};

/**
 * Get all relief submissions across the entire system
 * STRICTLY ADMIN ONLY
 * GET /api/relief/all
 */
const getAllRequests = async (req, res) => {
  try {
    const { status, category, urgency, sourceType, search } = req.query;
    const requests = await ReliefRequest.findAll({ status, category, urgency, sourceType, search });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching all requests (admin):', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve relief requests.',
    });
  }
};

/**
 * Get system summary metrics
 * STRICTLY ADMIN ONLY
 * GET /api/relief/stats
 */
const getAdminStats = async (req, res) => {
  try {
    const metrics = await ReliefRequest.getMetrics();
    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics metrics.',
    });
  }
};

/**
 * Get single request details by ID
 * Users can view only their own; Admins can view any.
 * GET /api/relief/:id
 */
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ReliefRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Relief request not found.',
      });
    }

    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this request.',
      });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error fetching request by id:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve relief request details.',
    });
  }
};

/**
 * Modify a relief request (Full Edit)
 * STRICTLY ADMIN ONLY
 * PUT /api/relief/:id
 */
const updateRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const existing = await ReliefRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Relief request not found.',
      });
    }

    const {
      sourceType,
      name,
      beneficiaryName,
      age,
      familyMembers,
      wifeName,
      address,
      title,
      category,
      urgency,
      contactNumber,
      description,
      status,
      adminNotes,
    } = req.body;

    const assignedName = name || beneficiaryName || existing.beneficiary_name;

    const updated = await ReliefRequest.update(id, {
      sourceType: sourceType || existing.source_type,
      beneficiaryName: assignedName,
      age: age !== undefined ? age : existing.age,
      familyMembers: familyMembers !== undefined ? familyMembers : existing.family_members,
      wifeName: wifeName !== undefined ? wifeName : existing.wife_name,
      address: address !== undefined ? address : existing.address,
      title: title || existing.title,
      category: category || existing.category,
      urgency: urgency || existing.urgency,
      location: address || existing.location,
      contactNumber: contactNumber !== undefined ? contactNumber : existing.contact_number,
      peopleAffected: familyMembers ? parseInt(familyMembers, 10) : existing.people_affected,
      description: description !== undefined ? description : existing.description,
      status: status || existing.status,
      adminNotes: adminNotes !== undefined ? adminNotes : existing.admin_notes,
    });

    return res.status(200).json({
      success: true,
      message: 'Relief request modified successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating relief request (admin):', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update relief request.',
    });
  }
};

/**
 * Fast status change
 * STRICTLY ADMIN ONLY
 * PATCH /api/relief/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const existing = await ReliefRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Relief request not found.',
      });
    }

    const updated = await ReliefRequest.updateStatus(id, status, adminNotes);

    return res.status(200).json({
      success: true,
      message: `Request status successfully changed to ${status}.`,
      data: updated,
    });
  } catch (error) {
    console.error('Error changing status (admin):', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update request status.',
    });
  }
};

/**
 * Delete a relief request
 * STRICTLY ADMIN ONLY
 * DELETE /api/relief/:id
 */
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ReliefRequest.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Relief request not found.',
      });
    }

    await ReliefRequest.delete(id);

    return res.status(200).json({
      success: true,
      message: 'Relief request deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting relief request (admin):', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete relief request.',
    });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getAdminStats,
  getRequestById,
  updateRequest,
  updateStatus,
  deleteRequest,
};
