import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),

  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one letter and one number.'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required for login.'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required for login.'
  })
});