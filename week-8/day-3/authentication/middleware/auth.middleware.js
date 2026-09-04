import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

export const protect = async (req, res, next) => {
  // 1. Read the Bearer token from the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Split "Bearer eyJhbGci..." into an array and grab the second element
    token = req.headers.authorization.split(" ")[1];
  }

  // Handle missing tokens
  if (!token) {
    throw new AppError("You are not logged in! Please provide a token.", 401);
  }

  // 2. Verify the token signature and expiration
  // We use util.promisify to use async/await with the older jwt.verify callback syntax
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if the user still exists in the database
  // (e.g., The token might be valid, but the user deleted their account yesterday)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    throw new AppError(
      "The user belonging to this token no longer exists.",
      401,
    );
  }

  // 4. Attach the authenticated user to the request object
  req.user = currentUser;

  // 5. Grant access to the protected route
  next();
};
