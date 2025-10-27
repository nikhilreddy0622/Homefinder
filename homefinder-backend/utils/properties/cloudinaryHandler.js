const ErrorResponse = require('../../utils/errorResponse');
const { cloudinary } = require('../cloudinary');

/**
 * Handle property image uploads to Cloudinary
 * @param {Object} req - Express request object
 * @param {Array} existingImages - Array of existing image URLs
 * @returns {Promise<Array>} Array of image URLs from Cloudinary
 */
exports.handleImageUploads = async (req, existingImages = []) => {
  // Check if Cloudinary is properly configured
  const config = cloudinary.config();
  if (!config.cloud_name || config.cloud_name === 'your-cloud-name') {
    throw new ErrorResponse('Cloudinary is not properly configured. Please check your cloud_name in utils/cloudinary.js', 500);
  }
  
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
      if (!file.mimetype || !file.mimetype.startsWith('image')) {
        throw new ErrorResponse('Please upload an image file', 400);
      }

      // Check filesize - limit to 10MB
      if (!file.size || file.size > 10 * 1024 * 1024) {
        throw new ErrorResponse(
          'Please upload an image less than 10MB',
          400
        );
      }

      // Check if file has data
      if (!file.data || file.data.length === 0) {
        throw new ErrorResponse('File is empty', 400);
      }

      // Upload to Cloudinary
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'homefinder_properties',
              transformation: [
                { width: 1200, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          
          // Pipe file buffer to upload stream
          uploadStream.end(file.data);
        });
        
        return result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        throw new ErrorResponse('Problem with image upload to Cloudinary: ' + err.message, 500);
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
 * Delete property images from Cloudinary
 * @param {Array} imageUrls - Array of image URLs to delete
 */
exports.deletePropertyImages = async (imageUrls) => {
  if (imageUrls && imageUrls.length > 0) {
    // Check if Cloudinary is properly configured
    const config = cloudinary.config();
    if (!config.cloud_name || config.cloud_name === 'your-cloud-name') {
      console.warn('Cloudinary is not properly configured. Skipping image deletion.');
      return;
    }
    
    // Delete all images in parallel
    const deletePromises = imageUrls.map(async (imageUrl) => {
      try {
        // Extract public ID from Cloudinary URL
        if (imageUrl && imageUrl.includes('res.cloudinary.com')) {
          // Extract the public ID from the Cloudinary URL
          // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{extension}
          const urlParts = imageUrl.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];
          
          // Delete from Cloudinary
          await cloudinary.uploader.destroy(`homefinder_properties/${publicId}`);
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    });
    
    await Promise.all(deletePromises);
  }
};
