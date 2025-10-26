const express = require('express');
const { reverseGeocode, forwardGeocode } = require('../utils/properties/geocoding');

const router = express.Router();

// Geocoding routes
router.post('/geocode/reverse', reverseGeocode);
router.post('/geocode/forward', forwardGeocode);

module.exports = router;