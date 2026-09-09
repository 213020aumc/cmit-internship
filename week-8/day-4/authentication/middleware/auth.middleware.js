import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("You are not logged in! Please provide a token.", 401);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);

  const currentUser = await User.findOne({
    _id: decoded.id,
    isActive: { $ne: false },
  });
  if (!currentUser) {
    throw new AppError(
      "The user belonging to this token no longer exists or is deactivated.",
      401,
    );
  }

  req.user = currentUser;

  next();
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user was attached by the 'protect' middleware
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
      );
    }

    // User is authorized, grant access
    next();
  };
};
