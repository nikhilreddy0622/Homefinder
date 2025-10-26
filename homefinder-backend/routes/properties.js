const express = require('express');
const {
  getProperties,
  getPropertiesWithAvailability,
  checkPropertyAvailability,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties
} = require('../controllers/properties');
const { protect } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Property = require('../models/Property');
const { reverseGeocode, forwardGeocode } = require('../utils/properties/geocoding');

const router = express.Router();

// Add route for properties with availability status
router
  .route('/with-availability')
  .get(getPropertiesWithAvailability);

// Add route for checking property availability
router
  .route('/:id/check-availability')
  .post(checkPropertyAvailability);

// Add route for user's properties
router
  .route('/my-properties')
  .get(protect, getMyProperties);

router
  .route('/')
  .get(advancedResults(Property, 'owner'), getProperties)
  .post(protect, createProperty);

router
  .route('/:id')
  .get(getProperty)
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

// Geocoding routes (moved from properties controller)
router.post('/geocode/reverse', reverseGeocode);
router.post('/geocode/forward', forwardGeocode);

module.exports = router;