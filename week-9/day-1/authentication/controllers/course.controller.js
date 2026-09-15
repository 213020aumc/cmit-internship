import * as courseService from "../services/course.service.js";
import { sendResponse } from "../utils/responseHandler.js";
import { AppError } from "../utils/appError.js";

export const createCourse = async (req, res) => {
  const course = await courseService.create(req.body);
  sendResponse(res, 201, course, "Course created successfully");
};

// export const getCourses = async (req, res) => {
//   const courses = await courseService.fetchAll();
//   sendResponse(res, 200, courses, "Courses retrieved successfully");
// };

export const getCourses = async (req, res) => {
  // req.query contains URL parameters (e.g., ?page=2&limit=20)
  const result = await courseService.getPaginatedCourses(req.query);

  sendResponse(
    res,
    200,
    result.courses,
    "Courses retrieved successfully",
    { meta: result.meta }
  );
};

export const updateCourse = async (req, res) => {
  const course = await courseService.update(req.params.id, req.body);
  if (!course) throw new AppError("Course not found", 404);
  sendResponse(res, 200, course, "Course updated successfully");
};

export const deleteCourse = async (req, res) => {
  const course = await courseService.remove(req.params.id);
  if (!course) throw new AppError("Course not found", 404);
  sendResponse(res, 200, null, "Course deleted successfully");
};

export const getCategoryStats = async (req, res) => {
  const stats = await courseService.getAvgPriceByCategory();
  sendResponse(res, 200, stats, "Category averages retrieved successfully");
};

export const getTopWeb = async (req, res) => {
  const courses = await courseService.getTopWebCourses();
  sendResponse(res, 200, courses, "Top web courses retrieved successfully");
};

export const getInstructorCounts = async (req, res) => {
  const counts = await courseService.getInstructorCourseCounts();
  sendResponse(
    res,
    200,
    counts,
    "Instructor course counts retrieved successfully",
  );
};

export const getInstructorDetails = async (req, res) => {
  const details = await courseService.getDetailedInstructorStats();
  sendResponse(
    res,
    200,
    details,
    "Detailed instructor stats retrieved successfully",
  );
};

export const getRevenue = async (req, res) => {
  const revenue = await courseService.getTotalRevenuePotential();
  sendResponse(
    res,
    200,
    revenue,
    "Total revenue potential retrieved successfully",
  );
};
