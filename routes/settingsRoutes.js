const express = require('express');
const {
  getPublicSettings,
  getAllSettings,
  getSetting,
  upsertSetting,
  updateSettings,
  deleteSetting,
  initDefaultSettings
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route
router.get('/public', getPublicSettings);

// Admin only routes
router.use(protect, authorize('admin'));

// Bulk update
router.put('/', updateSettings);

// Initialize default settings
router.post('/init', initDefaultSettings);

// Individual setting routes
router.get('/', getAllSettings);
router.get('/:key', getSetting);
router.put('/:key', upsertSetting);
router.delete('/:key', deleteSetting);

module.exports = router;