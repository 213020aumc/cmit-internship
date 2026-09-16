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
//   // Shallow copy of the incoming query parameters
//   const filterObj = { ...queryObj };

//   const excludedFields = ["page", "sort", "limit", "fields"];
//   excludedFields.forEach((el) => delete filterObj[el]);

//   let queryStr = JSON.stringify(filterObj);

//   queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

//   const finalFilter = JSON.parse(queryStr);

//   let query = Course.find(finalFilter)
//     .populate("instructorId", "name rating -_id")
//     .select("-__v");

//   if (queryObj.sort) {
//     const sortBy = queryObj.sort.split(",").join(" ");
//     query = query.sort(sortBy);
//   } else {
//     query = query.sort("-createdAt");
//   }

//   const page = Math.max(1, Number(queryObj.page) || 1);
//   const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
//   const skip = (page - 1) * limit;

//   query = query.skip(skip).limit(limit);

//   const [totalCourses, courses] = await Promise.all([
//     Course.countDocuments(finalFilter),
//     query.lean(),
//   ]);

//   const totalPages = Math.ceil(totalCourses / limit);

//   if (page > totalPages && totalCourses > 0) {
//     throw new AppError("This page does not exist.", 404);
//   }

//   return {
//     courses,
//     meta: {
//       totalItems: totalCourses,
//       itemsPerPage: limit,
//       currentPage: page,
//       totalPages,
//       hasNextPage: page < totalPages,
//       hasPrevPage: page > 1,
//     },
//   };
// };

export const getAdvancedCourses = async (queryObj) => {
  // 1. Initialize a clean, empty query object
  const filter = {};

  // ==========================================
  // 2. SAFE FILTERING (The Allowlist)
  // ==========================================
  // Only these specific fields will be processed. Everything else is ignored.
  const allowedFilters = ["category", "price", "rating", "instructorId"];

  allowedFilters.forEach((field) => {
    if (queryObj[field]) {
      // Handle advanced operators safely (e.g., ?price[lte]=100)
      if (typeof queryObj[field] === "object") {
        const operatorStr = JSON.stringify(queryObj[field]).replace(
          /\b(gte|gt|lte|lt)\b/g,
          (match) => `$${match}`,
        );
        filter[field] = JSON.parse(operatorStr);
      } else {
        // Handle exact matches (e.g., ?category=Web)
        filter[field] = queryObj[field];
      }
    }
  });

  // ==========================================
  // 3. TEXT SEARCH (Regex)
  // ==========================================
  // Allows partial matches: ?search=node matches "Advanced Node.js"
  if (queryObj.search) {
    filter.title = {
      $regex: queryObj.search,
      $options: "i", // Case-insensitive
    };
  }

  // Initialize the query chain with our safe filter
  let query = Course.find(filter).populate("instructorId", "name rating -_id");

  // ==========================================
  // 4. SORTING
  // ==========================================
  if (queryObj.sort) {
    // ?sort=-price,rating -> .sort('-price rating')
    const sortBy = queryObj.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt"); // Default sort
  }

  // ==========================================
  // 5. FIELD SELECTION (Projection)
  // ==========================================
  if (queryObj.fields) {
    // ?fields=title,price -> .select('title price')
    const fields = queryObj.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v"); // Default: exclude internal versioning
  }

  // ==========================================
  // 6. PAGINATION
  // ==========================================
  const page = Math.max(1, Number(queryObj.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // ==========================================
  // 7. EXECUTION
  // ==========================================
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
