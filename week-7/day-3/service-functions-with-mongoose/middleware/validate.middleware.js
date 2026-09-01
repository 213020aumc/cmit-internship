import { AppError } from "../utils/appError.js";

// Intercepts bad data before it ever reaches the controller
export const validate = (req, res, next) => {
  const { title } = req.body?.title;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return next(
      new AppError(
        "Validation Error: 'title' is required and must be a valid string.",
        400
      )
    );
  }

  next();
};
