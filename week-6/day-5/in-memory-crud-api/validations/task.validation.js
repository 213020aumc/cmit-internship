import Joi from "joi";

export const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  completed: Joi.boolean().optional(),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  completed: Joi.boolean().optional(),
}).min(1);
