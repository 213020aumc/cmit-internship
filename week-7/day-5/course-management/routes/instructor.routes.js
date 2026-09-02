import express from "express";
import { AppError } from "../utils/appError.js";
import { Instructor } from "../models/instructor.model.js"; // Inline for brevity
import { validate } from "../middleware/validate.middleware.js";
import { createInstructorSchema } from "../validations/instructor.validation.js";
import { sendResponse } from "../utils/responseHandler.js";

const router = express.Router();

router.post("/", validate(createInstructorSchema), async (req, res) => {
  const existingInstructor = await Instructor.findOne({
    email: req.body.email,
  });
  if (existingInstructor) {
    throw new AppError("An instructor with this email already exists", 400);
  }

  const instructor = await Instructor.create(req.body);
  sendResponse(res, 201, instructor, "Instructor created successfully");
});

export default router;
