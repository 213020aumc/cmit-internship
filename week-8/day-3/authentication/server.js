import express from "express";
import mongoose from "mongoose";
import { AppError } from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";

import { requestLogger } from "./middleware/logger.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
const PORT = 4000;

const MONGO_URI = "mongodb://localhost:27017/authentication";

app.use(express.json());
app.use(requestLogger);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


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
