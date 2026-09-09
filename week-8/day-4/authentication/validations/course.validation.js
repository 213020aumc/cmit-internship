import Joi from "joi";

export const createCourseSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Course title cannot be empty",
    "any.required": "Course title is required",
  }),

  price: Joi.number().min(0).required().messages({
    "number.min": "Price cannot be negative",
    "any.required": "Course price is required",
  }),

  category: Joi.string()
    .valid("Web", "Data Science", "Design")
    .required()
    .messages({
      "any.only": "Category must be one of Web, Data Science, or Design",
      "any.required": "Category is required",
    }),

  instructorId: Joi.string().hex().length(24).required().messages({
    "string.hex": "instructorId must be a valid MongoDB ObjectId",
    "string.length": "instructorId must be 24 characters long",
    "any.required": "instructorId is required",
  }),
});

export const updateCourseSchema = Joi.object({
  title: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().valid("Web", "Data Science", "Design").optional(),
  instructorId: Joi.string().hex().length(24).optional(),
})
  .min(1)
  .messages({
    "object.min": "You must provide at least one field to update",
  });
