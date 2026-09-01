import Joi from "joi";

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().max(100).required().messages({
    "string.empty": "Task title cannot be empty",
    "string.max": "Title cannot exceed 100 characters",
  }),

  completed: Joi.boolean().optional(),

  difficulty: Joi.number().min(1).max(10).optional(),

  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),

  isArchived: Joi.boolean().optional(),

  // Must be a valid 24-character hex string (MongoDB ObjectId format)
  assignedTo: Joi.string().hex().length(24).required().messages({
    "string.hex": "assignedTo must be a valid MongoDB ObjectId format",
    "string.length": "assignedTo must be exactly 24 characters long",
  }),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().max(100).optional(),
  completed: Joi.boolean().optional(),
  difficulty: Joi.number().min(1).max(10).optional(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
  isArchived: Joi.boolean().optional(),
  assignedTo: Joi.string().hex().length(24).optional(),
})
  .min(1)
  .messages({
    "object.min": "You must provide at least one field to update",
  }); // .min(1) ensures the client doesn't send an empty update object
