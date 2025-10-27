const ErrorResponse = require('../../utils/errorResponse');

/**
 * Handle property images by storing external URLs
 * @param {Object} req - Express request object
 * @returns {Promise<Array>} Array of image URLs
 */
exports.handleImageUrls = async (req) => {
  let images = [];
  
  // Check if image URLs are provided in the request body
  if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
    // Validate each URL
    for (const url of req.body.imageUrls) {
      if (typeof url === 'string' && url.length > 0) {
        // Basic URL validation
        try {
          new URL(url);
          images.push(url);
        } catch (err) {
          throw new ErrorResponse(`Invalid image URL: ${url}`, 400);
        }
      }
    }
  }
  
  // If no image URLs provided, use placeholder images
  if (images.length === 0) {
    // Use a default placeholder image
    images.push('https://via.placeholder.com/700x500?text=Property+Image');
  }
  
  // Limit to 10 images
  if (images.length > 10) {
    images = images.slice(0, 10);
  }
  
  return images;
};

/**
 * No-op function for deleting images (since we're not storing files)
 * @param {Array} imageUrls - Array of image URLs
 */
exports.deletePropertyImages = async (imageUrls) => {
  // No operation needed since we're not storing files on the server
  return Promise.resolve();
};
