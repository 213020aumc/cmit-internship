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

  // Strip the password hash from the output
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "Login successful",
    token, // The client will save this token to use on future requests
    data: {
      user,
    },
  });
};
