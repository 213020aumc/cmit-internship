import express from "express";
import taskRoutes from "./routes/taskRoutes.js";

const app = express();
const PORT = 3000;

// 1. Parse incoming JSON payloads
app.use(express.json());

// 2. Connect the Router
app.use("/api/tasks", taskRoutes);

// 3. Global 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
  });
});

// 4. THE GLOBAL ERROR HANDLER (Express 5 handles this beautifully)
// Any error thrown in an async route automatically ends up here.
// Notice it has exactly 4 parameters: (err, req, res, next)
app.use((err, req, res, next) => {
  console.error("🔥 Error caught by Express 5:", err.message);

  // Send a safe, consistent error response back to the client
  res.status(400).json({
    success: false,
    message: err.message || "An unexpected error occurred",
    data: null,
  });
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`Express 5 Server is running on http://localhost:${PORT}`);
});
