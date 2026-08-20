import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";

import { AppError } from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";
import taskRoutes from "./routes/task.routes.js";
import { requestLogger } from "./middleware/logger.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standalone OpenAPI / Swagger document
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, "swagger.json"), "utf8")
);

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middleware
app.use(express.json());
app.use(requestLogger);

// Mount Swagger UI Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount Task Routes
app.use("/api/tasks", taskRoutes);

// Wildcard 404 Catch-All Handler (Express 5 syntax)
app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Centralized Error Handler (must be the absolute last middleware)
app.use(globalErrorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`API structured and running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
