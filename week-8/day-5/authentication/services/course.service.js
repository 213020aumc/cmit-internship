import { Course } from "../models/course.model.js";

// --- STANDARD CRUD ---
export const create = async (data) => await Course.create(data);

export const fetchAll = async () => {
  return await Course.find()
    .populate("instructorId", "name rating -_id")
    .select("-__v")
    .lean();
};

export const fetchById = async (id) => await Course.findById(id).lean();

export const update = async (id, data) => {
  return await Course.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
};

export const remove = async (id) => await Course.findByIdAndDelete(id);

// --- AGGREGATION PIPELINES ---
export const getAvgPriceByCategory = async () => {
  return await Course.aggregate([
    { $group: { _id: "$category", avgPrice: { $avg: "$price" } } },
  ]);
};

export const getTopWebCourses = async () => {
  return await Course.aggregate([
    { $match: { category: "Web" } },
    { $sort: { price: -1 } },
    { $limit: 3 },
  ]);
};

export const getInstructorCourseCounts = async () => {
  return await Course.aggregate([
    { $group: { _id: "$instructorId", totalCourses: { $sum: 1 } } },
    { $sort: { totalCourses: -1 } },
  ]);
};

export const getDetailedInstructorStats = async () => {
  return await Course.aggregate([
    { $group: { _id: "$instructorId", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "instructorDetails",
      },
    },
    { $unwind: "$instructorDetails" },
    {
      $project: {
        name: "$instructorDetails.name",
        email: "$instructorDetails.email",
        courseCount: "$count",
        _id: 0,
      },
    },
  ]);
};

export const getTotalRevenuePotential = async () => {
  return await Course.aggregate([
    { $group: { _id: null, totalValue: { $sum: "$price" } } },
    { $project: { _id: 0, totalValue: 1 } },
  ]);
};
