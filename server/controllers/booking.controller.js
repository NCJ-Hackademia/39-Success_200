import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import Provider from "../models/provider.js";
import Consumer from "../models/consumer.js";
import Issue from "../models/Issue.js";

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const {
      serviceId,
      providerId,
      scheduledDate,
      scheduledTime,
      location,
      notes,
      estimatedDuration,
    } = req.body;

    // Validate required fields
    if (!serviceId || !providerId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message:
          "Service ID, Provider ID, scheduled date and time are required",
      });
    }

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if provider exists
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Check if consumer exists
    const consumer = await Consumer.findOne({ user: req.user.id });
    if (!consumer) {
      return res.status(404).json({
        success: false,
        message: "Consumer profile not found",
      });
    }

    const booking = new Booking({
      consumer: consumer._id,
      provider: providerId,
      service: serviceId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      location,
      notes,
      estimatedDuration,
      totalAmount: service.pricing.basePrice,
      status: "pending",
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get all bookings for a user (consumer or provider)
export const getUserBookings = async (req, res) => {
  try {
    const { role } = req.user;
    const { page = 1, limit = 10, status } = req.query;

    let filter = {};

    if (role === "consumer") {
      const consumer = await Consumer.findOne({ user: req.user.id });
      if (!consumer) {
        return res.status(404).json({
          success: false,
          message: "Consumer profile not found",
        });
      }
      filter.consumer = consumer._id;
    } else if (role === "provider") {
      const provider = await Provider.findOne({ user: req.user.id });
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider profile not found",
        });
      }
      filter.provider = provider._id;
    }

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);
=======
import Booking from "../models/Booking.js";
import Issue from "../models/Issue.js";

