const Property = require('../models/Property');
const Booking = require('../models/Booking');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { requirePropertyOwnership } = require('../middleware/propertyAuth');
const path = require('path');
const fs = require('fs');
const { handleImageUploads, deletePropertyImages } = require('../utils/properties/imageHandler');
const { getPropertiesWithAvailability, checkPropertyAvailability } = require('../utils/properties/availability');

// Utility function to correct image URLs
const correctImageUrls = (property) => {
  if (property.images && Array.isArray(property.images)) {
    return property.images.map(imageUrl => {
      // If the image URL contains localhost with wrong port, replace it with correct configuration
      if (imageUrl && typeof imageUrl === 'string') {
        // Handle various incorrect port scenarios
        if (imageUrl.includes('localhost:4011')) {
          // In production, use the Render URL; in development, use localhost:4012
          const correctUrl = process.env.NODE_ENV === 'production' 
            ? 'https://homefinder-backend-xopc.onrender.com' 
            : 'http://localhost:4012';
          return imageUrl.replace('localhost:4011', `${correctUrl.replace('http://', '').replace('https://', '')}`);
        }
        // Handle case where there's no port specified or wrong port
        const localhostRegex = /http:\/\/localhost(:\d+)?\//;
        if (localhostRegex.test(imageUrl)) {
          // In production, use the Render URL; in development, use localhost:4012
          const correctUrl = process.env.NODE_ENV === 'production' 
            ? 'https://homefinder-backend-xopc.onrender.com' 
            : 'http://localhost:4012';
          // Replace with correct base URL
          return imageUrl.replace(localhostRegex, `${correctUrl}/`);
        }
      }
      return imageUrl;
    });
  }
  return property.images;
};

// Utility function to correct property data
const correctPropertyData = (property) => {
  if (!property) return property;
  
  // Create a copy of the property object
  const correctedProperty = { ...property };
  
  // Correct image URLs
  correctedProperty.images = correctImageUrls(property);
  
  return correctedProperty;
};

// @desc    Get all properties
// @route   GET /api/v1/properties
// @access  Public
exports.getProperties = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get all properties with availability status
// @route   GET /api/v1/properties/with-availability
// @access  Public
exports.getPropertiesWithAvailability = asyncHandler(async (req, res, next) => {
  try {
    // Get all properties and populate owner with id, name, and email
    const properties = await Property.find().populate('owner', '_id name email');
    
    // Get current date
    const currentDate = new Date();
    
    // Get all confirmed bookings that haven't ended yet
    const activeBookings = await Booking.find({
      status: 'confirmed',
      endDate: { $gte: currentDate }
    }).select('property startDate endDate');
    
    // Create a map of property IDs to their booking status
    const propertyBookingMap = {};
    activeBookings.forEach(booking => {
      if (!propertyBookingMap[booking.property]) {
        propertyBookingMap[booking.property] = [];
      }
      propertyBookingMap[booking.property].push({
        startDate: booking.startDate,
        endDate: booking.endDate
      });
    });
    
    // Add availability status to each property and correct image URLs
    const propertiesWithAvailability = properties.map(property => {
      // Check if property has any active bookings
      const bookings = propertyBookingMap[property._id] || [];
      const isBooked = bookings.length > 0;
      
      // Correct image URLs
      const correctedProperty = correctPropertyData(property.toObject());
      
      return {
        ...correctedProperty,
        isBooked,
        activeBookings: bookings
      };
    });
    
    res.status(200).json({
      success: true,
      count: propertiesWithAvailability.length,
      data: propertiesWithAvailability
    });
  } catch (error) {
    console.error('Error fetching properties with availability:', error);
    return next(new ErrorResponse('Failed to fetch properties with availability', 500));
  }
});

// @desc    Check property availability for specific dates
// @route   POST /api/v1/properties/:id/check-availability
// @access  Public
exports.checkPropertyAvailability = checkPropertyAvailability;

// @desc    Get single property
// @route   GET /api/v1/properties/:id
// @access  Public
exports.getProperty = asyncHandler(async (req, res, next) => {
  console.log('=== GET PROPERTY REQUEST ===');
  console.log('Property ID:', req.params.id);
  
  const property = await Property.findById(req.params.id).populate('owner', '_id name email');
  console.log('Found property:', property);

  if (!property) {
    console.log('Property not found with ID:', req.params.id);
    return next(
      new ErrorResponse(`No property found with id of ${req.params.id}`, 404)
    );
  }

  // Log the property owner information
  console.log('Property owner:', property.owner);
  console.log('Property owner ID:', property.owner._id || property.owner);
  
  // Log the complete property object before correction
  console.log('Property before correction:', JSON.stringify(property.toObject(), null, 2));

  // Correct image URLs before sending response
  const correctedProperty = correctPropertyData(property.toObject());
  console.log('Property after correction:', JSON.stringify(correctedProperty, null, 2));

  res.status(200).json({
    success: true,
    data: correctedProperty
  });
});

