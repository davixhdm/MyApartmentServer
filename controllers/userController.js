const User = require('../models/User');
const Property = require('../models/Property');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get staff users (admin & landlord)
// @route   GET /api/users/staff
// @access  Private (Admin only)
exports.getStaffUsers = async (req, res, next) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'landlord'] } }).select('-password');
    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'tenant',
      phone,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // If password is being updated, hash it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // Handle cleanup - remove user from properties etc.
    if (user.role === 'landlord') {
      await Property.updateMany(
        { landlord: user._id },
        { $unset: { landlord: 1 } }
      );
    } else if (user.role === 'tenant') {
      await Property.updateMany(
        { currentTenant: user._id },
        { $unset: { currentTenant: 1 } }
      );
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get tenants
// @route   GET /api/users/tenants
// @access  Private (Landlord/Admin)
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await User.find({ role: 'tenant' }).select('-password');
    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get landlords
// @route   GET /api/users/landlords
// @access  Private (Admin)
exports.getLandlords = async (req, res, next) => {
  try {
    const landlords = await User.find({ role: 'landlord' }).select('-password');
    res.status(200).json({
      success: true,
      count: landlords.length,
      data: landlords
    });
  } catch (err) {
    next(err);
  }
};