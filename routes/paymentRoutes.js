const express = require('express');
const {
  getPayments,
  getPaymentHistory,
  initiatePayment,
  paymentCallback
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public callback (no auth)
router.post('/callback', paymentCallback);

// Protected routes
router.use(protect);

router.get('/', getPayments);
router.get('/history', getPaymentHistory);
router.post('/initiate', authorize('tenant'), initiatePayment);

module.exports = router;