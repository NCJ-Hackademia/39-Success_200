import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// Register route for all roles
router.post("/register", register);

// Login route for all roles
router.post("/login", login);

export default router;
