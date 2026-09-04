import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

export const changePassword = async (userId, currentPassword, newPassword) => {
  // 1. Fetch the user and explicitly select the password
  const user = await User.findById(userId).select("+password");

  // 2. Verify the current password is correct
  if (!(await user.comparePassword(currentPassword, user.password))) {
    throw new AppError("Your current password is incorrect.", 401);
  }

  // 3. Update the password
  user.password = newPassword;

  // IMPORTANT: We use user.save() instead of User.findByIdAndUpdate()!
  // .save() triggers the Mongoose pre('save') hook we wrote earlier,
  // ensuring the new password is automatically hashed by bcrypt.
  await user.save();

  return true;
};

export const deactivateUser = async (userId) => {
  // We perform a "Soft Delete". We don't actually erase the user from the database
  // (which could break relational references like Tasks or Courses).
  // We just mark them as inactive.
  await User.findByIdAndUpdate(userId, { isActive: false });
};
