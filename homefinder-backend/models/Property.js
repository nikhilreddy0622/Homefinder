const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  deposit: {
    type: Number,
    required: [true, 'Please add a security deposit amount']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  city: {
    type: String,
    required: [true, 'Please add a city']
  },
  propertyType: {
    type: String,
    required: [true, 'Please add a property type'],
    enum: ['apartment', 'house', 'villa', 'studio', 'condo', 'townhouse']
  },
  bedrooms: {
    type: Number,
    required: [true, 'Please add number of bedrooms']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Please add number of bathrooms']
  },
  area: {
    type: Number,
    required: [true, 'Please add area in sq ft']
  },
  furnishing: {
    type: String,
    required: [true, 'Please add furnishing status'],
    enum: ['furnished', 'semi-furnished', 'unfurnished']
  },
  amenities: {
    type: [String],
    required: [true, 'Please add at least one amenity']
  },
  images: {
    type: [String],
    default: []
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'unavailable'],
    default: 'available'
  },
  availableFrom: {
    type: Date,
    required: [true, 'Please add availability date'],
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for text search
PropertySchema.index({
  title: 'text',
  description: 'text',
  location: 'text',
  city: 'text'
});

// Create geospatial index for location-based searches
// PropertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', PropertySchema);