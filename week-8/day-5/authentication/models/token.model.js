import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["refresh", "reset_password"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index: automatically deletes document when expiresAt is reached
    },
  },
  { timestamps: true },
);

export const Token = mongoose.model("Token", tokenSchema);
