import { User } from "../models/user.model.js";

export const createUser = async (userData) => {
  return await User.create(userData);
};
