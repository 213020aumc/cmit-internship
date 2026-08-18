import express from "express";

const router = express.Router();

let tasks = [
  { id: 1, title: "Learn Express 5", completed: false },
  { id: 2, title: "Master Async/Await", completed: true },
];

// 1. Utility to simulate a 100ms database delay
const simulateDbCall = () => new Promise((resolve) => setTimeout(resolve, 100));

// 2. Consistent Response Utility
const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({
    success: status >= 200 && status < 300,
    message,
    data,
  });
};

// ==========================================
// READ ALL (GET)
// ==========================================
router.get("/", async (req, res) => {
  await simulateDbCall(); // Simulating database fetch

  const { completed } = req.query;
  let result = tasks;

  if (completed !== undefined) {
    console.log("Query:", completed);
    
    console.log("Tasks:", tasks);
    
    const isCompleted = completed === "true";

    console.log("isCompleted:", isCompleted);

    result = tasks.filter((task) => task.completed === isCompleted);
  }

  sendResponse(res, 200, result, "Tasks retrieved successfully");
});

// ==========================================
// READ ONE (GET)
// ==========================================
router.get("/:id", async (req, res) => {
  await simulateDbCall();

  const taskId = Number(req.params.id);

  if (isNaN(taskId)) {
    // EXPRESS 5 MAGIC: We can just throw an error here.
    // It won't crash the server. It automatically goes to the Error Handler!
    throw new Error("Invalid Task ID. It must be a number.");
  }

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return sendResponse(res, 404, null, `Task with ID ${taskId} not found`);
  }

  sendResponse(res, 200, task, "Task found");
});

// ==========================================
// CREATE (POST)
// ==========================================
router.post("/", async (req, res) => {
  await simulateDbCall();

  const { title } = req.body;

  if (!title) {
    // We can throw here too!
    throw new Error("Title is required to create a task");
  }

  const newTask = {
    id: tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
    title,
    completed: false,
  };

  tasks.push(newTask);
  sendResponse(res, 201, newTask, "Task created successfully");
});

// ==========================================
// UPDATE (PUT)
// ==========================================
router.put("/:id", async (req, res) => {
  await simulateDbCall();

  const taskId = Number(req.params.id);
  const { title, completed } = req.body;

  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return sendResponse(res, 404, null, `Task with ID ${taskId} not found`);
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    title: title !== undefined ? title : tasks[taskIndex].title,
    completed: completed !== undefined ? completed : tasks[taskIndex].completed,
  };

  sendResponse(res, 200, tasks[taskIndex], "Task updated successfully");
});

// ==========================================
// DELETE (DELETE)
// ==========================================
router.delete("/:id", async (req, res) => {
  await simulateDbCall();

  const taskId = Number(req.params.id);
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return sendResponse(res, 404, null, `Task with ID ${taskId} not found`);
  }

  tasks.splice(taskIndex, 1);
  sendResponse(res, 200, null, "Task deleted successfully");
});

export default router;
