# Homefinder Backend

This is the backend service for the Homefinder real estate platform.

## Deployment Instructions

### Environment Variables

The following environment variables must be set:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 4012)

### Required Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server in development mode with nodemon

### Health Check

The server exposes a health check endpoint at `/api/v1/health`