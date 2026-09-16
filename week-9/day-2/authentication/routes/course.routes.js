import express from "express";
import * as controller from "../controllers/course.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  updateCourseSchema,
} from "../validations/course.validation.js";

const router = express.Router();

router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web", controller.getTopWeb);

router.get(
  "/stats/instructor-counts",
  protect,
  restrictTo("instructor", "admin"),
  controller.getInstructorCounts,
);

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

// router.get("/", controller.getCourses);
router.get("/", controller.getAllCourses);

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

router.delete("/:id", protect, restrictTo("admin"), controller.deleteCourse);

export default router;
