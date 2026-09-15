import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { AppError } from "../utils/appError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { createAuthSession } from "../utils/token.js";

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
