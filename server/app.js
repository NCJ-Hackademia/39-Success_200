import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import consumerRoutes from "./routes/consumer.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import morgan from "morgan";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestLogger } from "./utils/logger.js";

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(requestLogger); // Custom request logger
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/consumer", consumerRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/bookings", bookingRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Urbi-Fix API is running!" });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
