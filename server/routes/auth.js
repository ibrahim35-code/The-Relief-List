const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validators/authValidator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', auth, authController.getMe);

// Example protected verification routes
router.get('/admin/verify', auth, roleAuth('admin'), (req, res) => {
  return res.status(200).json({
    message: 'Admin access granted',
  });
});

router.get('/user/verify', auth, roleAuth('user', 'admin'), (req, res) => {
  return res.status(200).json({
    message: 'User access granted',
  });
});

module.exports = router;