export const getAllBookings = async (req, res) => {
  try {
    let filter = {};

    // If consumer, only show their own bookings
    if (req.user.role === "consumer") {
      filter.consumer = req.user.id;
    }

    // If provider, only show bookings assigned to them
    if (req.user.role === "provider") {
      filter.provider = req.user.id;
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Status filter
    if (req.query.status) {
      // Handle comma-separated status values
      const statusArray = req.query.status.split(",").map((s) => s.trim());
      if (statusArray.length > 1) {
        filter.status = { $in: statusArray };
      } else {
        filter.status = req.query.status;
      }
    }

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price category")
      .populate("issue", "title description location")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Debug logging to check for null populated fields
    console.log("Fetched bookings count:", bookings.length);
    bookings.forEach((booking, index) => {
      if (!booking.consumer) console.log(`Booking ${index}: Missing consumer`);
      if (!booking.provider) console.log(`Booking ${index}: Missing provider`);
      if (!booking.service) console.log(`Booking ${index}: Missing service`);
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
<<<<<<< HEAD
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user has access to this booking
    const { role } = req.user;
    let hasAccess = false;

    if (role === "consumer") {
      const consumer = await Consumer.findOne({ user: req.user.id });
      hasAccess = booking.consumer._id.toString() === consumer._id.toString();
    } else if (role === "provider") {
      const provider = await Provider.findOne({ user: req.user.id });
      hasAccess = booking.provider._id.toString() === provider._id.toString();
    } else if (role === "admin") {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
=======
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price category")
      .populate("issue", "title description location");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user.role === "provider" &&
      booking.provider._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
<<<<<<< HEAD
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, cancellationReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check permissions based on user role
    const { role } = req.user;
    let canUpdate = false;

    if (role === "provider") {
      const provider = await Provider.findOne({ user: req.user.id });
      canUpdate = booking.provider.toString() === provider._id.toString();
    } else if (role === "consumer") {
      const consumer = await Consumer.findOne({ user: req.user.id });
      canUpdate =
        booking.consumer.toString() === consumer._id.toString() &&
        status === "cancelled"; // Consumers can only cancel
    } else if (role === "admin") {
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const updateData = { status };
    if (status === "cancelled" && cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true }
    )
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: updatedBooking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed booking",
      });
    }

    // Check permissions
    const { role } = req.user;
    let canCancel = false;

    if (role === "consumer") {
      const consumer = await Consumer.findOne({ user: req.user.id });
      canCancel = booking.consumer.toString() === consumer._id.toString();
    } else if (role === "provider") {
      const provider = await Provider.findOne({ user: req.user.id });
      canCancel = booking.provider.toString() === provider._id.toString();
    } else if (role === "admin") {
      canCancel = true;
    }

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
=======
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { issue, provider, service, scheduledDate, totalAmount, notes } =
      req.body;

    // Verify required fields
    if (!service) {
      return res.status(400).json({ message: "Service is required" });
    }

    if (!provider) {
      return res.status(400).json({ message: "Provider is required" });
    }

    if (!scheduledDate) {
      return res.status(400).json({ message: "Scheduled date is required" });
    }

    // Verify the issue exists if provided
    if (issue) {
      const existingIssue = await Issue.findById(issue);
      if (!existingIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Check if issue is already resolved or has an active booking
      const existingBooking = await Booking.findOne({
        issue: issue,
        status: { $in: ["pending", "confirmed", "in_progress"] },
      });

      if (existingBooking) {
        return res.status(400).json({
          message: "This issue already has an active booking",
        });
      }
    }

    const bookingData = {
      consumer: req.user.id,
      provider,
      service,
      scheduledDate,
      totalAmount: totalAmount || 0,
      originalAmount: totalAmount || 0,
      notes: notes || "",
      consumerNotes: notes || "",
      status: "pending",
      paymentStatus: "pending",
      negotiationData: {
        isNegotiated: false,
        priceHistory: [
          {
            amount: totalAmount || 0,
            proposedBy: req.user.id,
            proposedAt: new Date(),
            message: "Initial booking request",
          },
        ],
        scheduleHistory: [
          {
            scheduledDate: new Date(scheduledDate),
            proposedBy: req.user.id,
            proposedAt: new Date(),
            reason: "Initial booking request",
          },
        ],
        requirementHistory: [
          {
            requirements: notes || "",
            proposedBy: req.user.id,
            proposedAt: new Date(),
          },
        ],
      },
    };

    // Only add issue if provided
    if (issue) {
      bookingData.issue = issue;
    }

    const booking = new Booking(bookingData);

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price")
      .populate("issue", "title description location");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user.role === "provider" &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate status transitions
    const allowedTransitions = {
      pending: ["negotiating", "confirmed", "cancelled", "rejected"],
      negotiating: ["confirmed", "cancelled", "rejected"],
      confirmed: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
      rejected: [],
    };

    if (
      req.body.status &&
      !allowedTransitions[booking.status].includes(req.body.status)
    ) {
      return res.status(400).json({
        message: `Cannot change status from ${booking.status} to ${req.body.status}`,
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e
      });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
<<<<<<< HEAD
      bookingId,
      {
        status: "cancelled",
        cancellationReason: reason || "No reason provided",
      },
      { new: true }
    )
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Get booking statistics (admin only)
export const getBookingStats = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const stats = {
      total: await Booking.countDocuments(),
      pending: await Booking.countDocuments({ status: "pending" }),
      confirmed: await Booking.countDocuments({ status: "confirmed" }),
      inProgress: await Booking.countDocuments({ status: "in_progress" }),
      completed: await Booking.countDocuments({ status: "completed" }),
      cancelled: await Booking.countDocuments({ status: "cancelled" }),
      today: await Booking.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Booking.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Booking.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
=======
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price")
      .populate("issue", "title description location");

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only allow deletion of pending bookings
    if (booking.status !== "pending") {
      return res.status(400).json({
        message: "Only pending bookings can be deleted",
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getProviderStats = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Get booking statistics
    const totalBookings = await Booking.countDocuments({
      provider: providerId,
    });
    const completedBookings = await Booking.countDocuments({
      provider: providerId,
      status: "completed",
    });
    const pendingBookings = await Booking.countDocuments({
      provider: providerId,
      status: "pending",
    });
    const cancelledBookings = await Booking.countDocuments({
      provider: providerId,
      status: "cancelled",
    });

    // Calculate earnings
    const completedBookingsWithEarnings = await Booking.find({
      provider: providerId,
      status: "completed",
    });

    const totalEarnings = completedBookingsWithEarnings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    // This month earnings
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonthBookings = await Booking.find({
      provider: providerId,
      status: "completed",
      updatedAt: { $gte: currentMonth },
    });

    const thisMonthEarnings = thisMonthBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    // Calculate completion rate
    const completionRate =
      totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    // Average rating (placeholder - would need reviews collection)
    const averageRating = 4.5;

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalEarnings,
        thisMonthEarnings,
        averageRating,
        completionRate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e
  }
};
