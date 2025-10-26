const { reverseGeocode, forwardGeocode } = require('../geocoding');
const ErrorResponse = require('../../utils/errorResponse');
const asyncHandler = require('../../middleware/async');

/**
 * Reverse geocode coordinates to address
 * @route   POST /api/v1/utils/geocode/reverse
 * @access  Public
 */
exports.reverseGeocode = asyncHandler(async (req, res, next) => {
  // Accept both formats: lat/lon and latitude/longitude
  const { lat, lon, latitude, longitude } = req.body;

  const actualLat = lat || latitude;
  const actualLon = lon || longitude;

  if (!actualLat || !actualLon) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }

  const result = await reverseGeocode(actualLat, actualLon);

  if (result.success) {
    res.status(200).json({
      success: true,
      address: result.address
    });
  } else {
    return next(new ErrorResponse(result.error, 400));
  }
});

/**
 * Forward geocode address to coordinates
 * @route   POST /api/v1/properties/geocode/forward
 * @access  Public
 */
exports.forwardGeocode = asyncHandler(async (req, res, next) => {
  const { address } = req.body;

  if (!address) {
    return next(new ErrorResponse('Please provide an address', 400));
  }

  const result = await forwardGeocode(address);

  if (result.success) {
    res.status(200).json({
      success: true,
      data: result
    });
  } else {
    return next(new ErrorResponse(result.error, 400));
  }
});