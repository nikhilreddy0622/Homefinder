const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Set token from cookie
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user is the owner of a resource
exports.isOwner = (model, idField = 'id') => {
  return asyncHandler(async (req, res, next) => {
    let resource;
    
    // Get resource from model
    if (model.modelName === 'Property') {
      resource = await model.findById(req.params[idField]);
    } else if (model.modelName === 'Booking') {
      resource = await model.findById(req.params[idField]).populate('property');
      if (resource) {
        resource = resource.property;
      }
    }
    
    if (!resource) {
      return next(
        new ErrorResponse(`No resource found with id of ${req.params[idField]}`, 404)
      );
    }
    
    // Check if user is the owner of the resource
    if (resource.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this route`,
          403
        )
      );
    }
    
    next();
  });
};