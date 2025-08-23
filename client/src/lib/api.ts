import axios from "axios";
import { useUserStore } from "../store/userStore";
import type {
  ApiResponse,
  LoginResponse,
  User,
  Issue,
  Service,
  Booking,
  PaginationParams,
} from "../types";

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
    // Get token from Zustand store or fallback to localStorage
    const storeToken = useUserStore.getState().token;
    const localToken =
      typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    const token = storeToken || localToken;

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
      const { clearAuth } = useUserStore.getState();
      clearAuth();

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

// Authentication API functions
export const authAPI = {
  // Register user
  register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/register", userData);
    return response.data;
  },

  // Login user
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  // Logout user (client-side cleanup)
  logout: () => {
    const { clearAuth } = useUserStore.getState();
    clearAuth();

    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user-storage");
    }
  },
};

export default api;
