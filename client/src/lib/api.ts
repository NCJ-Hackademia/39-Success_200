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
    const response = await api.post<LoginResponse>(
      "/api/auth/register",
      userData
    );
    return response.data;
  },

  // Login user
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      "/api/auth/login",
      credentials
    );
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

// Dashboard API functions
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async (): Promise<{
    issuesCount: number;
    bookingsCount: number;
    pendingIssues: number;
    completedBookings: number;
  }> => {
    try {
      const [issuesResponse, bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Issue[]>>("/api/issues"),
        api.get<ApiResponse<Booking[]>>("/api/consumer/bookings"),
      ]);

      const issues = issuesResponse.data.data || [];
      const bookings = bookingsResponse.data.data || [];

      // Calculate stats
      const pendingIssues = issues.filter(
        (issue) => issue.status === "open" || issue.status === "in_progress"
      ).length;

      const completedBookings = bookings.filter(
        (booking) => booking.status === "completed"
      ).length;

      return {
        issuesCount: issues.length,
        bookingsCount: bookings.length,
        pendingIssues,
        completedBookings,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },

  // Get admin dashboard statistics
  getAdminStats: async (): Promise<{
    totalUsers: number;
    totalConsumers: number;
    totalProviders: number;
    verifiedProviders: number;
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
  }> => {
    try {
      const [issuesResponse, providersResponse, consumersResponse] =
        await Promise.all([
          api.get<ApiResponse<Issue[]>>("/api/issues"),
          api.get<ApiResponse<User[]>>("/api/provider"),
          api.get<ApiResponse<User[]>>("/api/consumer"),
        ]);

      const issues = issuesResponse.data.data || [];
      const providers = providersResponse.data.data || [];
      const consumers = consumersResponse.data.data || [];

      const openIssues = issues.filter(
        (issue) => issue.status === "open"
      ).length;
      const inProgressIssues = issues.filter(
        (issue) => issue.status === "in_progress"
      ).length;
      const resolvedIssues = issues.filter(
        (issue) => issue.status === "resolved"
      ).length;
      const verifiedProviders = providers.filter(
        (provider) => provider.providerDetails?.verified === true
      ).length;

      return {
        totalUsers: providers.length + consumers.length,
        totalConsumers: consumers.length,
        totalProviders: providers.length,
        verifiedProviders,
        totalIssues: issues.length,
        openIssues,
        inProgressIssues,
        resolvedIssues,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  },

  // Get provider dashboard statistics
  getProviderStats: async (): Promise<{
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalEarnings: number;
    thisMonthEarnings: number;
    averageRating: number;
    completionRate: number;
  }> => {
    try {
      // Try to get provider bookings and statistics
      const [bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Booking[]>>("/api/provider/bookings"),
      ]);

      const bookings = bookingsResponse.data.data || [];
      const completed = bookings.filter(
        (booking) => booking.status === "completed"
      );
      const pending = bookings.filter(
        (booking) =>
          booking.status === "pending" || booking.status === "in_progress"
      );
      const cancelled = bookings.filter(
        (booking) => booking.status === "cancelled"
      );

      const totalEarnings = completed.reduce(
        (sum, booking) => sum + (booking.finalCost || 0),
        0
      );

      // Calculate this month's earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthBookings = completed.filter((booking) => {
        const bookingDate = new Date(booking.updatedAt);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      });
      const thisMonthEarnings = thisMonthBookings.reduce(
        (sum, booking) => sum + (booking.finalCost || 0),
        0
      );

      // Calculate average rating
      const ratingsSum = completed.reduce(
        (sum, booking) => sum + (booking.rating || 0),
        0
      );
      const averageRating =
        completed.length > 0 ? ratingsSum / completed.length : 0;

      const completionRate =
        bookings.length > 0 ? (completed.length / bookings.length) * 100 : 0;

      return {
        totalBookings: bookings.length,
        completedBookings: completed.length,
        pendingBookings: pending.length,
        cancelledBookings: cancelled.length,
        totalEarnings,
        thisMonthEarnings,
        averageRating,
        completionRate,
      };
    } catch (error) {
      console.error("Error fetching provider stats:", error);
      // Return default values if the endpoint fails
      return {
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        averageRating: 0,
        completionRate: 0,
      };
    }
  },

  // Get consumer dashboard statistics
  getConsumerStats: async (): Promise<{
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    totalSpent: number;
    thisMonthSpent: number;
    averageRating: number;
  }> => {
    try {
      const [issuesResponse, bookingsResponse] = await Promise.all([
        api.get<ApiResponse<Issue[]>>("/api/issues"),
        api.get<ApiResponse<Booking[]>>("/api/consumer/bookings"),
      ]);

      const issues = issuesResponse.data.data || [];
      const bookings = bookingsResponse.data.data || [];

      // Calculate issue stats
      const openIssues = issues.filter(
        (issue) => issue.status === "open"
      ).length;
      const inProgressIssues = issues.filter(
        (issue) => issue.status === "in_progress"
      ).length;
      const resolvedIssues = issues.filter(
        (issue) => issue.status === "resolved"
      ).length;

      // Calculate booking stats
      const completed = bookings.filter(
        (booking) => booking.status === "completed"
      );
      const pending = bookings.filter(
        (booking) =>
          booking.status === "pending" || booking.status === "in_progress"
      );

      // Calculate spending
      const totalSpent = completed.reduce(
        (sum, booking) =>
          sum + (booking.finalCost || booking.estimatedCost || 0),
        0
      );

      // Calculate this month's spending
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthBookings = completed.filter((booking) => {
        const bookingDate = new Date(booking.updatedAt);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      });
      const thisMonthSpent = thisMonthBookings.reduce(
        (sum, booking) =>
          sum + (booking.finalCost || booking.estimatedCost || 0),
        0
      );

      // Calculate average rating given by consumer
      const ratingsGiven = completed.filter(
        (booking) => booking.rating && booking.rating > 0
      );
      const averageRating =
        ratingsGiven.length > 0
          ? ratingsGiven.reduce(
              (sum, booking) => sum + (booking.rating || 0),
              0
            ) / ratingsGiven.length
          : 0;

      return {
        totalIssues: issues.length,
        openIssues,
        inProgressIssues,
        resolvedIssues,
        totalBookings: bookings.length,
        completedBookings: completed.length,
        pendingBookings: pending.length,
        totalSpent,
        thisMonthSpent,
        averageRating,
      };
    } catch (error) {
      console.error("Error fetching consumer stats:", error);
      throw error;
    }
  },

  // Get issues
  getIssues: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Issue[]>> => {
    const response = await api.get<ApiResponse<Issue[]>>("/api/issues", {
      params,
    });
    return response.data;
  },

  // Get bookings
  getBookings: async (
    params?: PaginationParams
  ): Promise<ApiResponse<Booking[]>> => {
    const response = await api.get<ApiResponse<Booking[]>>(
      "/api/consumer/bookings",
      {
        params,
      }
    );
    return response.data;
  },
};

