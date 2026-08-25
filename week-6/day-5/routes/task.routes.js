import express from "express";
import * as controller from "../controllers/task.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validations/task.validation.js";

const router = express.Router();

router.get("/", controller.getTasks);
router.get("/:id", controller.getTask);
router.post("/", validate(createTaskSchema), controller.createTask);
router.put("/:id", validate(updateTaskSchema), controller.updateTask);
router.delete("/:id", controller.deleteTask);

export default router;
