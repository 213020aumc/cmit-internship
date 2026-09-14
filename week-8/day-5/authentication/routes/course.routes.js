import express from "express";
import * as controller from "../controllers/course.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../validations/course.validation.js";

const router = express.Router();

// ==========================================
// 1. Aggregation / Analytics Routes (RBAC)
// ==========================================

// Public / All: General catalog & web highlights
router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web", controller.getTopWeb);

// Instructor & Admin: Operational instructor metrics
router.get(
  "/stats/instructor-counts",
  protect,
  restrictTo("instructor", "admin"),
  controller.getInstructorCounts,
);

// Admin Only: Sensitive instructor details and financial revenue stats
router.get(
  "/stats/instructor-details",
  protect,
  restrictTo("admin"),
  controller.getInstructorDetails,
);
router.get(
  "/stats/revenue",
  protect,
  restrictTo("admin"),
  controller.getRevenue,
);

// ==========================================
// 2. Standard CRUD Routes (RBAC)
// ==========================================

// Public: Anyone can view courses
router.get("/", controller.getCourses);

// Instructor & Admin: Create and update courses
router.post(
  "/",
  protect,
  restrictTo("instructor", "admin"),
  validate(createCourseSchema),
  controller.createCourse,
);
router.put(
  "/:id",
  protect,
  restrictTo("instructor", "admin"),
  validate(updateCourseSchema),
  controller.updateCourse,
);

// Admin Only: Delete courses
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  controller.deleteCourse,
);

export default router;
