import { AppError } from "../utils/appError.js";

// Intercepts bad data before it ever reaches the controller
// Higher-order function that takes a Joi schema and returns an Express middleware
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // Return all validation errors, not just the first one
    stripUnknown: true, // Remove unallowed extra fields
  });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new AppError(`Validation Error: ${errorMessages}`, 400));
  }
  // Replace req.body with the validated value
  req.body = value;
  next();
};
