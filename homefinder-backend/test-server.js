// Simple test to verify server can start
console.log('Testing server startup...');

try {
  // Try to load the server file
  require('./server.js');
  console.log('Server file loaded successfully');
} catch (error) {
  console.error('Error loading server:', error.message);
  process.exit(1);
}