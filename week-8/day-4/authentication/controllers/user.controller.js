import * as userService from "../services/user.service.js";
import { AppError } from "../utils/appError.js";
import { sendResponse } from "../utils/responseHandler.js";
import { setRefreshTokenCookie } from "../utils/cookie.js";

export const getProfile = (req, res) => {
  sendResponse(res, 200, req.user, "User profile retrieved successfully");
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Please provide both current and new passwords.", 400);
  }

  // req.user.id was securely attached by the protect middleware
  // await userService.changePassword(req.user.id, currentPassword, newPassword);

  const { accessToken, refreshToken } = await userService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
  );

  // Previous manual cookie setting:
  // Update HTTP-only cookie with the new refresh token
  // res.cookie("jwt_refresh", refreshToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: "strict",
  //   maxAge: 7 * 24 * 60 * 60 * 1000,
  // });

  // DRY Centralized cookie helper:
  setRefreshTokenCookie(res, refreshToken);

  // sendResponse(
  //   res,
  //   200,
  //   null,
  //   "Password updated successfully. Please log in again with your new password.",
  // );
  sendResponse(res, 200, null, "Password updated successfully!", {
    accessToken,
  });
};

export const deleteAccount = async (req, res) => {
  await userService.deactivateUser(req.user.id);
  sendResponse(res, 200, null, "Account deactivated successfully.");
};
