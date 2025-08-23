// HACKADEMIA Type Definitions

// Re-export User interface from userStore for consistency
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "consumer" | "provider";
  avatar?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  // Provider-specific fields
  providerDetails?: {
    category: string; // plumber, electrician, carpenter, etc.
    verified: boolean;
    rating: number;
    completedJobs: number;
    description: string;
    services: string[];
  };
  // Consumer-specific fields
  consumerDetails?: {
    reportsCount: number;
    bookingsCount: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Location interface for GPS coordinates
export interface Location {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Issue/Report interface for citizen reports
export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  location: Location;
  reportedBy: string; // User ID
  reportedByUser?: User; // Populated user data
  assignedTo?: string; // Provider ID
  assignedProvider?: User; // Populated provider data
  images: string[]; // Array of image URLs
  upvotes: number;
  upvotedBy: string[]; // Array of user IDs
  estimatedCost?: number;
  actualCost?: number;
  estimatedDuration?: string; // e.g., "2 hours", "1 day"
  completionDate?: string;
  adminNotes?: string;
  providerNotes?: string;
  isVerified: boolean; // Admin verification
  createdAt: string;
  updatedAt: string;
}

// Issue categories
export enum IssueCategory {
  POTHOLE = "pothole",
  GARBAGE = "garbage",
  STREETLIGHT = "streetlight",
  WATER_SUPPLY = "water_supply",
  DRAINAGE = "drainage",
  ROAD_DAMAGE = "road_damage",
  ELECTRICAL = "electrical",
  PLUMBING = "plumbing",
  CONSTRUCTION = "construction",
  NOISE_POLLUTION = "noise_pollution",
  AIR_POLLUTION = "air_pollution",
  TRAFFIC = "traffic",
  SECURITY = "security",
  OTHER = "other",
}

// Issue status workflow
export enum IssueStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  REJECTED = "rejected",
  DUPLICATE = "duplicate",
}

// Issue priority levels
export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

// Service interface for provider services
export interface Service {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  providerId: string;
  provider?: User; // Populated provider data
  price: {
    min: number;
    max: number;
    unit: string; // "per hour", "fixed", "per visit"
  };
  duration: string; // "1-2 hours", "Same day", etc.
  availability: {
    days: string[]; // ["monday", "tuesday", ...]
    hours: {
      start: string; // "09:00"
      end: string; // "18:00"
    };
  };
  serviceArea: {
    cities: string[];
    radius: number; // in kilometers
  };
  images: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isVerified: boolean;
  features: string[]; // ["Emergency service", "24/7 available", ...]
  createdAt: string;
  updatedAt: string;
}

// Service categories
export enum ServiceCategory {
  PLUMBING = "plumbing",
  ELECTRICAL = "electrical",
  CARPENTRY = "carpentry",
  PAINTING = "painting",
  CLEANING = "cleaning",
  APPLIANCE_REPAIR = "appliance_repair",
  PEST_CONTROL = "pest_control",
  GARDENING = "gardening",
  HOME_SECURITY = "home_security",
  MOVING = "moving",
  TUTORING = "tutoring",
  BEAUTY = "beauty",
  FITNESS = "fitness",
  CATERING = "catering",
  OTHER = "other",
}

// Booking interface for service bookings
export interface Booking {
  id: string;
  consumerId: string;
  consumer?: User; // Populated consumer data
  providerId: string;
  provider?: User; // Populated provider data
  serviceId?: string; // Optional: if booking a specific service
  service?: Service; // Populated service data
  issueId?: string; // Optional: if booking is related to an issue
  issue?: Issue; // Populated issue data
  title: string;
  description: string;
  category: ServiceCategory;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  location: Location;
  estimatedCost: number;
  finalCost?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string; // Razorpay payment ID
  providerNotes?: string;
  consumerNotes?: string;
  completionNotes?: string;
  rating?: number; // Consumer rating for provider
  review?: string; // Consumer review
  providerRating?: number; // Provider rating for consumer
  providerReview?: string; // Provider review for consumer
  images?: string[]; // Before/after photos
  chatRoomId?: string; // For real-time chat
  isEmergency: boolean;
  cancellationReason?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// Booking status workflow
export enum BookingStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  CONFIRMED = "confirmed", // Payment confirmed
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

// Payment status
export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIAL_REFUND = "partial_refund",
}

// Payment methods
export enum PaymentMethod {
  RAZORPAY = "razorpay",
  UPI = "upi",
  CARD = "card",
  NET_BANKING = "net_banking",
  WALLET = "wallet",
  CASH = "cash",
}

// Chat/Message interface for real-time communication
export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  sender?: User; // Populated sender data
  message: string;
  messageType: MessageType;
  attachments?: string[]; // Image URLs, document URLs
  isRead: boolean;
  timestamp: string;
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  DOCUMENT = "document",
  LOCATION = "location",
  SYSTEM = "system", // System messages like "Booking confirmed"
}

// Chat room interface
export interface ChatRoom {
  id: string;
  bookingId?: string;
  issueId?: string;
  participants: string[]; // Array of user IDs
  participantDetails?: User[]; // Populated user data
  lastMessage?: Message;
  unreadCount: { [userId: string]: number };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string; // Issue ID, Booking ID, etc.
  relatedType?: string; // "issue", "booking", "chat"
  isRead: boolean;
  actionUrl?: string; // URL to navigate when clicked
  createdAt: string;
}

export enum NotificationType {
  ISSUE_UPDATE = "issue_update",
  BOOKING_REQUEST = "booking_request",
  BOOKING_UPDATE = "booking_update",
  PAYMENT_SUCCESS = "payment_success",
  PAYMENT_FAILED = "payment_failed",
  NEW_MESSAGE = "new_message",
  PROVIDER_VERIFIED = "provider_verified",
  SYSTEM_ANNOUNCEMENT = "system_announcement",
}

// Review interface
export interface Review {
  id: string;
  bookingId: string;
  booking?: Booking;
  reviewerId: string; // Who gave the review
  reviewer?: User;
  revieweeId: string; // Who received the review
  reviewee?: User;
  rating: number; // 1-5 stars
  comment: string;
  images?: string[];
  isVerified: boolean; // Admin verified review
  createdAt: string;
  updatedAt: string;
}

// Analytics interfaces for admin dashboard
export interface DashboardStats {
  totalUsers: number;
  totalIssues: number;
  totalBookings: number;
  totalRevenue: number;
  activeProviders: number;
  verifiedProviders: number;
  resolvedIssues: number;
  pendingIssues: number;
  completedBookings: number;
  pendingBookings: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    fill?: boolean;
  }[];
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  filter?: Record<string, any>;
}

// Form interfaces for frontend forms
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  userType: "admin" | "user";
  role: "consumer" | "provider"; // Only applicable when userType is "user"
  location?: Location;
  providerCategory?: string; // For providers
}

export interface IssueForm {
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  location: Location;
  images: File[];
}

export interface BookingForm {
  serviceId?: string;
  title: string;
  description: string;
  category: ServiceCategory;
  scheduledDate: string;
  scheduledTime: string;
  location: Location;
  isEmergency: boolean;
  estimatedCost?: number;
}

// Map-related interfaces
export interface MapPin {
  id: string;
  type: "issue" | "provider" | "booking";
  position: [number, number]; // [lat, lng]
  title: string;
  description: string;
  category: string;
  status?: string;
  icon: string;
  color: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// File upload interfaces
export interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  url?: string;
  error?: string;
}
