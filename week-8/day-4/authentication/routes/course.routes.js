import express from "express";
import * as controller from "../controllers/course.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../validations/course.validation.js";

const router = express.Router();

// 1. Aggregation Routes
router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web", controller.getTopWeb);
router.get("/stats/instructor-counts", controller.getInstructorCounts);
router.get("/stats/instructor-details", controller.getInstructorDetails);
router.get("/stats/revenue", controller.getRevenue);

// 2. Standard CRUD Routes
router.get("/", controller.getCourses);
router.post("/", validate(createCourseSchema), controller.createCourse);
router.put("/:id", validate(updateCourseSchema), controller.updateCourse);

export default router;
