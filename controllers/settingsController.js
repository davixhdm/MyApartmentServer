const Settings = require('../models/Settings');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get public settings (for landing page)
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find({ public: true });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all settings (admin only)
// @route   GET /api/settings
// @access  Private/Admin
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find().sort('group key');
    
    // Convert array to object for easier frontend use
    const result = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Private/Admin
exports.getSetting = async (req, res, next) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Setting not found' 
      });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
};

// @desc    Create or update setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
exports.upsertSetting = async (req, res, next) => {
  try {
    const { value, type, description, group, public: isPublic } = req.body;
    
    // Parse value based on type if provided
    let parsedValue = value;
    if (type === 'number') parsedValue = Number(value);
    else if (type === 'boolean') parsedValue = Boolean(value);
    else if (type === 'date') parsedValue = new Date(value);
    else if (type === 'json' && typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid JSON format' 
        });
      }
    }

    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      {
        key: req.params.key,
        value: parsedValue,
        type: type || typeof parsedValue,
        description: description || '',
        group: group || 'general',
        public: isPublic || false,
        updatedBy: req.user.id
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
};

// @desc    Update multiple settings at once
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const results = [];
    const errors = [];

    // Process each setting
    for (const [key, value] of Object.entries(updates)) {
      try {
        // Skip if value is undefined or null
        if (value === undefined || value === null) continue;

        // Determine type automatically
        let type = typeof value;
        let parsedValue = value;

        // Handle special cases
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
          try {
            parsedValue = JSON.parse(value);
            type = 'json';
          } catch (e) {
            // Not valid JSON, keep as string
          }
        }

        // Check if setting exists
        const existing = await Settings.findOne({ key });
        
        let setting;
        if (existing) {
          // Update existing
          setting = await Settings.findOneAndUpdate(
            { key },
            {
              value: parsedValue,
              type,
              updatedBy: req.user.id
            },
            { new: true }
          );
        } else {
          // Create new
          setting = await Settings.create({
            key,
            value: parsedValue,
            type,
            updatedBy: req.user.id,
            public: false // Default to private for new settings
          });
        }
        
        results.push(setting);
      } catch (err) {
        errors.push({ key, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private/Admin
exports.deleteSetting = async (req, res, next) => {
  try {
    const setting = await Settings.findOneAndDelete({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Setting not found' 
      });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Initialize default settings
// @route   POST /api/settings/init
// @access  Private/Admin
exports.initDefaultSettings = async (req, res, next) => {
  try {
    const defaultSettings = [
      {
        key: 'companyName',
        value: 'MyApartment',
        type: 'string',
        group: 'company',
        public: true,
        description: 'Company name displayed on the website'
      },
      {
        key: 'paymentDueDay',
        value: 5,
        type: 'number',
        group: 'payment',
        public: true,
        description: 'Day of month when rent is due (1-31)'
      },
      {
        key: 'contactEmail',
        value: 'info@myapartment.com',
        type: 'string',
        group: 'contact',
        public: true,
        description: 'Primary contact email'
      },
      {
        key: 'contactPhone',
        value: '+254 700 123 456',
        type: 'string',
        group: 'contact',
        public: true,
        description: 'Primary contact phone number'
      },
      {
        key: 'address',
        value: '123 Main Street, Nairobi, Kenya',
        type: 'string',
        group: 'contact',
        public: true,
        description: 'Office address'
      },
      {
        key: 'website',
        value: 'https://myapartment.com',
        type: 'string',
        group: 'company',
        public: true,
        description: 'Company website URL'
      },
      {
        key: 'systemStartTime',
        value: new Date().toISOString(),
        type: 'date',
        group: 'system',
        public: false,
        description: 'System initialization timestamp'
      }
    ];

    const results = [];
    for (const setting of defaultSettings) {
      const existing = await Settings.findOne({ key: setting.key });
      if (!existing) {
        const newSetting = await Settings.create({
          ...setting,
          updatedBy: req.user.id
        });
        results.push(newSetting);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Default settings initialized',
      data: results
    });
  } catch (err) {
    next(err);
  }
};