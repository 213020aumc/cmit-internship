import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
// import rateLimit from "express-rate-limit";
import {
  globalLimiter,
} from "./middleware/rateLimiter.middleware.js";
import mongoSanitize from 'express-mongo-sanitize';
import { xssClean } from './middleware/xss.middleware.js';

import { AppError } from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";

import { requestLogger } from "./middleware/logger.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";

const app = express();
const PORT = 4000;

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/authentication";

// 1. Security Headers & CORS
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
// 2. Rate Limiting
// // 2a. Global Limiter: 100 requests per 15 minutes per IP (covers all /api/v1/* routes)
// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: "draft-8", // Returns standard `RateLimit-*` headers
//   legacyHeaders: false, // Disables `X-RateLimit-*` headers
//   message: {
//     status: "fail",
//     message: "Too many requests from this IP, please try again in 15 minutes.",
//   },
// });
app.use("/api", globalLimiter);
// // 2b. Strict Auth Limiter: 5 attempts per hour per IP on login
// const authLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 5,
//   standardHeaders: "draft-8",
//   legacyHeaders: false,
//   message: {
//     status: "fail",
//     message:
//       "Too many login attempts from this IP, please try again after an hour.",
//   },
// });

// app.post("/api/v1/auth/login", authLimiter);

// 3. Body & Cookie Parsers

// Limits payload size to 10kb to prevent Denial of Service (DoS) via massive JSON files
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(requestLogger);

// Express 5 compatibility: req.query is a getter-only property on the prototype.
// Make it writable on the request instance so sanitizers can sanitize query params.
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  next();
});

// 4. Data Sanitization (MUST come after body parsing, before routes)
// 4a. NoSQL Query Injection defense (strips keys starting with '$' or containing '.')
app.use(mongoSanitize());
// 4b. Cross-Site Scripting (XSS) defense (cleans malicious HTML/JS tags)
app.use(xssClean);

// 5. Application Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);

app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB");

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  });
