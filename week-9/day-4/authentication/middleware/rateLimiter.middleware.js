import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-8", 
  legacyHeaders: false, 
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again in 15 minutes.",
  },
});

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
