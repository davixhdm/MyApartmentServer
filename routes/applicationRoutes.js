const express = require('express');
const {
  getApplications,
  getApplication,
  createApplication,
  updateApplicationStatus,
  deleteApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getApplications)
  .post(authorize('tenant'), createApplication);

router.route('/:id')
  .get(getApplication)
  .put(authorize('landlord', 'admin'), updateApplicationStatus)
  .delete(deleteApplication); // applicant or admin

module.exports = router;