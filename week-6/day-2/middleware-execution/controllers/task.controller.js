import * as taskService from "../services/task.service.js";
import { AppError } from "../utils/appError.js";

// Helper for consistent JSON responses
const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({ success: true, message, data });
};

export const getTasks = async (req, res) => {
  const tasks = await taskService.fetchAllTasks(req.query.completed);
  sendResponse(res, 200, tasks, "Tasks retrieved successfully");
};

export const getTask = async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId))
    throw new AppError("Invalid Task ID. Must be a number.", 400);

  const task = await taskService.fetchTaskById(taskId);
  if (!task) throw new AppError("Task not found", 404);

  sendResponse(res, 200, task, "Task found");
};

export const createTask = async (req, res) => {
  const newTask = await taskService.createNewTask(req.body.title);
  sendResponse(res, 201, newTask, "Task created successfully");
};

export const updateTask = async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId))
    throw new AppError("Invalid Task ID. Must be a number.", 400);

  const { title, completed } = req.body;
  const updates = { title, completed };

  Object.keys(updates).forEach(
    (key) => updates[key] === undefined && delete updates[key],
  );

  const updatedTask = await taskService.updateExistingTask(taskId, updates);

  if (!updatedTask) throw new AppError("Task not found", 404);

  sendResponse(res, 200, updatedTask, "Task updated successfully");
};

export const deleteTask = async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId))
    throw new AppError("Invalid Task ID. Must be a number.", 400);

  const isDeleted = await taskService.removeTask(taskId);

  if (!isDeleted) throw new AppError("Task not found", 404);

  sendResponse(res, 200, null, "Task deleted successfully");
};
