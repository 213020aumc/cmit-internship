import * as userService from "../services/user.service.js";

export const createUser = async (req, res) => {
  const newUser = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: newUser,
  });
};
