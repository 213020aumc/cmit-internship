import express from "express";
import mongoose from "mongoose";

import { AppError } from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";

import userRoutes from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";
import { requestLogger } from "./middleware/logger.middleware.js";

const app = express();
const PORT = 3000;

// The connection URI usually comes from our .env file
// Format: mongodb+srv://<username>:<password>@cluster.mongodb.net/<database_name>
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/default";

// Global Middleware
app.use(express.json());
app.use(requestLogger);

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

// Wildcard 404 Catch-All Handler
app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Centralized Error Handler (must be last)
app.use(globalErrorHandler);

// 3. Connect to the database BEFORE starting the Express server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB");

    // 4. Move app.listen inside the .then() block
    app.listen(PORT, () => {
      console.log(`API structured and running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // Force the Node process to crash if the DB fails
  });
