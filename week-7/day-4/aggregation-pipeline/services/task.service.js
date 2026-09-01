import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

// ==========================================
// CREATE
// ==========================================
export const create = async (data) => {
  // Check if assignedTo user exists
  if (data.assignedTo) {
    const userExists = await User.findById(data.assignedTo);
    if (!userExists) {
      throw new AppError("Assigned user does not exist", 404);
    }
  }
  // Task.create() validates the data against your schema and saves it to MongoDB
  const newTask = await Task.create(data);
  return newTask;
};

// ==========================================
// READ ALL (With select and lean)
// ==========================================
export const fetchAll = async (completedFilter) => {
  let query = {};

  if (completedFilter !== undefined) {
    query.completed = completedFilter === "true";
  }

  // .select('-__v') removes Mongoose's internal versioning field from the response
  // .lean() converts the heavy Mongoose document into a plain JavaScript object
  const tasks = await Task.find(query)
    .populate("assignedTo", "name email -_id")
    .select("-__v")
    .lean();
  return tasks;
};

// ==========================================
// READ ONE
// ==========================================
export const fetchById = async (id) => {
  // If the document is not found, Mongoose returns null.
  const task = await Task.findById(id).select("-__v").lean();
  return task;
};

// ==========================================
// UPDATE
// ==========================================
export const update = async (id, data) => {
  // If updating the assigned user, check if the new user exists
  if (data.assignedTo) {
    const userExists = await User.findById(data.assignedTo);
    if (!userExists) {
      throw new AppError("Assigned user does not exist", 404);
    }
  }

  // returnDocument: "after" -> (Modern) Returns the updated document instead of the original.
  // runValidators: true -> Forces Mongoose to run your schema validation rules on the update!
  const updatedTask = await Task.findByIdAndUpdate(id, data, {
    returnDocument: "after", // Modern, explicit native driver syntax
    // new: true,            // Legacy Mongoose syntax (kept here for reference)
    runValidators: true,
  })
    .select("-__v")
    .lean();

  return updatedTask;
};

// ==========================================
// DELETE
// ==========================================
export const remove = async (id) => {
  // Returns the deleted document, or null if it didn't exist
  const deletedTask = await Task.findByIdAndDelete(id);

  // Return true if something was actually deleted
  return !!deletedTask;
};

export const getTaskStats = async () => {
  const stats = await Task.aggregate([
    // STAGE 1: $match (Filter out archived tasks early)
    { $match: { isArchived: { $ne: true } } },

    // STAGE 2: $group (Group by the 'completed' field)
    {
      $group: {
        _id: "$completed", // Group by true or false
        numTasks: { $sum: 1 }, // Add 1 for each doc
        avgDifficulty: { $avg: "$difficulty" },
        maxDifficulty: { $max: "$difficulty" },
      },
    },

    // STAGE 3: $sort (Sort by most tasks descending)
    { $sort: { numTasks: -1 } },
  ]);

  return stats;
};

export const getTopPerformers = async () => {
  return await Task.aggregate([
    // 1. MATCH: Filter down to only completed tasks
    { $match: { completed: true } },

    // 2. LOOKUP: Join the users collection (MongoDB stores 'User' as 'users')
    {
      $lookup: {
        from: "users", // The physical collection to join
        localField: "assignedTo", // The field in the Task collection
        foreignField: "_id", // The field in the User collection
        as: "userDetails", // The new array field to store the matched data
      },
    },

    // $lookup always returns an array.
    // $unwind flattens that array into a single object for easier grouping.
    { $unwind: "$userDetails" },

    // 3. GROUP: Count how many tasks belong to each user
    {
      $group: {
        _id: "$userDetails.name", // Group by the user's name
        completedCount: { $sum: 1 }, // Add 1 for every document
      },
    },

    // 4. SORT: Order by the highest count first
    { $sort: { completedCount: -1 } },

    // 5. PROJECT: Reshape the final output to look clean
    {
      $project: {
        _id: 0, // Remove the default _id field
        userName: "$_id", // Rename _id to userName
        totalCompleted: "$completedCount",
      },
    },
  ]);
};
