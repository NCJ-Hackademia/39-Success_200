import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import consumerRoutes from "./routes/consumer.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
<<<<<<< HEAD
=======
import chatRoutes from "./routes/chat.routes.js";
import proposalRoutes from "./routes/proposal.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import crowdfundingRoutes from "./routes/crowdfunding.routes.js";
import adminRoutes from "./routes/admin.routes.js";
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e
import morgan from "morgan";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestLogger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(requestLogger); // Custom request logger
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/consumer", consumerRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/bookings", bookingRoutes);
<<<<<<< HEAD
=======
app.use("/api/chat", chatRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/crowdfunding", crowdfundingRoutes);
app.use("/api/admin", adminRoutes);
>>>>>>> 90e1498fd0578d7d34bb202d42a5dd0a7a2d347e

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Urbi-Fix API is running!" });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
