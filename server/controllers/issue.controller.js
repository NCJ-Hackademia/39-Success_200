import Issue from "../models/Issue.js";

export const getAllIssues = async (req, res) => {
  try {
    let filter = {};

    // If consumer, only show their own issues
    if (req.user.role === "consumer") {
      filter.consumer = req.user.id;
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
      filter.status = req.query.status;
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
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

    if (
      req.user.role === "provider" &&
      issue.assignedProvider?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: updatedIssue,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
