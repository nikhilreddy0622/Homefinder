# Homefinder - Real Estate Platform

## Project Structure
- `/` - Frontend (React + Vite)
- `/homefinder-backend` - Backend (Node.js + Express)

## Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (connection details provided)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd homefinder-backend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Backend Configuration
Create a `config/config.env` file in the backend directory with the following:

```env
NODE_ENV=development
PORT=4012
MONGO_URI=mongodb+srv://Rentify:Nikhil9189@rentify.q9wcooo.mongodb.net/?appName=Rentify
CLIENT_URL=http://localhost:5173

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Homefinder

# File Upload
FILE_UPLOAD_PATH=./public/uploads
MAX_FILE_UPLOAD=10000000
```

#### Frontend Configuration
Create a `.env` file in the root directory with:

```env
VITE_API_URL=http://localhost:4012/api/v1
```

### 3. Run the Application

```bash
# Terminal 1: Start the backend server
cd homefinder-backend
npm run dev

# Terminal 2: Start the frontend development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4012/api/v1

## Deployment

For production deployment, refer to [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Common Issues and Solutions

### Network Error: Connection Refused
If you see "Network error. Please check your connection" in the browser console:

1. Ensure the backend server is running on port 4012
2. Check that the MongoDB Atlas database is accessible
3. Verify environment variables are correctly set
4. Confirm there are no firewall issues blocking the port

### Image Loading Issues
If property images are not loading:
1. Check that the backend server is running on the correct port (4012)
2. Verify the `FILE_UPLOAD_PATH` directory exists and has write permissions
3. Ensure the frontend and backend are using consistent ports in their configurations

## API Endpoints
- Authentication: `/api/v1/auth`
- Properties: `/api/v1/properties`
- Bookings: `/api/v1/bookings`
- Chats: `/api/v1/chats`
- Utilities: `/api/v1/utils`

## Development
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + MongoDB Atlas (Mongoose)
- Real-time features: Socket.IO