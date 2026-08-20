import Joi from "joi";

// Schema for creating a new task
export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Title cannot be empty",
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 100 characters",
    "any.required": "Title is a required field",
  }),
  completed: Joi.boolean().optional(),
});

// Schema for updating an existing task (requires at least one field)
export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional().messages({
    "string.empty": "Title cannot be empty",
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 100 characters",
  }),
  completed: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min":
      "At least one field ('title' or 'completed') must be provided for update",
  });
