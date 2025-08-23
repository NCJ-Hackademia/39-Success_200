import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    location: {
      address: {
        type: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    images: [
      {
        type: String, // URLs to uploaded images
      },
    ],
    estimatedCost: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
