import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    completed: {
      type: Boolean,
      default: false, // If the client doesn't send this, it defaults to false
    },

    difficulty: {
      type: Number,
      min: [1, "Difficulty must be at least 1"],
      max: [10, "Difficulty cannot exceed 10"],
      default: 1,
    },

    // Enums restrict the value to a specific set of allowed strings
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // The Reference: Links this task to a specific User document
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Must match the exact string name of the compiled User model
      required: [true, "A task must be assigned to a user"],
    },
  },
  {
    timestamps: true,
  },
);

export const Task = mongoose.model("Task", taskSchema);
