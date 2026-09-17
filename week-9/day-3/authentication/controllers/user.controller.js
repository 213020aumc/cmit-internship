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

  const { accessToken, refreshToken } = await userService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
  );

  setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, 200, null, "Password updated successfully!", {
    accessToken,
  });
};

export const deleteAccount = async (req, res) => {
  await userService.deactivateUser(req.user.id);
  sendResponse(res, 200, null, "Account deactivated successfully.");
};

export const getAllUsers = async (req, res) => {
  const users = await userService.fetchAllUsers();
  sendResponse(res, 200, users, "All users retrieved successfully");
};
