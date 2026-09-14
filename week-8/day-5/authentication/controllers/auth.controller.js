import * as authService from "../services/auth.service.js";
import { sendResponse } from "../utils/responseHandler.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.js";

// // Previous local helper (now centralized in utils/cookie.js):
// const sendRefreshTokenCookie = (res, token) => {
//   res.cookie("jwt_refresh", token, {
//     httpOnly: true, // Invisible to JavaScript
//     secure: process.env.NODE_ENV === "production", // HTTPS only in prod
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });
// };

export const register = async (req, res) => {
  const newUser = await authService.registerUser(req.body);
  sendResponse(res, 201, newUser, "Registration successful");
};

export const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body.email,
    req.body.password,
  );

  user.password = undefined;

  // Set the cookie using centralized helper
  setRefreshTokenCookie(res, refreshToken);

  // Send the short-lived access token in the JSON response
  sendResponse(res, 200, { user }, "Login successful", { accessToken });
};

export const refresh = async (req, res) => {
  // Read the token securely from the cookie
  const incomingRefreshToken = req.cookies?.jwt_refresh;

  // console.log("Cookies Refresh Token from Postman: ",incomingRefreshToken)

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await authService.refreshAccess(incomingRefreshToken);

  // Set the newly rotated refresh token in the HTTP-only cookie
  setRefreshTokenCookie(res, newRefreshToken);

  sendResponse(res, 200, null, "Token refreshed successfully", {
    accessToken: newAccessToken,
  });
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.jwt_refresh;

  if (refreshToken) {
    // req.user.id requires the logout route to use the 'protect' middleware!
    await authService.logoutUser(req.user.id, refreshToken);
  }

  // Erase the cookie from the browser using centralized helper
  clearRefreshTokenCookie(res);
  sendResponse(res, 200, null, "Logged out successfully");
};

export const getProfile = (req, res) => {
  sendResponse(res, 200, req.user, "User profile retrieved successfully");
};

export const forgotPassword = async (req, res) => {
  // Pass the base URL so the service can construct the full reset link
  const reqOrigin = `${req.protocol}://${req.get("host")}`;

  await authService.generateResetToken(req.body.email, reqOrigin);
  sendResponse(res, 200, null, "Token sent to email!");
};

export const resetPassword = async (req, res) => {
  // token comes from the URL params, newPassword from the body
  await authService.resetPassword(req.params.token, req.body.password);
  sendResponse(
    res,
    200,
    null,
    "Password successfully updated. Please log in with your new password.",
  );
};
