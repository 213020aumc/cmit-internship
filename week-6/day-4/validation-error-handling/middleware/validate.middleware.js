import { AppError } from "../utils/appError.js";

/**
 * Generic factory middleware for Joi schema validation
 * @param {import('joi').ObjectSchema} schema
 */
export const validate = (schema) => {
  return (req, res, next) => {
    // abortEarly: false collects all validation errors rather than stopping at the first
    // stripUnknown: true removes any extra unvalidated fields
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(". ");
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    // Overwrite req.body with sanitized and cast data
    req.body = value;
    next();
  };
};
