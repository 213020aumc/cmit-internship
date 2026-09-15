import * as taskService from "../services/task.service.js";
import { AppError } from "../utils/appError.js";

const parseId = (id) => {
  const parsed = Number(id);
  if (isNaN(parsed))
    throw new AppError("Invalid ID format. Must be a number.", 400);
  return parsed;
};

export const getTasks = async (req, res) => {
  const tasks = await taskService.fetchAll();
  res.status(200).json({ success: true, data: tasks });
};

export const getTask = async (req, res) => {
  const task = await taskService.fetchById(parseId(req.params.id));
  if (!task) throw new AppError("Task not found", 404);
  res.status(200).json({ success: true, data: task });
};

export const createTask = async (req, res) => {
  const newTask = await taskService.create(req.body);
  res.status(201).json({ success: true, data: newTask });
};

export const updateTask = async (req, res) => {
  const updatedTask = await taskService.update(
    parseId(req.params.id),
    req.body,
  );
  if (!updatedTask) throw new AppError("Task not found", 404);
  res.status(200).json({ success: true, data: updatedTask });
};

export const deleteTask = async (req, res) => {
  const isDeleted = await taskService.remove(parseId(req.params.id));
  if (!isDeleted) throw new AppError("Task not found", 404);
  res.status(200).json({ success: true, message: "Task deleted successfully" });
};
