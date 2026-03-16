const express = require('express');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTenantTransactions
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(authorize('admin', 'landlord'), createTransaction);

router.get('/tenant/:tenantId', getTenantTransactions);

router.route('/:id')
  .get(getTransaction)
  .put(authorize('admin'), updateTransaction)
  .delete(authorize('admin'), deleteTransaction);

module.exports = router;