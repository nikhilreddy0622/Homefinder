// Simple deploy script to verify environment
console.log('Starting deployment verification...');

// Check if required environment variables are set
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLIENT_URL'
];

console.log('Checking environment variables...');
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing environment variables:', missingEnvVars);
  process.exit(1);
} else {
  console.log('All required environment variables are set');
}

// Try to load dependencies
try {
  console.log('Loading dependencies...');
  require('express');
  require('mongoose');
  require('cors');
  require('dotenv');
  console.log('Dependencies loaded successfully');
} catch (error) {
  console.error('Error loading dependencies:', error.message);
  process.exit(1);
}

console.log('Deployment verification completed successfully');