import * as taskService from "../services/task.service.js";
import { AppError } from "../utils/appError.js";

// Helper for consistent JSON responses
const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({ success: true, message, data });
};

export const getTasks = async (req, res) => {
  const tasks = await taskService.fetchAll(req.query.completed);
  sendResponse(res, 200, tasks, "Tasks retrieved successfully");
};

export const getTask = async (req, res) => {
  const taskId = req.params.id;
  const task = await taskService.fetchById(taskId);
  if (!task) throw new AppError("Task not found", 404);

  sendResponse(res, 200, task, "Task found");
};

export const createTask = async (req, res) => {
  const newTask = await taskService.create(req.body);
  sendResponse(res, 201, newTask, "Task created successfully");
};

export const updateTask = async (req, res) => {
  const taskId = req.params.id;
  const updatedTask = await taskService.update(taskId, req.body);

  if (!updatedTask) throw new AppError("Task not found", 404);

  sendResponse(res, 200, updatedTask, "Task updated successfully");
};

export const deleteTask = async (req, res) => {
  const taskId = req.params.id;
  const isDeleted = await taskService.remove(taskId);

  if (!isDeleted) throw new AppError("Task not found", 404);

  sendResponse(res, 200, null, "Task deleted successfully");
};
