const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const User = require('../models/User');
const { initiateMpesaPayment } = require('../services/paymentService');
const { createNotification } = require('./notificationController');

// @desc    Get all payments (with filters)
// @route   GET /api/payments
// @access  Private (role-based)
exports.getPayments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'tenant') {
      query.tenant = req.user.id;
    } else if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlord: req.user.id }).distinct('_id');
      query.property = { $in: properties };
    }
    // Admin sees all

    const payments = await Transaction.find({ ...query, type: 'rent' })
      .populate('property', 'title address')
      .populate('tenant', 'name email')
      .populate('landlord', 'name email')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
};

// @desc    Get payment history for current user
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Transaction.find({
      tenant: req.user.id,
      type: 'rent'
    })
      .populate('property', 'title address')
      .sort('-createdAt');

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

// @desc    Initiate a payment (e.g., M-Pesa)
// @route   POST /api/payments/initiate
// @access  Private (tenant)
exports.initiatePayment = async (req, res, next) => {
  try {
    const { propertyId, amount, phone } = req.body;

    // Validate property and tenant
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Check if tenant is the current tenant of the property (or just any tenant?)
    // For simplicity, allow any tenant to pay rent for any property? Usually rent is for assigned property.
    // We'll check if the tenant is the current tenant of that property.
    if (property.currentTenant?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not the tenant of this property' });
    }

    // Initiate payment via M-Pesa (or other gateway)
    const paymentResult = await initiateMpesaPayment(phone, amount, `Rent for ${property.title}`);

    // Create a pending transaction
    const transaction = await Transaction.create({
      type: 'rent',
      amount,
      paymentMethod: 'mpesa',
      paymentReference: paymentResult.CheckoutRequestID,
      property: propertyId,
      tenant: req.user.id,
      landlord: property.landlord,
      status: 'pending',
      description: `Rent payment for ${property.title}`
    });

    res.status(201).json({
      success: true,
      data: {
        transaction,
        checkoutRequestId: paymentResult.CheckoutRequestID,
        customerMessage: paymentResult.CustomerMessage
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Confirm payment (webhook/callback)
// @route   POST /api/payments/callback
// @access  Public (secured by secret)
exports.paymentCallback = async (req, res, next) => {
  try {
    // This endpoint is called by payment gateway (e.g., M-Pesa)
    const { Body } = req.body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const transaction = await Transaction.findOne({ paymentReference: CheckoutRequestID });
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (ResultCode === 0) {
      // Payment successful
      transaction.status = 'completed';
      transaction.paidDate = Date.now();
      // Extract amount from metadata if needed
      if (CallbackMetadata?.Item) {
        const amountItem = CallbackMetadata.Item.find(item => item.Name === 'Amount');
        if (amountItem) transaction.amount = amountItem.Value;
      }
      await transaction.save();

      // Create notification for tenant and landlord
      await createNotification(
        transaction.tenant,
        'Payment Successful',
        `Your payment of ${transaction.amount} has been received.`,
        'success'
      );
      await createNotification(
        transaction.landlord,
        'Payment Received',
        `Tenant ${transaction.tenant} has paid rent of ${transaction.amount}.`,
        'info'
      );
    } else {
      // Payment failed
      transaction.status = 'failed';
      transaction.metadata = { failureReason: ResultDesc };
      await transaction.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};