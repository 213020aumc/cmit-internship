import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { AppError } from "../utils/appError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { createAuthSession } from "../utils/token.js";

// export const changePassword = async (userId, currentPassword, newPassword) => {
//   const user = await User.findById(userId).select("+password");

//   if (!user || !(await comparePassword(currentPassword, user.password))) {
//     throw new AppError("Your current password is incorrect.", 401);
//   }

//   user.password = await hashPassword(newPassword);
//   await user.save();

//   // Invalidate all active sessions/refresh tokens upon password change
//   await Token.deleteMany({ userId: user._id, type: "refresh" });

//   return true;
// };

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user || !(await comparePassword(currentPassword, user.password))) {
    throw new AppError("Your current password is incorrect.", 401);
  }
  // 1. Update and hash password
  user.password = await hashPassword(newPassword);
  await user.save();
  // 2. Invalidate ALL previous refresh tokens
  await Token.deleteMany({ userId: user._id, type: "refresh" });

  // // 3. Issue fresh tokens specifically for THIS current session
  // const accessToken = jwt.sign(
  //   { id: user._id },
  //   process.env.ACCESS_TOKEN_SECRET,
  //   {
  //     expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  //   },
  // );
  // const refreshToken = jwt.sign(
  //   { id: user._id },
  //   process.env.REFRESH_TOKEN_SECRET,
  //   {
  //     expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  //   },
  // );
  // // 4. Save only the new refresh token in DB
  // await Token.create({
  //   userId: user._id,
  //   token: refreshToken,
  //   type: "refresh",
  //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  // });

  // 3. Create fresh session for the current device (1 line!)
  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};

export const deactivateUser = async (userId) => {
  // Mark as inactive and revoke all active sessions/tokens
  await User.findByIdAndUpdate(userId, { isActive: false });
  await Token.deleteMany({ userId });
};
