import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

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

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use("/api", globalLimiter);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(requestLogger);

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

app.use(mongoSanitize());
app.use(xssClean);

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
