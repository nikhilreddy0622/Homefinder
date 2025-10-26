const express = require('express');
const {
  getBookings,
  getMyBookings,
  getMyPropertyBookings,
  getBooking,
  createBooking,
  createDemoBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookings');
const { protect } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Booking = require('../models/Booking');
const { preventOwnerBooking } = require('../middleware/propertyAuth');

const router = express.Router({ mergeParams: true });

// Add new routes for distinct booking types
router
  .route('/my-bookings')
  .get(protect, getMyBookings);

router
  .route('/my-property-bookings')
  .get(protect, getMyPropertyBookings);

router
  .route('/')
  .get(protect, advancedResults(Booking), getBookings)
  .post(protect, preventOwnerBooking, createBooking);

// Demo booking endpoint - skips payment
router
  .route('/demo-booking')
  .post(protect, preventOwnerBooking, createDemoBooking);

router
  .route('/:id')
  .get(protect, getBooking)
  .put(protect, updateBooking)
  .delete(protect, deleteBooking);

module.exports = router;