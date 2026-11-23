const express = require('express');
const router = express.Router();

const reliefController = require('../controllers/reliefController');
const { reliefValidation, statusValidation } = require('../validators/reliefValidator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// 1. INPUT ACCESS: Users and Admins can input/submit new relief data
router.post('/', auth, roleAuth('user', 'admin'), reliefValidation, reliefController.createRequest);

// 2. READ ACCESS: Regular users can read their own submitted data
router.get('/my', auth, reliefController.getMyRequests);

// 3. READ ALL & STATS: Admin only
router.get('/all', auth, roleAuth('admin'), reliefController.getAllRequests);
router.get('/stats', auth, roleAuth('admin'), reliefController.getAdminStats);
router.get('/:id', auth, reliefController.getRequestById);

// 4. MODIFICATION ACCESS: STRICTLY ADMIN ONLY (Users get 403 Forbidden)
router.put('/:id', auth, roleAuth('admin'), reliefValidation, reliefController.updateRequest);
router.patch('/:id/status', auth, roleAuth('admin'), statusValidation, reliefController.updateStatus);
router.delete('/:id', auth, roleAuth('admin'), reliefController.deleteRequest);

module.exports = router;
