const express = require('express');
const router = express.Router();
const reliefController = require('../controllers/reliefController');
const auth = require('../middleware/auth');

// We allow optional auth or guest fallback so that user testing is seamless
const optionalAuth = (req, res, next) => {
  // Try authenticating, but do not block if token is missing
  auth(req, res, (err) => {
    // proceed regardless
    next();
  });
};

router.get('/entries', optionalAuth, reliefController.getEntries);
router.post('/entries', optionalAuth, reliefController.addEntry);
router.post('/bulk', optionalAuth, reliefController.bulkAdd);
router.delete('/entries/:id', optionalAuth, reliefController.deleteEntry);
router.post('/reset-sample', optionalAuth, reliefController.resetSample);
router.get('/duplicates', optionalAuth, reliefController.getDuplicateAnalysis);
router.post('/decide', optionalAuth, reliefController.recordDecision);

module.exports = router;
