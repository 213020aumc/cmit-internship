import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // unique: true automatically tells MongoDB to create an index
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    // Numbers with Min/Max limits
    age: {
      type: Number,
      min: [18, "You must be at least 18"],
      max: [120, "Age cannot exceed 120"],
    },
  },
  {
    // Automatically adds 'createdAt' and 'updatedAt' timestamps
    timestamps: true,
  },
);

// Right before compiling the model
userSchema.methods.getProfileUrl = function () {
  return `https://myapp.com/users/${this.name}`;
};

userSchema.methods.getProfileSummary = function () {
  return `${this.name} can be contacted at ${this.email}.`;
};

// 3. Compile the Blueprint into a Model
// Mongoose automatically looks for the lowercase, plural version of the string 'User'
// So this connects to the 'users' collection in MongoDB.
export const User = mongoose.model("User", userSchema);
