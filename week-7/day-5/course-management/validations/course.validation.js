import Joi from "joi";

export const createCourseSchema = Joi.object({
  title: Joi.string().trim().required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().valid("Web", "Data Science", "Design").required(),
  instructorId: Joi.string().hex().length(24).required().messages({
    "string.hex": "Instructor ID must be a valid MongoDB ObjectId",
  }),
});

export const updateCourseSchema = Joi.object({
  title: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().valid("Web", "Data Science", "Design").optional(),
  instructorId: Joi.string().hex().length(24).optional(),
}).min(1);
