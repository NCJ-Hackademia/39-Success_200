import express from "express";
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all services (public)
router.get("/", getAllServices);

// Get service by ID (public)
router.get("/:id", getServiceById);

// Create new service (provider only)
router.post("/", authenticate(["provider"]), createService);

// Update service (provider can update their own, admin can update any)
router.put("/:id", authenticate(["admin", "provider"]), updateService);

// Delete service (provider can delete their own, admin can delete any)
router.delete("/:id", authenticate(["admin", "provider"]), deleteService);

export default router;
