const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private (Admin/Landlord)
exports.getTransactions = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'admin') {
      // Admin sees all
      query = Transaction.find();
    } else if (req.user.role === 'landlord') {
      // Landlord sees transactions for their properties
      const properties = await Property.find({ landlord: req.user.id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      query = Transaction.find({ property: { $in: propertyIds } });
    } else {
      // Tenant sees only their transactions
      query = Transaction.find({ tenant: req.user.id });
    }

    // Populate
    query = query
      .populate('property', 'title address')
      .populate('tenant', 'name email')
      .populate('landlord', 'name email');

    // Sort
    query = query.sort('-createdAt');

    const transactions = await query;

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('property')
      .populate('tenant')
      .populate('landlord');

    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id of ${req.params.id}`, 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        transaction.tenant._id.toString() !== req.user.id &&
        transaction.landlord._id.toString() !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to view this transaction`, 403));
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private (Admin/Landlord)
exports.createTransaction = async (req, res, next) => {
  try {
    // Add landlord
    const property = await Property.findById(req.body.property);
    if (!property) {
      return next(new ErrorResponse('Property not found', 404));
    }

    req.body.landlord = property.landlord;

    // Generate transaction ID
    req.body.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const transaction = await Transaction.create(req.body);

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private (Admin)
exports.updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id of ${req.params.id}`, 404));
    }

    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private (Admin)
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id of ${req.params.id}`, 404));
    }

    await transaction.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get tenant transactions
// @route   GET /api/transactions/tenant/:tenantId
// @access  Private
exports.getTenantTransactions = async (req, res, next) => {
  try {
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== req.params.tenantId) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    const transactions = await Transaction.find({ tenant: req.params.tenantId })
      .populate('property', 'title address');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};