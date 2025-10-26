const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const fileupload = require('express-fileupload');
const path = require('path');

// Load environment variables
const configPath = path.resolve(__dirname, 'config', 'config.env');
dotenv.config({ path: configPath });

// Set default NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Route files
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chats');
const utilsRoutes = require('./routes/utils');

// Middleware
const errorHandler = require('./middleware/error');

// Models
const Message = require('./models/Message');

// Initialize app
const app = express();

// Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Add connection timeout settings to prevent infinite connections
  pingTimeout: 60000,
  pingInterval: 25000
});

// Set up Socket.io in app locals for access in routes
app.set('io', io);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
app.use(fileupload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: process.env.NODE_ENV === 'development'
}));

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Set static folder BEFORE security middleware to avoid conflicts
app.use(express.static(path.join(__dirname, 'public')));

// Add specific CORS headers for static files
app.use('/uploads', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Security headers - configure helmet to allow images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://your-domain.com", "data:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Sanitize data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression
app.use(compression());

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/utils', utilsRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 4012
  });
});

// Error handler
app.use(errorHandler);

// Store connected users
const connectedUsers = new Map();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = decoded.id;
    next();
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // Store user connection
  connectedUsers.set(socket.userId, socket.id);
  
  // Join room for user
  socket.join(socket.userId);
  
  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { recipientId, propertyId, content } = data;
      
      // Validate input
      if (!recipientId || !propertyId || !content) {
        socket.emit('message_error', { error: 'Invalid message data' });
        return;
      }
    } catch (error) {
      socket.emit('message_error', { error: 'Failed to handle message' });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    const { userId, propertyId } = data;
    // Broadcast typing event to recipient
    socket.to(userId).emit('typing', {
      userId: socket.userId,
      propertyId
    });
  });
  
  // Handle stop typing indicator
  socket.on('stop_typing', (data) => {
    const { userId, propertyId } = data;
    // Broadcast stop typing event to recipient
    socket.to(userId).emit('stop_typing', {
      userId: socket.userId,
      propertyId
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from connected users
    connectedUsers.delete(socket.userId);
  });
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Additional options for Atlas connection
  serverSelectionTimeoutMS: 30000, // Increase timeout for Atlas
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => console.log('MongoDB Atlas connected successfully'))
.catch(err => {
  console.error('MongoDB Atlas connection error:', err);
  process.exit(1); // Exit if we can't connect to the database
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 4012;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});