import Joi from "joi";

export const createInstructorSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  rating: Joi.number().min(1).max(5).optional(),
});
