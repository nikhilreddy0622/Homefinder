const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { sendEmail, loadTemplate } = require('../utils/email');
const { preventOwnerBooking } = require('../middleware/propertyAuth');

// Utility function to correct image URLs
const correctImageUrls = (property) => {
  if (property && property.images && Array.isArray(property.images)) {
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
  return property && property.images ? property.images : [];
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

// @desc    Get bookings made by the current user (for properties owned by others)
// @access  Private
exports.getMyBookings = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching bookings for user:', req.user.id);
    const bookings = await Booking.find({ tenant: req.user.id })
      .populate({
        path: 'property',
        select: 'title location images owner _id',
        populate: {
          path: 'owner',
          select: 'name email _id'
        }
      })
      .populate({
        path: 'owner',
        select: 'name email _id'
      })
      .sort({ createdAt: -1 });
    
    console.log('Found bookings:', bookings.length);
    
    // Correct image URLs for all properties in bookings
    const correctedBookings = bookings.map(booking => {
      console.log('Processing booking:', booking._id);
      console.log('Raw booking data:', JSON.stringify(booking, null, 2));
      
      // Ensure we have proper property and owner data
      let bookingObj = booking.toObject ? booking.toObject() : booking;
      
      // Make sure property has _id
      if (bookingObj.property && !bookingObj.property._id && bookingObj.property.toString) {
        const propertyRef = bookingObj.property.toString();
        console.log('Setting property._id from reference:', propertyRef);
        if (propertyRef.match(/^[0-9a-fA-F]{24}$/)) {
          bookingObj.property._id = propertyRef;
        }
      }
      
      // Make sure owner has _id
      if (bookingObj.owner && !bookingObj.owner._id && bookingObj.owner.toString) {
        const ownerRef = bookingObj.owner.toString();
        console.log('Setting owner._id from reference:', ownerRef);
        if (ownerRef.match(/^[0-9a-fA-F]{24}$/)) {
          bookingObj.owner._id = ownerRef;
        }
      }
      
      // If property owner is missing but we have a separate owner field, use it
      if (bookingObj.property && !bookingObj.property.owner && bookingObj.owner) {
        console.log('Setting property owner from booking owner');
        bookingObj.property.owner = bookingObj.owner;
      }
      
      if (bookingObj.property) {
        const correctedProperty = correctPropertyData(bookingObj.property);
        bookingObj = {
          ...bookingObj,
          property: correctedProperty
        };
      }
      return bookingObj;
    });
    
    console.log('Sending corrected bookings:', correctedBookings.length);
    res.status(200).json({
      success: true,
      count: correctedBookings.length,
      data: correctedBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return next(new ErrorResponse('Failed to fetch your bookings', 500));
  }
});

// @desc    Get bookings made by others for properties owned by the current user
// @route   GET /api/v1/bookings/my-property-bookings
// @access  Private
exports.getMyPropertyBookings = asyncHandler(async (req, res, next) => {
  try {
    console.log('Fetching property bookings for user:', req.user.id);
    // First, get all properties owned by the current user
    const userProperties = await Property.find({ owner: req.user.id });
    const propertyIds = userProperties.map(property => property._id);
    
    console.log('User properties:', propertyIds);
    
    // Then, get all bookings for those properties
    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property', 'title location images')
      .populate('tenant', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('Found bookings:', bookings.length);
    
    // Correct image URLs for all properties in bookings
    const correctedBookings = bookings.map(booking => {
      if (booking.property) {
        const correctedProperty = correctPropertyData(booking.property.toObject());
        return {
          ...booking.toObject(),
          property: correctedProperty
        };
      }
      return booking.toObject();
    });
    
    res.status(200).json({
      success: true,
      count: correctedBookings.length,
      data: correctedBookings
    });
  } catch (error) {
    console.error('Error fetching property bookings:', error);
    return next(new ErrorResponse('Failed to fetch bookings for your properties', 500));
  }
});

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private
exports.getBookings = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    // For non-admin users, only show their bookings (as tenant or owner)
    res.advancedResults.data = res.advancedResults.data.filter(
      booking => booking.tenant._id.toString() === req.user.id || 
                 booking.owner._id.toString() === req.user.id
    );
  }
  
  // Correct image URLs for all properties in bookings
  const correctedData = res.advancedResults.data.map(booking => {
    if (booking.property) {
      const correctedProperty = correctPropertyData(booking.property);
      return {
        ...booking,
        property: correctedProperty
      };
    }
    return booking;
  });
  
  res.status(200).json({
    ...res.advancedResults,
    data: correctedData
  });
});

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('property', 'title location images')
    .populate('tenant', 'name email')
    .populate('owner', 'name email');

  if (!booking) {
    return next(
      new ErrorResponse(`No booking found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is booking owner or admin
  if (
    booking.tenant.toString() !== req.user.id &&
    booking.owner.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this booking`,
        401
      )
    );
  }

  // Correct image URLs for the property
  let correctedBooking = booking.toObject();
  if (booking.property) {
    correctedBooking.property = correctPropertyData(booking.property);
  }

  res.status(200).json({
    success: true,
    data: correctedBooking
  });
});

