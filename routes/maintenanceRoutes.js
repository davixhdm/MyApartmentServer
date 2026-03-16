const express = require('express');
const {
  getMaintenanceRequests,
  getMaintenanceRequest,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMaintenanceRequests)
  .post(createMaintenanceRequest);

router.route('/:id')
  .get(getMaintenanceRequest)
  .put(authorize('landlord', 'admin'), updateMaintenanceRequest)
  .delete(authorize('admin'), deleteMaintenanceRequest);

module.exports = router;