import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4012/api/v1',
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
      return Promise.reject(new Error('Network error. Please check your connection. Make sure the backend server is running on port 4012.'));
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