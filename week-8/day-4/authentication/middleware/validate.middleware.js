import { AppError } from "../utils/appError.js";

export const validate = (schema) => {
  return (req, res, next) => {
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
