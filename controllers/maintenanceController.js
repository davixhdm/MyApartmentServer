const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all maintenance requests
// @route   GET /api/maintenance
// @access  Private (role‑based)
exports.getMaintenanceRequests = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = Maintenance.find();
    } else if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlord: req.user.id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      query = Maintenance.find({ property: { $in: propertyIds } });
    } else {
      // tenant
      query = Maintenance.find({ tenant: req.user.id });
    }
    const requests = await query
      .populate('property', 'title address')
      .populate('tenant', 'name email')
      .populate('assignedTo', 'name email');
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single maintenance request
// @route   GET /api/maintenance/:id
// @access  Private
exports.getMaintenanceRequest = async (req, res, next) => {
  try {
    const request = await Maintenance.findById(req.params.id)
      .populate('property')
      .populate('tenant')
      .populate('assignedTo');
    if (!request) {
      return next(new ErrorResponse(`Maintenance request not found with id ${req.params.id}`, 404));
    }
    // Authorize: admin, landlord of property, or tenant who created it
    const isLandlord = request.property.landlord.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isLandlord && request.tenant._id.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    res.status(200).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// @desc    Create maintenance request
// @route   POST /api/maintenance
// @access  Private (tenant, landlord, admin)
exports.createMaintenanceRequest = async (req, res, next) => {
  try {
    req.body.tenant = req.user.id; // enforce tenant as current user
    const request = await Maintenance.create(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// @desc    Update maintenance request
// @route   PUT /api/maintenance/:id
// @access  Private (landlord, admin)
exports.updateMaintenanceRequest = async (req, res, next) => {
  try {
    let request = await Maintenance.findById(req.params.id).populate('property');
    if (!request) {
      return next(new ErrorResponse(`Maintenance request not found with id ${req.params.id}`, 404));
    }
    // Only landlord of property or admin can update
    if (req.user.role !== 'admin' && request.property.landlord.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    request = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.status(200).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete maintenance request
// @route   DELETE /api/maintenance/:id
// @access  Private (admin only)
exports.deleteMaintenanceRequest = async (req, res, next) => {
  try {
    const request = await Maintenance.findById(req.params.id);
    if (!request) {
      return next(new ErrorResponse(`Maintenance request not found with id ${req.params.id}`, 404));
    }
    await request.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};