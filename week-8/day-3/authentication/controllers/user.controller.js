import * as userService from "../services/user.service.js";
import { AppError } from "../utils/appError.js";

export const getProfile = (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Please provide both current and new passwords.", 400);
  }

  // req.user.id was securely attached by the protect middleware
  await userService.changePassword(req.user.id, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message:
      "Password updated successfully. Please log in again with your new password.",
  });
};

export const deleteAccount = async (req, res) => {
  await userService.deactivateUser(req.user.id);

  res.status(200).json({
    success: true,
    message: "Account deactivated successfully.",
  });
};
