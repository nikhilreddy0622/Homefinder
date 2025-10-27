import axios from 'axios';

// Determine the base URL based on the environment
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use the Render backend URL
  if (import.meta.env.MODE === 'production') {
    return 'https://homefinder-backend-xopc.onrender.com/api/v1';
  }
  
  // Default to localhost in development
  return 'http://localhost:4012/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection and make sure the backend server is accessible.'));
    }

    // Handle specific HTTP status codes
    switch (error.response.status) {
      case 401:
        // Remove token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/auth';
        break;
      default:
        break;
    }

    return Promise.reject(error);
  }
);

export default api;
