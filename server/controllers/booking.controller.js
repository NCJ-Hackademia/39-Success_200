import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import Provider from "../models/provider.js";
import Consumer from "../models/consumer.js";

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

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
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
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
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
      });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
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
  }
};
