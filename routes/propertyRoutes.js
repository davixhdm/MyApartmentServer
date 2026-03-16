const express = require('express');
const {
  getProperties,
  getPublicProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadImages,
  getPropertiesByLandlord,
  getNearbyProperties,
  getAvailableUnits,
  updateUnitStatus
} = require('../controllers/propertyController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/public', getPublicProperties);
router.get('/nearby', getNearbyProperties);
router.get('/landlord/:landlordId', getPropertiesByLandlord);
router.get('/:id/units', getAvailableUnits);
router.get('/:id', optionalAuth, getProperty);

// Protected routes
router.route('/')
  .get(optionalAuth, getProperties)
  .post(protect, authorize('landlord', 'admin'), createProperty);

router.route('/:id')
  .put(protect, authorize('landlord', 'admin'), updateProperty)
  .delete(protect, authorize('landlord', 'admin'), deleteProperty);

// Unit management
router.put('/:propertyId/units/:unitId', protect, authorize('landlord', 'admin'), updateUnitStatus);

// Image upload
router.post('/:id/images', 
  protect, 
  authorize('landlord', 'admin'),
  upload.array('images', 10),
  uploadImages
);

module.exports = router;