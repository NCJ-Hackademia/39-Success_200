import express from "express";
import {
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  upvoteIssue,
} from "../controllers/issue.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all issues (admin/provider can see all, consumer sees only their own)
router.get("/", authenticate(["admin", "provider", "consumer"]), getAllIssues);

// Get issue by ID
router.get(
  "/:id",
  authenticate(["admin", "provider", "consumer"]),
  getIssueById
);

// Create new issue (consumer only)
router.post("/", authenticate(["consumer"]), createIssue);

// Update issue (consumer can update their own, provider can update assigned ones)
router.put(
  "/:id",
  authenticate(["admin", "provider", "consumer"]),
  updateIssue
);

// Delete issue (consumer can delete their own, admin can delete any)
router.delete("/:id", authenticate(["admin", "consumer"]), deleteIssue);

// Upvote/downvote issue (all authenticated users)
router.patch(
  "/:id/upvote",
  authenticate(["admin", "provider", "consumer"]),
  upvoteIssue
);

export default router;
