import express from "express";
import taskRoutes from "./routes/task.routes.js";
import { AppError } from "./utils/appError.js";

const app = express();
app.use(express.json());

app.use("/api/tasks", taskRoutes);

// Catch-all for undefined routes (Express 5 syntax)
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl}`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    status: err.status || "error",
    message: err.message || "Internal Server Error",
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
