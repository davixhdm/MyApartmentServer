const Property = require('../models/Property');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public/Private (with filters)
exports.getProperties = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Property.find(JSON.parse(queryStr)).populate('landlord', 'name email phone');

    // Search functionality
    if (req.query.search) {
      query = Property.find({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { propertyCode: { $regex: req.query.search, $options: 'i' } },
          { 'address.street': { $regex: req.query.search, $options: 'i' } },
          { 'address.city': { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }

    // Filter by available units only
    if (req.query.availableOnly === 'true') {
      query = query.where('units.status').equals('available');
    }

    // Filter by tenant (for user properties)
    if (req.query.currentTenant) {
      query = query.where('units.currentTenant').equals(req.query.currentTenant);
    }

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Property.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const properties = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: properties.length,
      pagination,
      data: properties
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public properties (available only)
// @route   GET /api/properties/public
// @access  Public
exports.getPublicProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ 
      isPublished: true 
    })
      .select('title propertyCode basePrice address type images units numberOfUnits')
      .limit(6)
      .sort('-createdAt');

    // Add available units count to each property
    const propertiesWithAvailability = properties.map(prop => {
      const propObj = prop.toObject();
      propObj.availableUnits = prop.units?.filter(u => u.status === 'available').length || 0;
      return propObj;
    });

    res.status(200).json({
      success: true,
      count: propertiesWithAvailability.length,
      data: propertiesWithAvailability
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'name email phone')
      .populate('units.currentTenant', 'name email phone');

    if (!property) {
      return next(new ErrorResponse(`Property not found with id of ${req.params.id}`, 404));
    }

    // Increment views
    property.views += 1;
    await property.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Landlord/Admin)
exports.createProperty = async (req, res, next) => {
  try {
    // Add landlord to req.body
    req.body.landlord = req.user.id;

    // Handle location coordinates - set default if not provided
    if (req.body.lat && req.body.lng) {
      req.body.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      };
    } else {
      // Default to Nairobi coordinates if not provided
      req.body.location = {
        type: 'Point',
        coordinates: [36.817223, -1.286389] // Default: Nairobi
      };
    }

    // Check if property code already exists
    const existingProperty = await Property.findOne({ propertyCode: req.body.propertyCode });
    if (existingProperty) {
      return next(new ErrorResponse('Property code already exists', 400));
    }

    const property = await Property.create(req.body);

    // Add property to landlord's properties array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { properties: property._id }
    });

    res.status(201).json({
      success: true,
      data: property
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Landlord/Admin)
exports.updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return next(new ErrorResponse(`Property not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is property owner or admin
    if (property.landlord.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this property`, 401));
    }

    // Handle location coordinates if provided
    if (req.body.lat && req.body.lng) {
      req.body.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      };
    } else if (req.body.location === null || req.body.location === undefined) {
      // Keep existing location if not provided
      delete req.body.location;
    }

    // If number of units changed, regenerate units
    if (req.body.numberOfUnits && req.body.numberOfUnits !== property.numberOfUnits) {
      req.body.units = undefined; // Will be regenerated by pre-save hook
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Landlord/Admin)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return next(new ErrorResponse(`Property not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is property owner or admin
    if (property.landlord.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this property`, 401));
    }

    // Remove property from landlord's properties array
    await User.findByIdAndUpdate(property.landlord, {
      $pull: { properties: property._id }
    });

    // Use deleteOne() instead of remove() (which is deprecated)
    await property.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get available units for a property
// @route   GET /api/properties/:id/units
// @access  Public
exports.getAvailableUnits = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return next(new ErrorResponse('Property not found', 404));
    }
    
    const availableUnits = property.units.filter(u => u.status === 'available');
    
    res.status(200).json({
      success: true,
      count: availableUnits.length,
      data: availableUnits
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update unit status
// @route   PUT /api/properties/:propertyId/units/:unitId
// @access  Private
exports.updateUnitStatus = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.propertyId);
    
    if (!property) {
      return next(new ErrorResponse('Property not found', 404));
    }
    
    const unit = property.units.id(req.params.unitId);
    
    if (!unit) {
      return next(new ErrorResponse('Unit not found', 404));
    }
    
    // Check authorization
    if (property.landlord.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this property', 403));
    }
    
    unit.status = req.body.status;
    if (req.body.tenantId) {
      unit.currentTenant = req.body.tenantId;
    } else if (req.body.status === 'available') {
      unit.currentTenant = undefined;
    }
    
    await property.save();
    
    // Update property status based on units
    const availableCount = property.units.filter(u => u.status === 'available').length;
    property.status = availableCount > 0 ? 'available' : 'occupied';
    await property.save();
    
    // Populate tenant info before sending response
    await property.populate('units.currentTenant', 'name email phone');
    
    res.status(200).json({
      success: true,
      data: property
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload property images
// @route   POST /api/properties/:id/images
// @access  Private (Landlord/Admin)
exports.uploadImages = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return next(new ErrorResponse(`Property not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is property owner or admin
    if (property.landlord.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`Not authorized`, 401));
    }

    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload at least one file', 400));
    }

    const files = req.files;

    // Handle image uploads
    const imageUrls = files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      isPrimary: property.images.length === 0 && index === 0
    }));

    property.images.push(...imageUrls);
    await property.save();

    res.status(200).json({
      success: true,
      data: property.images
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get properties by landlord
// @route   GET /api/properties/landlord/:landlordId
// @access  Private
exports.getPropertiesByLandlord = async (req, res, next) => {
  try {
    const properties = await Property.find({ landlord: req.params.landlordId });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby properties
// @route   GET /api/properties/nearby
// @access  Public
exports.getNearbyProperties = async (req, res, next) => {
  try {
    const { lat, lng, distance = 10000 } = req.query; // distance in meters

    if (!lat || !lng) {
      return next(new ErrorResponse('Please provide latitude and longitude', 400));
    }

    const properties = await Property.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(distance)
        }
      },
      isPublished: true
    }).limit(10);

    // Filter to only show properties with available units
    const propertiesWithAvailability = properties.filter(p => 
      p.units?.some(u => u.status === 'available')
    );

    res.status(200).json({
      success: true,
      count: propertiesWithAvailability.length,
      data: propertiesWithAvailability
    });
  } catch (err) {
    next(err);
  }
};