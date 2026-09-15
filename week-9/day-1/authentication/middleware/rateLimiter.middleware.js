import rateLimit from "express-rate-limit";

// 1. Global Limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-8", // Returns standard `RateLimit-*` headers
  legacyHeaders: false, // Disables `X-RateLimit-*` headers
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again in 15 minutes.",
  },
});

// 2. Strict Auth Limiter: 5 attempts per hour per IP for login/auth routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message:
      "Too many login attempts from this IP, please try again after an hour.",
  },
});
