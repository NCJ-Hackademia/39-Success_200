import Issue from "../models/Issue.js";

export const getAssignedIssuesCount = async (req, res) => {
  try {
    if (req.user.role !== "provider") {
      return res
        .status(403)
        .json({ error: "Only providers can access assigned issues count" });
    }

    const count = await Issue.countDocuments({
      assignedProvider: req.user.id,
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get assigned issues count",
      details: error.message,
    });
  }
};

export const getAllIssues = async (req, res) => {
  try {
    let filter = {};

    // If consumer, only show their own issues
    if (req.user.role === "consumer") {
      filter.consumer = req.user.id;
    }

    // If provider, show available issues (open/unassigned) or assigned to them
    if (req.user.role === "provider") {
      filter.$or = [
        { status: "open", assignedProvider: null }, // Unassigned open issues
        { assignedProvider: req.user.id }, // Issues assigned to this provider
      ];
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Status filter (for admin and general filtering)
    if (
      req.query.status &&
      req.user.role !== "provider" &&
      req.user.role !== "consumer"
    ) {
      // Handle comma-separated status values
      const statusArray = req.query.status.split(",").map((s) => s.trim());
      if (statusArray.length > 1) {
        filter.status = { $in: statusArray };
      } else {
        filter.status = req.query.status;
      }
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Crowdfunding filter
    if (req.query.crowdfunding) {
      if (req.query.crowdfunding === "enabled") {
        filter["crowdfunding.isEnabled"] = true;
      } else if (req.query.crowdfunding === "disabled") {
        filter["crowdfunding.isEnabled"] = { $ne: true };
      }
    }

    // Get total count for pagination
    const total = await Issue.countDocuments(filter);

    const issues = await Issue.find(filter)
      .populate("consumer", "name email")
      .populate("assignedProvider", "name email")
      .populate("category", "name description icon")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: issues,
      pagination: {
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

export const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate("consumer", "name email")
      .populate("assignedProvider", "name email")
      .populate("category", "name description icon");

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      issue.consumer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      priority,
      images,
      estimatedCost,
    } = req.body;

    // Validate that category exists and is active
    const Category = (await import("../models/category.js")).default;
    const categoryExists = await Category.findOne({
      _id: category,
      isActive: true,
    });
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid or inactive category" });
    }

    const issue = new Issue({
      title,
      description,
      category,
      location,
      priority,
      consumer: req.user.id,
      images,
      estimatedCost,
    });

    await issue.save();

    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: issue,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateIssue = async (req, res) => {
  try {
    console.log(
      `Update issue request for ID: ${req.params.id} by user: ${req.user.id} (${req.user.role})`
    );
    console.log("Update data:", req.body);

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      console.log(`Issue not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    console.log(
      `Issue found - Status: ${issue.status}, AssignedProvider: ${issue.assignedProvider}, Consumer: ${issue.consumer}`
    );

    // Check permissions
    if (
      req.user.role === "consumer" &&
      issue.consumer.toString() !== req.user.id
    ) {
      console.log(
        `Permission denied - consumer ${req.user.id} trying to update issue owned by ${issue.consumer}`
      );
      return res.status(403).json({
        success: false,
        message: "Access denied - consumers can only update their own issues",
      });
    }

    if (
      req.user.role === "provider" &&
      issue.assignedProvider?.toString() !== req.user.id
    ) {
      console.log(
        `Permission denied - provider ${req.user.id} trying to update issue assigned to ${issue.assignedProvider}`
      );
      return res.status(403).json({
        success: false,
        message:
          "Access denied - providers can only update issues assigned to them",
      });
    }

    // Validate status transitions
    const validTransitions = {
      open: ["in_progress", "closed"],
      in_progress: ["resolved", "closed"],
      resolved: ["closed"],
      closed: [],
    };

    if (
      req.body.status &&
      !validTransitions[issue.status]?.includes(req.body.status)
    ) {
      console.log(
        `Invalid status transition from ${issue.status} to ${req.body.status}`
      );
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${issue.status} to ${req.body.status}`,
      });
    }

    // If provider is resolving the issue, allow it
    if (
      req.user.role === "provider" &&
      req.body.status === "resolved" &&
      issue.assignedProvider?.toString() === req.user.id
    ) {
      // This is allowed - provider resolving their assigned issue
      console.log("Provider resolving their assigned issue");
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("consumer", "name email")
      .populate("assignedProvider", "name email")
      .populate("category", "name description icon");

    console.log("Issue updated successfully");

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: updatedIssue,
    });
  } catch (err) {
    console.error("Error updating issue:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

export const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      issue.consumer.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Issue.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const upvoteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const userId = req.user.id;
    const hasUpvoted = issue.upvotedBy.includes(userId);

    if (hasUpvoted) {
      // Remove upvote
      issue.upvotedBy = issue.upvotedBy.filter(
        (id) => id.toString() !== userId
      );
      issue.upvotes = Math.max(0, issue.upvotes - 1);
    } else {
      // Add upvote
      issue.upvotedBy.push(userId);
      issue.upvotes += 1;
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: hasUpvoted ? "Upvote removed" : "Issue upvoted",
      data: {
        upvotes: issue.upvotes,
        hasUpvoted: !hasUpvoted,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Track issue view for forum analytics
export const trackIssueView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Only track if user is authenticated and hasn't viewed recently
    if (userId) {
      const recentView = issue.viewedBy.find(
        (view) =>
          view.user.toString() === userId &&
          Date.now() - view.viewedAt < 24 * 60 * 60 * 1000 // 24 hours
      );

      if (!recentView) {
        issue.viewedBy.push({
          user: userId,
          viewedAt: new Date(),
        });
        issue.viewsCount += 1;
        await issue.save();
      }
    } else {
      // For anonymous users, just increment view count
      issue.viewsCount += 1;
      await issue.save();
    }

    res.status(200).json({
      success: true,
      data: {
        viewsCount: issue.viewsCount,
      },
    });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track view",
      error: error.message,
    });
  }
};

// Enable crowdfunding for an issue
export const enableCrowdfunding = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetAmount, deadline } = req.body;
    const userId = req.user.id;

    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Check if user owns the issue or is admin
    if (issue.consumer.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only enable crowdfunding for your own issues",
      });
    }

    // Validate input
    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Target amount must be greater than 0",
      });
    }

    // Update crowdfunding settings
    issue.crowdfunding.isEnabled = true;
    issue.crowdfunding.targetAmount = targetAmount;

    if (deadline) {
      issue.crowdfunding.deadline = new Date(deadline);
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: "Crowdfunding enabled successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Error enabling crowdfunding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enable crowdfunding",
      error: error.message,
    });
  }
};