// Issues API functions
export const issuesAPI = {
  // Get all issues with pagination
  getIssues: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    success: boolean;
    data: Issue[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: Issue[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>("/api/issues", { params });
    return response.data;
  },

  // Get issue by ID
  getIssueById: async (id: string): Promise<ApiResponse<Issue>> => {
    const response = await api.get<ApiResponse<Issue>>(`/api/issues/${id}`);
    return response.data;
  },

  // Create new issue
  createIssue: async (issueData: {
    title: string;
    description: string;
    category: string;
    location: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    priority?: string;
    images?: string[];
    estimatedCost?: number;
  }): Promise<ApiResponse<Issue>> => {
    const response = await api.post<ApiResponse<Issue>>(
      "/api/issues",
      issueData
    );
    return response.data;
  },

  // Update issue
  updateIssue: async (
    id: string,
    updateData: Partial<Issue>
  ): Promise<ApiResponse<Issue>> => {
    const response = await api.put<ApiResponse<Issue>>(
      `/api/issues/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete issue
  deleteIssue: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/issues/${id}`);
    return response.data;
  },

  // Upvote/downvote issue
  upvoteIssue: async (
    id: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      upvotes: number;
      hasUpvoted: boolean;
    };
  }> => {
    const response = await api.patch<{
      success: boolean;
      message: string;
      data: {
        upvotes: number;
        hasUpvoted: boolean;
      };
    }>(`/api/issues/${id}/upvote`);
    return response.data;
  },
};

// Services API functions
export const servicesAPI = {
  // Get all services with filtering
  getServices: async (params?: {
    category?: string;
    provider?: string;
    available?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>("/api/services", {
      params,
    });
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id: string): Promise<ApiResponse<Service>> => {
    const response = await api.get<ApiResponse<Service>>(`/api/services/${id}`);
    return response.data;
  },

  // Create new service (Provider only)
  createService: async (serviceData: {
    name: string;
    description: string;
    category: string;
    price: number;
  }): Promise<ApiResponse<Service>> => {
    const response = await api.post<ApiResponse<Service>>(
      "/api/services",
      serviceData
    );
    return response.data;
  },

  // Update service (Provider/Admin)
  updateService: async (
    id: string,
    updateData: Partial<Service>
  ): Promise<ApiResponse<Service>> => {
    const response = await api.put<ApiResponse<Service>>(
      `/api/services/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete service (Provider/Admin)
  deleteService: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/services/${id}`);
    return response.data;
  },

  // Get services by provider
  getProviderServices: async (
    providerId?: string
  ): Promise<ApiResponse<Service[]>> => {
    const url = providerId
      ? `/api/services?provider=${providerId}`
      : "/api/services?provider=current";
    const response = await api.get<ApiResponse<Service[]>>(url);
    return response.data;
  },
};

// Categories API functions
export const categoriesAPI = {
  // Get all categories
  getCategories: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>("/api/categories");
    return response.data;
  },
};

export default api;
