// Utility functions for property availability checking

/**
 * Check if a property is available for the given date range
 * @param {Object} property - The property object
 * @param {Date} startDate - The start date for the booking
 * @param {Date} endDate - The end date for the booking
 * @returns {Boolean} - Whether the property is available
 */
export const isPropertyAvailable = (property, startDate, endDate) => {
  // If property has no bookings data, assume it's available
  if (!property.activeBookings || property.activeBookings.length === 0) {
    return true;
  }
  
  // Check if the requested dates overlap with any existing bookings
  for (const booking of property.activeBookings) {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    
    // Check for overlap: 
    // (StartA <= EndB) and (EndA >= StartB)
    if (startDate <= bookingEnd && endDate >= bookingStart) {
      return false; // Overlapping booking found
    }
  }
  
  return true; // No overlapping bookings found
};

/**
 * Calculate the number of days between two dates
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {Number} - Number of days between the dates
 */
export const calculateDaysBetween = (startDate, endDate) => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return Math.round(Math.abs((start - end) / oneDay));
};

/**
 * Get property status with availability information
 * @param {Object} property - The property object
 * @returns {Object} - Status information including availability
 */
export const getPropertyStatus = (property) => {
  if (property.isBooked) {
    return {
      text: 'Already Booked',
      variant: 'destructive',
      isAvailable: false
    };
  }
  
  switch (property.status) {
    case 'rented':
      return {
        text: 'Rented',
        variant: 'secondary',
        isAvailable: false
      };
    case 'unavailable':
      return {
        text: 'Unavailable',
        variant: 'outline',
        isAvailable: false
      };
    case 'available':
    default:
      return {
        text: 'Available',
        variant: 'default',
        isAvailable: true
      };
  }
};