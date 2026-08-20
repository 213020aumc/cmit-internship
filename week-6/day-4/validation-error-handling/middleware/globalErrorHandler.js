import { AppError } from "../utils/appError.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = Object.values(err.keyValue || {})[0] || "";

  const message = `Duplicate field '${field}' with value: "${value}". Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  console.error("🔥 DEV ERROR:", err);
  return next(err);
};

const sendErrorProd = (err, req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    console.error("💥 PROGRAMMING ERROR:", err);
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }

  if (err.isOperational) {
    return next(err);
  }

  console.error("💥 PROGRAMMING ERROR:", err);
  const error = new AppError("Please try again later.", 500);
  return next(error);
};

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = `${err.statusCode}`.startsWith("4") ? "fail" : "error";

  // Provide clear message for JSON parse errors in dev mode
  if (
    err.type === "entity.parse.failed" ||
    (err instanceof SyntaxError && err.status === 400)
  ) {
    err.message = "Invalid JSON syntax in request body.";
  }

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res, next);
  } else {
    let error = Object.create(err);
    error.message = err.message;
    error.stack = err.stack;
    error.statusCode = err.statusCode;

    if (err.code) error.code = err.code;
    if (err.keyValue) error.keyValue = err.keyValue;
    if (err.errors) error.errors = err.errors;
    if (err.path) error.path = err.path;
    if (err.value) error.value = err.value;

    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res, next);
  }
};
