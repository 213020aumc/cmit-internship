import express from "express";
import {
  getTaskStats,
  getTopPerformers,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validations/task.validation.js";

const router = express.Router();

// 1. Static/Custom Routes (Must come FIRST)
router.get("/stats", getTaskStats);
router.get("/top-performers", getTopPerformers);

// 2. Standard CRUD Routes
router.get("/", getTasks);
router.post("/", validate(createTaskSchema), createTask);

// 3. Dynamic ID Routes (Must come LAST)
router.get("/:id", getTask);
router.put("/:id", validate(updateTaskSchema), updateTask);
router.delete("/:id", deleteTask);

export default router;
