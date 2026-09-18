import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { AppError } from "../utils/appError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { createAuthSession } from "../utils/token.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

export const updateAvatar = async (userId, file) => {
  if (!file) throw new AppError("Please provide an image file.", 400);

  const user = await User.findById(userId);

  // 1. If the user already has an avatar, delete it from Cloudinary
  if (user.avatar?.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  // 2. Upload the new image buffer to Cloudinary
  const result = await uploadToCloudinary(file.buffer, `${process.env.CLOUDINARY_FOLDER_NAME}/avatars`);

  // 3. Save the new URL and publicId to MongoDB
  user.avatar = {
    url: result.secure_url,
    publicId: result.public_id,
  };

  // Skip validation just in case other required fields are missing in this context
  await user.save({ validateBeforeSave: false });

  return user.avatar;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user || !(await comparePassword(currentPassword, user.password))) {
    throw new AppError("Your current password is incorrect.", 401);
  }
  user.password = await hashPassword(newPassword);
  await user.save();
  await Token.deleteMany({ userId: user._id, type: "refresh" });

  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};

export const deactivateUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { isActive: false });
  await Token.deleteMany({ userId });
};

export const fetchAllUsers = async () => {
  return await User.find({ isActive: { $ne: false } }).select("-__v");
};
