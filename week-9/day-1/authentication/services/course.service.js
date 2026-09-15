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

// export const getPaginatedCourses = async (queryObj) => {
//   // 1. Sanitize Inputs & Set Defaults
//   // If page is not provided or negative, default to 1
//   const page = Math.max(1, Number(queryObj.page) || 1);

//   // Apply maximum page-size limits (e.g., max 100 items per page)
//   const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));

//   // 2. Calculate Skip
//   const skip = (page - 1) * limit;

//   // Base filter (could be expanded for search/filtering later)
//   const filter = {};

//   // 3. Execute queries in parallel for performance
//   // We need BOTH the total count of documents AND the paginated data
//   const [totalCourses, courses] = await Promise.all([
//     Course.countDocuments(filter), // Super fast counting method
//     Course.find(filter)
//       .populate('instructorId', 'name rating -_id')
//       .skip(skip)
//       .limit(limit)
//       .select('-__v')
//       .lean()
//   ]);

//   // 4. Calculate Total Pages
//   const totalPages = Math.ceil(totalCourses / limit);

//   // 5. Handle Out-of-Range Pages
//   // If the user requests Page 10, but there are only 5 pages...
//   if (page > totalPages && totalCourses > 0) {
//     throw new AppError('This page does not exist.', 404);
//   }

//   // 6. Return Data alongside Metadata
//   return {
//     courses,
//     meta: {
//       totalItems: totalCourses,
//       itemsPerPage: limit,
//       currentPage: page,
//       totalPages,
//       hasNextPage: page < totalPages,
//       hasPrevPage: page > 1
//     }
//   };
// };

export const getPaginatedCourses = async (queryObj) => {
  // ==========================================
  // 1. FILTERING
  // ==========================================
  // Create a shallow copy of the incoming query parameters
  const filterObj = { ...queryObj };

  // Remove fields that are meant for formatting, not database filtering
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete filterObj[el]);

  // Convert to string to manipulate operators (gte, gt, lte, lt)
  let queryStr = JSON.stringify(filterObj);

  // Regex: Find any of the 4 operators and prepend a '$'
  // e.g., {"price":{"lte":"100"}} becomes {"price":{"$lte":"100"}}
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  const finalFilter = JSON.parse(queryStr);

  // Initialize the Mongoose query object (but don't execute it yet!)
  let query = Course.find(finalFilter)
    .populate("instructorId", "name rating -_id")
    .select("-__v");

  // ==========================================
  // 2. SORTING
  // ==========================================
  if (queryObj.sort) {
    // Mongoose expects spaces, not commas: .sort('price -createdAt')
    // URL format: ?sort=-price,createdAt
    const sortBy = queryObj.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    // Default sort: newest first
    query = query.sort("-createdAt");
  }

  // ==========================================
  // 3. PAGINATION
  // ==========================================
  const page = Math.max(1, Number(queryObj.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // ==========================================
  // 4. EXECUTION
  // ==========================================
  const [totalCourses, courses] = await Promise.all([
    Course.countDocuments(finalFilter),
    query.lean(), // Execute the fully chained query
  ]);

  const totalPages = Math.ceil(totalCourses / limit);

  if (page > totalPages && totalCourses > 0) {
    throw new AppError("This page does not exist.", 404);
  }

  return {
    courses,
    meta: {
      totalItems: totalCourses,
      itemsPerPage: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
