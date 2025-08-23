import Proposal from "../models/Proposal.js";
import Booking from "../models/Booking.js";

// Create a new proposal
export const createProposal = async (req, res) => {
  try {
    const {
      bookingId,
      proposalType,
      proposedChanges,
      justification,
      expirationHours = 24,
    } = req.body;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user is part of this booking
    if (
      booking.consumer.toString() !== req.user.id &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Determine who the proposal is being sent to
    const proposedTo =
      booking.consumer.toString() === req.user.id
        ? booking.provider
        : booking.consumer;

    // Create expiration date
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Create proposal
    const proposal = new Proposal({
      bookingId,
      proposedBy: req.user.id,
      proposedTo,
      proposalType,
      originalData: {
        price: booking.originalAmount || booking.totalAmount,
        scheduledDate: booking.scheduledDate,
        requirements: booking.notes,
        totalAmount: booking.totalAmount,
      },
      proposedChanges,
      justification,
      expiresAt,
      negotiationHistory: [
        {
          action: "created",
          performedBy: req.user.id,
          message: justification,
          proposalSnapshot: {
            price: proposedChanges.price || booking.totalAmount,
            scheduledDate:
              proposedChanges.scheduledDate || booking.scheduledDate,
            requirements: proposedChanges.requirements || booking.notes,
          },
        },
      ],
    });

    await proposal.save();

    // Update booking status to negotiating if not already
    if (booking.status === "pending") {
      await Booking.findByIdAndUpdate(bookingId, { status: "negotiating" });
    }

    // Populate proposal with user details
    await proposal.populate("proposedBy proposedTo", "name email role");

    res.status(201).json({
      success: true,
      message: "Proposal created successfully",
      data: proposal,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get proposals for a booking
export const getBookingProposals = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      booking.consumer.toString() !== req.user.id &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const proposals = await Proposal.find({ bookingId })
      .populate("proposedBy proposedTo", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: proposals,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Respond to a proposal
export const respondToProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { action, responseMessage, counterProposal } = req.body;

    // Verify proposal exists
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    // Check if user is the intended recipient
    if (proposal.proposedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if proposal is still valid
    if (proposal.status !== "pending") {
      return res.status(400).json({ message: "Proposal is no longer active" });
    }

    if (new Date() > proposal.expiresAt) {
      proposal.status = "expired";
      await proposal.save();
      return res.status(400).json({ message: "Proposal has expired" });
    }

    // Handle different actions
    if (action === "accept") {
      proposal.status = "accepted";
      proposal.responseMessage = responseMessage;

      // Update booking with accepted changes
      const booking = await Booking.findById(proposal.bookingId);
      const updateData = {};

      if (proposal.proposedChanges.price) {
        updateData.negotiatedAmount = proposal.proposedChanges.price;
        updateData.totalAmount =
          proposal.proposedChanges.totalAmount ||
          proposal.proposedChanges.price;
        updateData["negotiationData.isNegotiated"] = true;
      }

      if (proposal.proposedChanges.scheduledDate) {
        updateData.scheduledDate = proposal.proposedChanges.scheduledDate;
      }

      if (proposal.proposedChanges.requirements) {
        updateData.notes = proposal.proposedChanges.requirements;
      }

      updateData.status = "confirmed";

      await Booking.findByIdAndUpdate(proposal.bookingId, updateData);

      // Add to negotiation history
      proposal.negotiationHistory.push({
        action: "accepted",
        performedBy: req.user.id,
        message: responseMessage || "Proposal accepted",
        proposalSnapshot: {
          price: proposal.proposedChanges.price,
          scheduledDate: proposal.proposedChanges.scheduledDate,
          requirements: proposal.proposedChanges.requirements,
        },
      });
    } else if (action === "reject") {
      proposal.status = "rejected";
      proposal.responseMessage = responseMessage;

      proposal.negotiationHistory.push({
        action: "rejected",
        performedBy: req.user.id,
        message: responseMessage || "Proposal rejected",
      });
    } else if (action === "counter" && counterProposal) {
      // Create a new counter-proposal
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newProposal = new Proposal({
        bookingId: proposal.bookingId,
        proposedBy: req.user.id,
        proposedTo: proposal.proposedBy,
        proposalType: proposal.proposalType,
        originalData: proposal.originalData,
        proposedChanges: counterProposal,
        justification: responseMessage || "Counter proposal",
        expiresAt,
        negotiationHistory: [
          {
            action: "created",
            performedBy: req.user.id,
            message: responseMessage || "Counter proposal created",
            proposalSnapshot: {
              price: counterProposal.price,
              scheduledDate: counterProposal.scheduledDate,
              requirements: counterProposal.requirements,
            },
          },
        ],
      });

      await newProposal.save();

      // Mark original proposal as countered
      proposal.status = "countered";
      proposal.responseMessage = responseMessage;
      proposal.negotiationHistory.push({
        action: "countered",
        performedBy: req.user.id,
        message: responseMessage || "Proposal countered",
      });

      await proposal.save();

      // Return the new counter-proposal
      await newProposal.populate("proposedBy proposedTo", "name email role");

      return res.status(201).json({
        success: true,
        message: "Counter proposal created successfully",
        data: newProposal,
        originalProposal: proposal,
      });
    }

    await proposal.save();

    res.status(200).json({
      success: true,
      message: `Proposal ${action}ed successfully`,
      data: proposal,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all proposals for a user (sent and received)
export const getUserProposals = async (req, res) => {
  try {
    const { type = "all", status } = req.query; // type: 'sent', 'received', 'all'

    let filter = {};

    if (type === "sent") {
      filter.proposedBy = req.user.id;
    } else if (type === "received") {
      filter.proposedTo = req.user.id;
    } else {
      filter.$or = [{ proposedBy: req.user.id }, { proposedTo: req.user.id }];
    }

    if (status) {
      filter.status = status;
    }

    const proposals = await Proposal.find(filter)
      .populate("proposedBy proposedTo", "name email role")
      .populate({
        path: "bookingId",
        populate: {
          path: "service",
          select: "name description",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: proposals,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get proposal by ID
export const getProposalById = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId)
      .populate("proposedBy proposedTo", "name email role")
      .populate({
        path: "bookingId",
        populate: {
          path: "service consumer provider",
          select: "name description email",
        },
      });

    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    // Check if user has access to this proposal
    if (
      proposal.proposedBy._id.toString() !== req.user.id &&
      proposal.proposedTo._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Cancel a proposal (only by the creator)
export const cancelProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    // Check if user is the creator
    if (proposal.proposedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the creator can cancel a proposal" });
    }

    // Can only cancel pending proposals
    if (proposal.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Can only cancel pending proposals" });
    }

    proposal.status = "cancelled";
    proposal.negotiationHistory.push({
      action: "cancelled",
      performedBy: req.user.id,
      message: "Proposal cancelled by creator",
    });

    await proposal.save();

    res.status(200).json({
      success: true,
      message: "Proposal cancelled successfully",
      data: proposal,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
