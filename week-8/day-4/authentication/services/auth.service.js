import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Token } from "../models/token.model.js";
import { AppError } from "../utils/appError.js";
import { sendEmail } from "../utils/email.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import {
  generateRandomToken,
  hashToken,
  createAuthSession,
  signAccessToken,
  signRefreshToken,
} from "../utils/token.js";

// const signToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
// };

// const signAccessToken = (id) =>
//   jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
//     expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
//   });

// const signRefreshToken = (id) =>
//   jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
//     expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
//   });

export const registerUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 400);
  }

  // Explicitly hash password before saving to database
  userData.password = await hashPassword(userData.password);

  const newUser = await User.create(userData);
  const userResponse = newUser.toObject();
  delete userResponse.password;

  return userResponse;
};

// export const loginUser = async (email, password) => {
//   if (!email || !password) {
//     throw new AppError("Please provide email and password", 400);
//   }

//   const user = await User.findOne({ email }).select("+password");

//   if (!user || !(await user.comparePassword(password, user.password))) {
//     throw new AppError("Incorrect email or password", 401);
//   }

//   const token = signToken(user._id);

//   return { user, token };
// };

export const loginUser = async (email, password) => {
  // Explicitly check for active user
  const user = await User.findOne({
    email,
    isActive: { $ne: false },
  }).select("+password");

  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  // const accessToken = signAccessToken(user._id);
  // const refreshToken = signRefreshToken(user._id);

  // Store the refresh token in the Token collection (7 days expiry)
  // await Token.create({
  //   userId: user._id,
  //   token: refreshToken,
  //   type: "refresh",
  //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  // });

  // DRY Centralized session creator:
  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};

export const generateResetToken = async (email, reqOrigin) => {
  const user = await User.findOne({ email, isActive: { $ne: false } });
  if (!user) {
    throw new AppError("There is no user with that email address.", 404);
  }

  // Generate plain reset token & hash
  const rawResetToken = generateRandomToken(32);
  const hashedResetToken = hashToken(rawResetToken);

  // Delete any existing reset tokens for this user
  await Token.deleteMany({ userId: user._id, type: "reset_password" });

  // Store hashed token in Token collection (10 minutes expiry)
  await Token.create({
    userId: user._id,
    token: hashedResetToken,
    type: "reset_password",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const baseURL = process.env.FRONTEND_URL || reqOrigin;
  const resetURL = `${baseURL}/reset-password/${rawResetToken}`;

  const message = `Forgot your password? Click the link below to set up a new one:\n\n${resetURL}\n\nIf you didn't request a password reset, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset link (valid for 10 min)",
      message,
    });
  } catch (error) {
    // If email failed to send, remove the token
    await Token.deleteMany({ userId: user._id, type: "reset_password" });

    throw new AppError(
      "There was an error sending the email. Try again later!",
      500,
    );
  }
};

export const resetPassword = async (token, newPassword) => {
  // 1. Hash the incoming token
  const hashedToken = hashToken(token);

  // 2. Find matching valid reset token from Token collection
  const tokenDoc = await Token.findOne({
    token: hashedToken,
    type: "reset_password",
    expiresAt: { $gt: Date.now() },
  });

  if (!tokenDoc) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  // 3. Find the user
  const user = await User.findOne({
    _id: tokenDoc.userId,
    isActive: { $ne: false },
  });
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 404);
  }

  // 4. Update the password explicitly hashed
  user.password = await hashPassword(newPassword);
  await user.save();

  // 5. Invalidate the used reset token & all existing refresh sessions
  await Token.deleteMany({ userId: user._id });

  return user;
};

export const refreshAccess = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError("No refresh token provided", 401);
  }

  // 1. Verify the refresh token cryptographically
  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  // 2. Check if this exact token exists in the Token collection
  const existingToken = await Token.findOne({
    userId: decoded.id,
    token: incomingRefreshToken,
    type: "refresh",
  });

  // 3. REUSE DETECTION: If token is cryptographically valid but not in DB -> reuse attack!
  if (!existingToken) {
    // Revoke all refresh tokens for this user
    await Token.deleteMany({ userId: decoded.id, type: "refresh" });
    throw new AppError(
      "Invalid refresh token reused! All sessions have been logged out for security.",
      403,
    );
  }

  // 4. ROTATION: Delete the used refresh token
  await Token.findByIdAndDelete(existingToken._id);

  // 5. Ensure active user still exists
  const user = await User.findOne({
    _id: decoded.id,
    isActive: { $ne: false },
  });
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
  }

  // 6. Generate a brand new pair of Access & Refresh tokens
  // const newAccessToken = signAccessToken(user._id);
  // const newRefreshToken = signRefreshToken(user._id);

    // Store new refresh token in Token collection
  // await Token.create({
  //   userId: user._id,
  //   token: newRefreshToken,
  //   type: "refresh",
  //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  // });

  // 6. DRY Centralized session creator:
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
  
    await createAuthSession(user._id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId, tokenToRemove) => {
  // Delete only the specific refresh token being logged out
  await Token.deleteOne({
    userId,
    token: tokenToRemove,
    type: "refresh",
  });
};
