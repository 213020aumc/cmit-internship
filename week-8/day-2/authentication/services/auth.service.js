import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 400);
  }

  const newUser = await User.create(userData);
  const userResponse = newUser.toObject();
  delete userResponse.password;

  return userResponse;
};

export const loginUser = async (email, password) => {
  // 1. Check if email and password exist
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // 2. Find the user and explicitly select the password field
  const user = await User.findOne({ email }).select('+password');

  // 3. Check if user exists && password is correct
  // We use the instance method we defined in the schema
  if (!user || !(await user.comparePassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // 4. Generate the JWT
  const token = signToken(user._id);

  return { user, token };
};
