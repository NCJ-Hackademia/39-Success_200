import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or your preferred storage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common HTTP error statuses
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        // You can add redirect logic here
        // window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error("Access forbidden");
    }

    if (error.response?.status >= 500) {
      // Server error
      console.error("Server error:", error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;
