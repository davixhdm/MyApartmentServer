const Application = require('../models/Application');
const Property = require('../models/Property');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private (admin, landlord)
exports.getApplications = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = Application.find();
    } else if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlord: req.user.id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      query = Application.find({ property: { $in: propertyIds } });
    } else {
      // tenant – only their own applications
      query = Application.find({ applicant: req.user.id });
    }
    const applications = await query
      .populate('property', 'title address propertyCode')
      .populate('applicant', 'name email')
      .populate('reviewedBy', 'name email')
      .sort('-createdAt');
    
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('property')
      .populate('applicant')
      .populate('reviewedBy');
    
    if (!application) {
      return next(new ErrorResponse(`Application not found with id ${req.params.id}`, 404));
    }
    
    // Authorize: admin, landlord of property, or applicant
    const isLandlord = application.property?.landlord?.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isLandlord && application.applicant._id.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    
    res.status(200).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

// @desc    Create application
// @route   POST /api/applications
// @access  Private (tenant)
exports.createApplication = async (req, res, next) => {
  try {
    const { property: propertyId, unit, unitNumber } = req.body;
    
    console.log('Creating application with data:', req.body);
    
    // Validate required fields
    if (!propertyId) {
      return next(new ErrorResponse('Property ID is required', 400));
    }
    
    if (!unit) {
      return next(new ErrorResponse('Unit ID is required', 400));
    }
    
    // Set applicant to current user
    req.body.applicant = req.user.id;
    
    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return next(new ErrorResponse('Property not found', 404));
    }
    
    console.log('Property found:', property.title);
    console.log('Property units:', property.units?.length);
    
    // Find the specific unit
    const selectedUnit = property.units.id(unit);
    if (!selectedUnit) {
      return next(new ErrorResponse('Unit not found in this property', 404));
    }
    
    console.log('Selected unit:', selectedUnit.unitNumber, 'Status:', selectedUnit.status);
    
    // Check if unit is available
    if (selectedUnit.status !== 'available') {
      return next(new ErrorResponse(`Unit ${selectedUnit.unitNumber} is not available for application`, 400));
    }
    
    // Check if user already applied to this unit
    const existing = await Application.findOne({
      property: propertyId,
      unit: unit,
      applicant: req.user.id,
      status: { $in: ['pending', 'reviewing'] }
    });
    
    if (existing) {
      return next(new ErrorResponse('You already have a pending application for this unit', 400));
    }
    
    // Create the application
    const application = await Application.create({
      ...req.body,
      propertyDetails: {
        title: property.title,
        propertyCode: property.propertyCode,
        address: {
          street: property.address?.street,
          city: property.address?.city
        }
      },
      unitDetails: {
        price: selectedUnit.price,
        bedrooms: selectedUnit.bedrooms,
        bathrooms: selectedUnit.bathrooms,
        area: selectedUnit.area
      }
    });
    
    console.log('Application created successfully:', application.applicationId);
    
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    console.error('Application creation error:', err);
    next(err);
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id
// @access  Private (landlord, admin)
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    let application = await Application.findById(req.params.id).populate('property');
    
    if (!application) {
      return next(new ErrorResponse(`Application not found with id ${req.params.id}`, 404));
    }
    
    // Only landlord of property or admin can update status
    if (req.user.role !== 'admin' && application.property.landlord.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    const previousStatus = application.status;
    const newStatus = req.body.status;

    // Update application
    application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        status: newStatus,
        reviewNotes: req.body.reviewNotes,
        reviewedBy: req.user.id,
        reviewDate: Date.now()
      },
      { new: true, runValidators: true }
    );

    // If approved, update property unit status
    if (newStatus === 'approved' && previousStatus !== 'approved') {
      const Property = mongoose.model('Property');
      const property = await Property.findById(application.property);
      
      if (property && application.unit) {
        const unit = property.units.id(application.unit);
        if (unit) {
          unit.status = 'occupied';
          unit.currentTenant = application.applicant;
          await property.save();
          
          console.log(`✅ Unit ${unit.unitNumber} assigned to tenant ${application.applicant}`);
        }
      }
    }

    res.status(200).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete application (withdraw)
// @route   DELETE /api/applications/:id
// @access  Private (applicant, admin)
exports.deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return next(new ErrorResponse(`Application not found with id ${req.params.id}`, 404));
    }
    
    // Only applicant or admin can delete/withdraw
    if (req.user.role !== 'admin' && application.applicant.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }
    
    // Soft delete - update status to withdrawn instead of removing
    application.status = 'withdrawn';
    await application.save();
    
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};