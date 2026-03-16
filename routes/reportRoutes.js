const express = require('express');
const { getFinancialReport, getOccupancyReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'landlord'));

router.get('/financial', getFinancialReport);
router.get('/occupancy', getOccupancyReport);

module.exports = router;