// @desc    Create new property
// @route   POST /api/v1/properties
// @access  Private
exports.createProperty = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.owner = req.user.id;

  // Handle file uploads
  if (req.files && req.files.images) {
    try {
      console.time('Image Upload Processing');
      req.body.images = await handleImageUploads(req);
      console.timeEnd('Image Upload Processing');
    } catch (error) {
      return next(error);
    }
  } else {
    return next(new ErrorResponse('Please upload at least one image', 400));
  }

  // Handle amenities - ensure it's an array
  if (req.body.amenities) {
    if (typeof req.body.amenities === 'string') {
      // If it's a comma-separated string, convert to array
      req.body.amenities = req.body.amenities.split(',').map(item => item.trim()).filter(item => item);
    } else if (!Array.isArray(req.body.amenities)) {
      // If it's not an array, make it an array
      req.body.amenities = [req.body.amenities];
    }
  } else {
    // Default amenities if none provided
    req.body.amenities = ['Basic'];
  }

  // Convert numeric fields to proper types
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.deposit) req.body.deposit = Number(req.body.deposit);
  if (req.body.bedrooms) req.body.bedrooms = Number(req.body.bedrooms);
  if (req.body.bathrooms) req.body.bathrooms = Number(req.body.bathrooms);
  if (req.body.area) req.body.area = Number(req.body.area);

  console.time('Property Creation');
  const property = await Property.create(req.body);
  console.timeEnd('Property Creation');

  // Correct image URLs before sending response
  const correctedProperty = correctPropertyData(property);

  res.status(201).json({
    success: true,
    data: correctedProperty
  });
});

// @desc    Update property
// @route   PUT /api/v1/properties/:id
// @access  Private
exports.updateProperty = asyncHandler(async (req, res, next) => {
  let property = await Property.findById(req.params.id);

  if (!property) {
    return next(
      new ErrorResponse(`No property found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is property owner
  if (property.owner.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this property`,
        401
      )
    );
  }

  // Handle file uploads
  let images = [];
  
  // If existing images are provided, use them in the order they were sent
  if (req.body.existingImages) {
    if (Array.isArray(req.body.existingImages)) {
      images = [...req.body.existingImages];
    } else {
      images = [req.body.existingImages];
    }
  } else if (property.images) {
    // If no existing images provided but property has images, keep them in original order
    images = [...property.images];
  }
  
  // Handle new file uploads
  if (req.files && req.files.images) {
    try {
      console.time('Image Upload Processing');
      // Pass the current images array to maintain order
      images = await handleImageUploads(req, images);
      console.timeEnd('Image Upload Processing');
    } catch (error) {
      return next(error);
    }
  }
  
  // Update the images in req.body
  req.body.images = images;

  // Handle amenities - ensure it's an array
  if (req.body.amenities) {
    if (typeof req.body.amenities === 'string') {
      // If it's a comma-separated string, convert to array
      req.body.amenities = req.body.amenities.split(',').map(item => item.trim()).filter(item => item);
    } else if (!Array.isArray(req.body.amenities)) {
      // If it's not an array, make it an array
      req.body.amenities = [req.body.amenities];
    }
  }

  // Convert numeric fields to proper types
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.deposit) req.body.deposit = Number(req.body.deposit);
  if (req.body.bedrooms) req.body.bedrooms = Number(req.body.bedrooms);
  if (req.body.bathrooms) req.body.bathrooms = Number(req.body.bathrooms);
  if (req.body.area) req.body.area = Number(req.body.area);

  console.time('Property Update');
  property = await Property.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  console.timeEnd('Property Update');

  // Correct image URLs before sending response
  const correctedProperty = correctPropertyData(property);

  res.status(200).json({
    success: true,
    data: correctedProperty
  });
});

// @desc    Delete property
// @route   DELETE /api/v1/properties/:id
// @access  Private
exports.deleteProperty = asyncHandler(async (req, res, next) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return next(
      new ErrorResponse(`No property found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is property owner
  if (property.owner.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this property`,
        401
      )
    );
  }

  // Delete images from file system
  await deletePropertyImages(property.images);

  await property.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current user's properties
// @route   GET /api/v1/properties/my-properties
// @access  Private
exports.getMyProperties = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching properties for user:', req.user.id);
    const properties = await Property.find({ owner: req.user.id })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('Found properties:', properties.length);
    
    // Correct image URLs for all properties
    const correctedProperties = properties.map(property => {
      const corrected = correctPropertyData(property.toObject());
      console.log('Corrected property:', corrected._id, corrected.title);
      return corrected;
    });
    
    res.status(200).json({
      success: true,
      count: correctedProperties.length,
      data: correctedProperties
    });
  } catch (error) {
    console.error('Error fetching user properties:', error);
    return next(new ErrorResponse('Failed to fetch your properties', 500));
  }
});

// @desc    Reverse geocode coordinates to address
// @route   POST /api/v1/properties/geocode/reverse
// @access  Public
// @deprecated Use the geocoding utility module instead
exports.reverseGeocode = asyncHandler(async (req, res, next) => {
  return next(new ErrorResponse('This endpoint is deprecated. Use /api/v1/utils/geocode/reverse instead.', 400));
});

// @desc    Forward geocode address to coordinates
// @route   POST /api/v1/properties/geocode/forward
// @access  Public
// @deprecated Use the geocoding utility module instead
exports.forwardGeocode = asyncHandler(async (req, res, next) => {
  return next(new ErrorResponse('This endpoint is deprecated. Use /api/v1/utils/geocode/forward instead.', 400));
});
