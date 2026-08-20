import express from "express";
import {
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

router.get("/", getTasks);
router.get("/:id", getTask);

// Joi schema validation middleware injected before controllers
router.post("/", validate(createTaskSchema), createTask);
router.put("/:id", validate(updateTaskSchema), updateTask);

router.delete("/:id", deleteTask);

export default router;
