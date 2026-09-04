import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Please provide your email address."],
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "A password is required for security."],
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Query Middleware: Exclude soft-deleted/inactive users from all find queries
userSchema.pre(/^find/, function () {
  // 'this' points to the current query
  this.find({ isActive: { $ne: false } });
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const User = mongoose.model("User", userSchema);