// @desc    Create new booking
// @route   POST /api/v1/properties/:propertyId/bookings
// @access  Private
exports.createBooking = asyncHandler(async (req, res, next) => {
  req.body.property = req.params.propertyId;
  req.body.tenant = req.user.id;

  const property = await Property.findById(req.params.propertyId).populate('owner', 'name email');

  if (!property) {
    return next(
      new ErrorResponse(`No property found with id of ${req.params.propertyId}`, 404)
    );
  }

  // Check if property is available
  if (property.status !== 'available') {
    return next(
      new ErrorResponse(`Property is not available for booking`, 400)
    );
  }

  // Add owner to booking from populated property
  req.body.owner = property.owner._id || property.owner;

  // Check for overlapping bookings
  const overlappingBookings = await Booking.find({
    property: req.params.propertyId,
    $or: [
      {
        startDate: { $lte: req.body.endDate },
        endDate: { $gte: req.body.startDate }
      }
    ]
  });

  if (overlappingBookings.length > 0) {
    return next(
      new ErrorResponse(`Property is already booked for these dates`, 400)
    );
  }

  const booking = await Booking.create(req.body);

  // Send confirmation emails
  const tenant = await User.findById(req.user.id);
  const owner = property.owner;

  // Send email to tenant
  const tenantHtml = loadTemplate('bookingTenantConfirmation', {
    userName: tenant.name,
    propertyTitle: property.title,
    propertyLocation: property.location,
    bookingId: booking._id,
    startDate: new Date(booking.startDate).toLocaleDateString(),
    endDate: new Date(booking.endDate).toLocaleDateString(),
    totalPrice: `₹${booking.totalPrice}`,
    status: booking.status,
    bookingUrl: `${process.env.CLIENT_URL}/booking/${booking._id}`,
    ownerEmail: owner.email
  });

  await sendEmail({
    email: tenant.email,
    subject: 'Homefinder Booking Confirmation',
    html: tenantHtml
  });

  // Send email to owner
  const ownerHtml = loadTemplate('bookingOwnerNotification', {
    userName: owner.name,
    propertyTitle: property.title,
    propertyLocation: property.location,
    bookingId: booking._id,
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    startDate: new Date(booking.startDate).toLocaleDateString(),
    endDate: new Date(booking.endDate).toLocaleDateString(),
    totalPrice: `₹${booking.totalPrice}`,
    status: booking.status,
    bookingUrl: `${process.env.CLIENT_URL}/booking/${booking._id}`
  });

  await sendEmail({
    email: owner.email,
    subject: 'Homefinder New Booking Request',
    html: ownerHtml
  });

  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Create demo booking (no payment required)
// @route   POST /api/v1/bookings/demo-booking
// @access  Private
exports.createDemoBooking = asyncHandler(async (req, res, next) => {
  try {
    const { 
      propertyId, 
      moveInDate, 
      leaseDuration, 
      monthlyRent, 
      totalRent, 
      securityDeposit, 
      platformFee, 
      totalAmount 
    } = req.body;

    // Validate required fields
    if (!propertyId || !moveInDate || !leaseDuration) {
      return next(
        new ErrorResponse('Property ID, move-in date, and lease duration are required', 400)
      );
    }

    // Validate date format
    const startDate = new Date(moveInDate);
    if (isNaN(startDate.getTime())) {
      return next(
        new ErrorResponse('Invalid move-in date format', 400)
      );
    }
    
    // Validate lease duration
    const months = parseInt(leaseDuration);
    if (isNaN(months) || months <= 0) {
      return next(
        new ErrorResponse('Lease duration must be a positive number', 400)
      );
    }

    // Check if property exists and get property details with populated owner
    const property = await Property.findById(propertyId).populate('owner', 'name email');
    if (!property) {
      return next(
        new ErrorResponse('Property not found', 404)
      );
    }

    // Check if property is available
    if (property.status === 'rented') {
      return next(
        new ErrorResponse('Property is already rented', 400)
      );
    }

    // Check if there are conflicting bookings
    const existingBooking = await Booking.findOne({
      property: propertyId,
      status: { $in: ['confirmed', 'pending'] },
      endDate: { $gte: startDate }
    });

    if (existingBooking) {
      return next(
        new ErrorResponse('Property is already booked for the selected dates', 400)
      );
    }

    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    // Calculate amounts
    const rent = monthlyRent || property.price || 0;
    const calculatedTotalRent = totalRent || (rent * months);
    const deposit = securityDeposit || Math.round(rent * 2);
    const fee = platformFee || 499;
    const totalWithFees = totalAmount || calculatedTotalRent + deposit + fee;

    // Create demo booking
    const booking = await Booking.create({
      tenant: req.user.id,
      property: propertyId,
      owner: property.owner._id || property.owner, // Use the owner ID
      startDate: startDate,
      endDate: endDate,
      leaseDuration: months,
      monthlyRent: rent,
      totalRent: calculatedTotalRent,
      securityDeposit: deposit,
      platformFee: fee,
      totalPrice: totalWithFees,
      totalAmount: totalWithFees,
      status: 'confirmed',
      notes: {
        demoMode: true,
        message: 'Demo booking - No payment processed'
      }
    });

    // Update property status to rented
    await Property.findByIdAndUpdate(propertyId, { 
      status: 'rented'
    });

    // Populate related data
    await booking.populate('property', 'title location');
    await booking.populate('tenant', 'name email');

    // Send confirmation emails to both user and owner
    try {
      // Get user and owner details
      const tenant = await User.findById(req.user.id);
      // Get owner from populated property
      const owner = property.owner;
      
      if (tenant && owner) {
        // Send confirmation email to tenant
        const tenantHtml = loadTemplate('bookingTenantConfirmation', {
          userName: tenant.name,
          propertyTitle: property.title,
          propertyLocation: property.location,
          bookingId: booking._id,
          startDate: startDate.toLocaleDateString(),
          endDate: endDate.toLocaleDateString(),
          totalPrice: `₹${totalWithFees}`,
          status: booking.status,
          bookingUrl: `${process.env.CLIENT_URL}/booking/${booking._id}`,
          ownerEmail: owner.email
        });

        await sendEmail({
          email: tenant.email,
          subject: 'Homefinder Booking Confirmation (Demo)',
          html: tenantHtml
        });
        
        // Send notification email to owner
        const ownerHtml = loadTemplate('bookingOwnerNotification', {
          userName: owner.name,
          propertyTitle: property.title,
          propertyLocation: property.location,
          bookingId: booking._id,
          tenantName: tenant.name,
          tenantEmail: tenant.email,
          startDate: startDate.toLocaleDateString(),
          endDate: endDate.toLocaleDateString(),
          totalPrice: `₹${totalWithFees}`,
          status: booking.status,
          bookingUrl: `${process.env.CLIENT_URL}/booking/${booking._id}`
        });

        await sendEmail({
          email: owner.email,
          subject: 'Homefinder New Booking Request (Demo)',
          html: ownerHtml
        });
      }
    } catch (emailError) {
      console.error('Failed to send booking confirmation emails:', emailError);
      // Don't fail the booking if emails fail
    }

    res.status(201).json({ 
      success: true, 
      data: booking,
      message: 'Demo booking confirmed successfully (No payment required)'
    });
  } catch (error) {
    console.error('Error creating demo booking:', error);
    return next(
      new ErrorResponse('Failed to create demo booking', 500)
    );
  }
});

// @desc    Update booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
exports.updateBooking = asyncHandler(async (req, res, next) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`No booking found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is booking owner or admin
  if (
    booking.tenant.toString() !== req.user.id &&
    booking.owner.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this booking`,
        401
      )
    );
  }

  booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Delete booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.deleteBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`No booking found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is booking owner or admin
  if (
    booking.tenant.toString() !== req.user.id &&
    booking.owner.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this booking`,
        401
      )
    );
  }

  await booking.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});
