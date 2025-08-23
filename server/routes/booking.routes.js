import express from "express";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getBookingStats,
} from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Create a new booking (consumer only)
router.post("/", authenticate(["consumer"]), createBooking);

// Get user's bookings (consumer or provider)
router.get(
  "/",
  authenticate(["consumer", "provider", "admin"]),
  getUserBookings
);

// Get booking statistics (admin only)
router.get("/stats", authenticate(["admin"]), getBookingStats);

// Get booking by ID
router.get(
  "/:bookingId",
  authenticate(["consumer", "provider", "admin"]),
  getBookingById
);

// Update booking status
router.patch(
  "/:bookingId/status",
  authenticate(["provider", "admin"]),
  updateBookingStatus
);

// Cancel booking
router.patch(
  "/:bookingId/cancel",
  authenticate(["consumer", "provider", "admin"]),
  cancelBooking
);

export default router;
