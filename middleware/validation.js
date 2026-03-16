const { validationResult, body } = require('express-validator');

// Validation middleware
exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  };
};

// Common validations
exports.authValidations = {
  register: [
    body('name').notEmpty().withMessage('Name is required').trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['tenant', 'landlord']).withMessage('Invalid role')
  ],
  login: [
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ]
};

exports.propertyValidations = {
  create: [
    body('title').notEmpty().withMessage('Title is required').trim().isLength({ max: 100 }),
    body('description').notEmpty().withMessage('Description is required').isLength({ max: 500 }),
    body('price').isNumeric().withMessage('Price must be a number').custom(value => value > 0),
    body('address.street').notEmpty().withMessage('Street address is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('type').isIn(['apartment', 'house', 'commercial', 'land']).withMessage('Invalid property type'),
    body('bedrooms').optional().isInt({ min: 0 }),
    body('bathrooms').optional().isInt({ min: 0 }),
    body('area').isNumeric().withMessage('Area must be a number').custom(value => value > 0)
  ]
};