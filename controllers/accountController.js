const Account = require('../models/Account');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private/Admin
exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find().select('-password');
    res.status(200).json({ success: true, count: accounts.length, data: accounts });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single account
// @route   GET /api/accounts/:id
// @access  Private/Admin
exports.getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id).select('-password');
    if (!account) {
      return next(new ErrorResponse(`Account not found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// @desc    Create account
// @route   POST /api/accounts
// @access  Private/Admin
exports.createAccount = async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const account = await Account.create({
      ...rest,
      password: hashedPassword,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private/Admin
exports.updateAccount = async (req, res, next) => {
  try {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!account) {
      return next(new ErrorResponse(`Account not found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Private/Admin
exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return next(new ErrorResponse(`Account not found with id ${req.params.id}`, 404));
    }
    await account.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Update permissions
// @route   PUT /api/accounts/:id/permissions
// @access  Private/Admin
exports.updatePermissions = async (req, res, next) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      { new: true, runValidators: true }
    ).select('-password');
    if (!account) {
      return next(new ErrorResponse(`Account not found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle account status
// @route   PUT /api/accounts/:id/status
// @access  Private/Admin
exports.toggleStatus = async (req, res, next) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    ).select('-password');
    if (!account) {
      return next(new ErrorResponse(`Account not found with id ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};