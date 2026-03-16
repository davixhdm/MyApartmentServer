const express = require('express');
const {
  getAdminStats,
  getLandlordStats,
  getTenantStats
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/admin', authorize('admin'), getAdminStats);
router.get('/landlord', authorize('landlord'), getLandlordStats);
router.get('/tenant', authorize('tenant'), getTenantStats);

module.exports = router;