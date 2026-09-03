import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),

  // Require at least 8 chars, one letter, and one number
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one letter and one number.'
    })
});