const Property = require('../models/Property');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

// Middleware to check if user owns a property
exports.requirePropertyOwnership = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return next(new ErrorResponse('Property ID is required', 400));
  }

  const property = await Property.findById(id);
  if (!property) {
    return next(new ErrorResponse('Property not found', 404));
  }

  // Check if the authenticated user owns this property
  if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Access denied. You do not own this property.', 403));
  }

  // Attach property to request for further use
  req.property = property;
  next();
});

// Middleware to prevent property owners from booking their own properties
exports.preventOwnerBooking = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.body;
  if (!propertyId) {
    return next(new ErrorResponse('Property ID is required', 400));
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new ErrorResponse('Property not found', 404));
  }

  // Check if the authenticated user owns this property
  if (property.owner.toString() === req.user.id) {
    return next(new ErrorResponse('You cannot book your own property', 403));
  }

  // Attach property to request for further use
  req.property = property;
  next();
});