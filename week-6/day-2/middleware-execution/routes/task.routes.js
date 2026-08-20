import express from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { validateTaskPayload } from "../middleware/validate.middleware.js";

const router = express.Router();

router.get("/", getTasks);
router.get("/:id", getTask);

// Notice how we inject the validation middleware right before the controller
router.post("/", validateTaskPayload, createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;
