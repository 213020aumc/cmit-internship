import jwt from "jsonwebtoken";
import { Email } from "../utils/email.js";
import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { AppError } from "../utils/appError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import {
  generateRandomToken,
  hashToken,
  createAuthSession,
} from "../utils/token.js";

export const registerUser = async (userData, reqOrigin) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 400);
  }

  userData.password = await hashPassword(userData.password);

  const newUser = await User.create(userData);

  try {
    const loginUrl = `${reqOrigin}/login`;
    await new Email(newUser, loginUrl).sendWelcome();
  } catch (error) {
    console.error("Welcome email failed to send:", error);
  }

  const userResponse = newUser.toObject();
  delete userResponse.password;

  return userResponse;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({
    email,
    isActive: { $ne: false },
  }).select("+password");

  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};

export const generateResetToken = async (email, reqOrigin) => {
  const user = await User.findOne({ email, isActive: { $ne: false } });
  if (!user) {
    throw new AppError("There is no user with that email address.", 404);
  }

  const rawResetToken = generateRandomToken(32);
  const hashedResetToken = hashToken(rawResetToken);

  await Token.deleteMany({ userId: user._id, type: "reset_password" });

  await Token.create({
    userId: user._id,
    token: hashedResetToken,
    type: "reset_password",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const baseURL = process.env.FRONTEND_URL || reqOrigin;
  const resetURL = `${baseURL}/reset-password/${rawResetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();
  } catch (error) {
    // token cleanup
    await Token.deleteMany({ userId: user._id, type: "reset_password" });
    throw new AppError(
      "There was an error sending the email. Try again later!",
      500,
    );
  }
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const tokenDoc = await Token.findOne({
    token: hashedToken,
    type: "reset_password",
    expiresAt: { $gt: Date.now() },
  });

  if (!tokenDoc) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  const user = await User.findOne({
    _id: tokenDoc.userId,
    isActive: { $ne: false },
  });
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 404);
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  await Token.deleteMany({ userId: user._id });

  return user;
};

export const refreshAccess = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError("No refresh token provided", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  const existingToken = await Token.findOne({
    userId: decoded.id,
    token: incomingRefreshToken,
    type: "refresh",
  });

  if (!existingToken) {
    await Token.deleteMany({ userId: decoded.id, type: "refresh" });
    throw new AppError(
      "Invalid refresh token reused! All sessions have been logged out for security.",
      403,
    );
  }

  await Token.findByIdAndDelete(existingToken._id);

  const user = await User.findOne({
    _id: decoded.id,
    isActive: { $ne: false },
  });
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await createAuthSession(user._id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId, tokenToRemove) => {
  await Token.deleteOne({
    userId,
    token: tokenToRemove,
    type: "refresh",
  });
};
