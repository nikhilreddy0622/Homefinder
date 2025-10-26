const Property = require('../../models/Property');
const Booking = require('../../models/Booking');
const ErrorResponse = require('../../utils/errorResponse');
const asyncHandler = require('../../middleware/async');

/**
 * Get all properties with availability status
 * @route   GET /api/v1/properties/with-availability
 * @access  Public
 */
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
    
    // Add availability status to each property
    const propertiesWithAvailability = properties.map(property => {
      // Check if property has any active bookings
      const bookings = propertyBookingMap[property._id] || [];
      const isBooked = bookings.length > 0;
      
      return {
        ...property.toObject(),
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

/**
 * Check property availability for specific dates
 * @route   POST /api/v1/properties/:id/check-availability
 * @access  Public
 */
exports.checkPropertyAvailability = asyncHandler(async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    const propertyId = req.params.id;
    
    if (!startDate || !endDate) {
      return next(new ErrorResponse('Please provide both start and end dates', 400));
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new ErrorResponse('Invalid date format', 400));
    }
    
    if (start >= end) {
      return next(new ErrorResponse('End date must be after start date', 400));
    }
    
    // Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      property: propertyId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });
    
    const isAvailable = overlappingBookings.length === 0;
    
    res.status(200).json({
      success: true,
      data: {
        isAvailable,
        propertyId,
        startDate: start,
        endDate: end,
        overlappingBookings: overlappingBookings.length
      }
    });
  } catch (error) {
    console.error('Error checking property availability:', error);
    return next(new ErrorResponse('Failed to check property availability', 500));
  }
});