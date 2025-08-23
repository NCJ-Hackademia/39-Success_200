import express from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getProviderStats,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Protect all booking routes
router.use(protect);

// Routes
router.route("/").get(getAllBookings).post(createBooking);
router
  .route("/:id")
  .get(getBookingById)
  .patch(updateBooking)
  .delete(deleteBooking);

// Provider stats route
router.get("/provider/stats", getProviderStats);

export default router;
