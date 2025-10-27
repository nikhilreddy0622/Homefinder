const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with your actual credentials
cloudinary.config({
  cloud_name: 'dz7mjfzaw', // Your actual cloud name
  api_key: '184896766842689', // Your API key
  api_secret: 'DNtdYzmflBAaSImF85wCU8lbYPE' // Your API secret
});

// Create storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'homefinder_properties',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
    ]
  }
});

module.exports = {
  cloudinary,
  storage
};
