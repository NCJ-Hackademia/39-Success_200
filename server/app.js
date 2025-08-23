import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import issueRoutes from "./routes/issue.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import categoryRoutes from "./routes/category.routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Urbi-Fix API is running!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

export default app;