// Disable crowdfunding for an issue
export const disableCrowdfunding = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Check if user owns the issue or is admin
    if (issue.consumer.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only disable crowdfunding for your own issues",
      });
    }

    // Disable crowdfunding
    issue.crowdfunding.isEnabled = false;
    await issue.save();

    res.status(200).json({
      success: true,
      message: "Crowdfunding disabled successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Error disabling crowdfunding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable crowdfunding",
      error: error.message,
    });
  }
};

export const acceptIssue = async (req, res) => {
  try {
    console.log(
      `Accept issue request for ID: ${req.params.id} by user: ${req.user.id} (${req.user.role})`
    );

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      console.log(`Issue not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    console.log(
      `Issue found - Status: ${issue.status}, AssignedProvider: ${issue.assignedProvider}`
    );

    // Check if issue is available for acceptance
    if (issue.status !== "open") {
      console.log(`Issue not available - Status: ${issue.status}`);
      return res.status(400).json({
        success: false,
        message:
          "Issue is not available for acceptance. Current status: " +
          issue.status,
      });
    }

    if (issue.assignedProvider) {
      console.log(`Issue already assigned to: ${issue.assignedProvider}`);
      return res.status(400).json({
        success: false,
        message: "Issue is already assigned to another provider",
      });
    }

    // Accept the issue by assigning it to the provider and changing status
    issue.assignedProvider = req.user.id;
    issue.status = "in_progress";

    console.log(
      `Accepting issue - Setting assignedProvider to: ${req.user.id}`
    );

    const updatedIssue = await issue.save();

    // Populate the assigned provider details
    await updatedIssue.populate("assignedProvider", "name email");
    await updatedIssue.populate("consumer", "name email");
    await updatedIssue.populate("category", "name description icon");

    console.log(`Issue accepted successfully: ${updatedIssue._id}`);

    res.status(200).json({
      success: true,
      message: "Issue accepted successfully",
      data: updatedIssue,
    });
  } catch (error) {
    console.error("Error accepting issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept issue",
      error: error.message,
    });
  }
};

export const resolveIssue = async (req, res) => {
  try {
    console.log(
      `Resolve issue request for ID: ${req.params.id} by user: ${req.user.id} (${req.user.role})`
    );

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Check if user is the assigned provider
    if (issue.assignedProvider?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned provider can resolve this issue",
      });
    }

    // Check if issue is in progress
    if (issue.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Issue cannot be resolved. Current status: ${issue.status}`,
      });
    }

    // Resolve the issue
    issue.status = "resolved";
    issue.resolvedAt = new Date();

    const updatedIssue = await issue.save();

    // Populate details
    await updatedIssue.populate("assignedProvider", "name email");
    await updatedIssue.populate("consumer", "name email");
    await updatedIssue.populate("category", "name description icon");

    console.log(`Issue resolved successfully: ${updatedIssue._id}`);

    res.status(200).json({
      success: true,
      message: "Issue resolved successfully",
      data: updatedIssue,
    });
  } catch (error) {
    console.error("Error resolving issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve issue",
      error: error.message,
    });
  }
};
