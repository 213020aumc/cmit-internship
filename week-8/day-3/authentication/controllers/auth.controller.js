import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  const newUser = await authService.registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: newUser,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser(email, password);

  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    data: {
      user,
    },
  });
};

export const getProfile = (req, res) => {
  // We don't need to query the database!
  // The 'protect' middleware already did the work and attached the user.
  res.status(200).json({
    success: true,
    data: req.user,
  });
};
