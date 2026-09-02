import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      enum: {
        values: ["Web", "Data Science", "Design"],
        message: "{VALUE} is not a supported category",
      },
      required: [true, "Category is required"],
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: [true, "A course must be assigned to an instructor"],
      index: true,
    },
  },
  { timestamps: true },
);

export const Course = mongoose.model("Course", courseSchema);
