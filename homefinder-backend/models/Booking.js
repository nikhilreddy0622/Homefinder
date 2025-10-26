const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Please add a total price']
  },
  // Additional fields for demo booking
  leaseDuration: {
    type: Number
  },
  monthlyRent: {
    type: Number
  },
  totalRent: {
    type: Number
  },
  securityDeposit: {
    type: Number
  },
  platformFee: {
    type: Number
  },
  totalAmount: {
    type: Number
  },
  notes: {
    type: Map,
    of: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent user from booking the same property for overlapping dates
BookingSchema.index({ property: 1, startDate: 1, endDate: 1 }, { unique: true });

module.exports = mongoose.model('Booking', BookingSchema);