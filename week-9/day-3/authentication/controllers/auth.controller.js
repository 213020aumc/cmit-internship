import * as authService from "../services/auth.service.js";
import { sendResponse } from "../utils/responseHandler.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.js";

export const register = async (req, res) => {
  // Capture the URL origin to build the login link in the email
  const reqOrigin =
    process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;

  const newUser = await authService.registerUser(req.body, reqOrigin);
  sendResponse(res, 201, newUser, "Registration successful");
};

export const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body.email,
    req.body.password,
  );

  user.password = undefined;

  setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, 200, { user }, "Login successful", { accessToken });
};

export const refresh = async (req, res) => {
  const incomingRefreshToken = req.cookies?.jwt_refresh;

  // console.log("Cookies Refresh Token from Postman: ",incomingRefreshToken)

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await authService.refreshAccess(incomingRefreshToken);

  setRefreshTokenCookie(res, newRefreshToken);

  sendResponse(res, 200, null, "Token refreshed successfully", {
    accessToken: newAccessToken,
  });
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.jwt_refresh;

  if (refreshToken) {
    await authService.logoutUser(req.user.id, refreshToken);
  }

  clearRefreshTokenCookie(res);
  sendResponse(res, 200, null, "Logged out successfully");
};

export const getProfile = (req, res) => {
  sendResponse(res, 200, req.user, "User profile retrieved successfully");
};

export const forgotPassword = async (req, res) => {
  const reqOrigin = `${req.protocol}://${req.get("host")}`;

  await authService.generateResetToken(req.body.email, reqOrigin);
  sendResponse(res, 200, null, "Token sent to email!");
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  sendResponse(
    res,
    200,
    null,
    "Password successfully updated. Please log in with your new password.",
  );
};
