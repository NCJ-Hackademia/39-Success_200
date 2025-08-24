import express from "express";
import {
<<<<<<< HEAD
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getBookingStats,
=======
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getProviderStats,
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e
} from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

<<<<<<< HEAD
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
=======
// Routes
router
  .route("/")
  .get(authenticate(["admin", "provider", "consumer"]), getAllBookings)
  .post(authenticate(["consumer"]), createBooking);
router
  .route("/:id")
  .get(authenticate(["admin", "provider", "consumer"]), getBookingById)
  .patch(authenticate(["admin", "provider", "consumer"]), updateBooking)
  .delete(authenticate(["admin", "consumer"]), deleteBooking);

// Provider stats route
router.get("/provider/stats", authenticate(["provider"]), getProviderStats);
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e

export default router;
