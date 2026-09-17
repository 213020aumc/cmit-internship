import { Course } from "../models/course.model.js";

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

export const getAdvancedCourses = async (queryObj) => {
  const filter = {};

  const allowedFilters = ["category", "price", "rating", "instructorId"];

  allowedFilters.forEach((field) => {
    if (queryObj[field]) {
      if (typeof queryObj[field] === "object") {
        const operatorStr = JSON.stringify(queryObj[field]).replace(
          /\b(gte|gt|lte|lt)\b/g,
          (match) => `$${match}`,
        );
        filter[field] = JSON.parse(operatorStr);
      } else {
        filter[field] = queryObj[field];
      }
    }
  });

  if (queryObj.search) {
    filter.title = {
      $regex: queryObj.search,
      $options: "i",
    };
  }

  let query = Course.find(filter).populate("instructorId", "name rating -_id");

  if (queryObj.sort) {
    const sortBy = queryObj.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt"); 
  }

  if (queryObj.fields) {
    const fields = queryObj.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  const page = Math.max(1, Number(queryObj.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const [totalCourses, courses] = await Promise.all([
    Course.countDocuments(filter),
    query.lean(),
  ]);

  const totalPages = Math.ceil(totalCourses / limit);

  if (page > totalPages && totalCourses > 0) {
    throw new AppError("This page does not exist.", 404);
  }

  return {
    meta: {
      totalItems: totalCourses,
      itemsPerPage: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    courses,
  };
};
