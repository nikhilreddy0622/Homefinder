const path = require('path');
const fs = require('fs').promises; // Use promises version for async operations
const ErrorResponse = require('../../utils/errorResponse');

/**
 * Handle property image uploads
 * @param {Object} req - Express request object
 * @param {Array} existingImages - Array of existing image URLs
 * @returns {Promise<Array>} Array of image URLs
 */
exports.handleImageUploads = async (req, existingImages = []) => {
  let images = [...existingImages];
  
  // Handle new file uploads
  if (req.files && req.files.images) {
    const newImages = [];
    
    // Handle single or multiple files
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    // Limit to 10 images total
    if (images.length + files.length > 10) {
      throw new ErrorResponse('You can upload maximum 10 images', 400);
    }
    
    // Process all files in parallel for better performance
    const uploadPromises = files.map(async (file) => {
      // Make sure the image is a photo
      if (!file.mimetype.startsWith('image')) {
        throw new ErrorResponse('Please upload an image file', 400);
      }

      // Check filesize
      if (file.size > process.env.MAX_FILE_UPLOAD) {
        throw new ErrorResponse(
          `Please upload an image less than ${process.env.MAX_FILE_UPLOAD / 1000000}MB`,
          400
        );
      }

      // Create custom filename
      const fileName = `photo_${req.user.id}_${Date.now()}_${Math.floor(Math.random() * 1000000)}${path.parse(file.name).ext}`;

      // Move file to public/uploads
      const uploadPath = path.join(__dirname, '..', '..', 'public', 'uploads', fileName);
      
      try {
        await file.mv(uploadPath);
        // Store complete URL instead of relative path
        // Use the server's configured port explicitly to avoid issues with req.get('host')
        const port = process.env.PORT || 4012;
        // Construct URL with explicit port to ensure consistency
        return `http://localhost:${port}/uploads/${fileName}`;
      } catch (err) {
        console.error('File upload error:', err);
        throw new ErrorResponse('Problem with file upload', 500);
      }
    });
    
    // Wait for all uploads to complete
    try {
      const uploadedImages = await Promise.all(uploadPromises);
      newImages.push(...uploadedImages);
    } catch (error) {
      throw error;
    }
    
    // Add new images to the existing ones
    images = [...images, ...newImages];
  }
  
  return images;
};

/**
 * Delete property images from file system
 * @param {Array} imageUrls - Array of image URLs to delete
 */
exports.deletePropertyImages = async (imageUrls) => {
  if (imageUrls && imageUrls.length > 0) {
    // Delete all files in parallel
    const deletePromises = imageUrls.map(async (imageUrl) => {
      try {
        // Extract filename from URL
        const fileName = imageUrl.split('/').pop();
        const fullPath = path.join(__dirname, '..', '..', 'public', 'uploads', fileName);
        
        // Delete file if it exists
        if (await fs.access(fullPath).then(() => true).catch(() => false)) {
          await fs.unlink(fullPath);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    });
    
    await Promise.all(deletePromises);
  }
};