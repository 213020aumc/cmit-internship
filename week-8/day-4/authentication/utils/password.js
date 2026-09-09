import bcrypt from "bcryptjs";

export const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};
