/**
 * Utility functions for image handling
 */

/**
 * Get full image URL from image path
 * Just like shareSpace-Copy, we use the image directly as-is
 * @param {string} imagePath - The image path (already processed by backend)
 * @returns {string} Image URL as-is
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // Return the image path as-is (whether it's a full URL, relative path, or data URL)
  // The backend already provides full URLs like "http://localhost:4012/uploads/filename.jpg"
  return imagePath;
};

/**
 * Get image display class based on container needs
 * @param {boolean} contain - Whether to use object-contain instead of object-cover
 * @returns {string} CSS class for image display
 */
export const getImageDisplayClass = (contain = false) => {
  return contain 
    ? 'w-full h-full object-contain' 
    : 'w-full h-full object-cover';
};

/**
 * Create image preview URL from file
 * @param {File} file - The image file
 * @returns {Promise<string>} Data URL for image preview
 */
export const createImagePreview = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {number} maxSize - Maximum file size in bytes (default 5MB)
 * @returns {Object} Validation result with isValid and message
 */
export const validateImageFile = (file, maxSize = 5 * 1024 * 1024) => {
  // Check if file is provided
  if (!file) {
    return { isValid: false, message: 'No file provided' };
  }
  
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return { isValid: false, message: 'Please upload an image file' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return { isValid: false, message: `Please upload an image less than ${maxSizeMB}MB` };
  }
  
  return { isValid: true, message: 'Valid image file' };
};