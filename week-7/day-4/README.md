# MongoDB Aggregation Pipelines, Joi Validation Factory & B-Tree Indexing

A production-structured Express 5 REST API that introduces three powerful concepts: **MongoDB Aggregation Pipelines** for server-side data analysis (`$match` → `$group` → `$lookup` → `$unwind` → `$project` → `$sort`), a **reusable Joi validation middleware factory** replacing hardcoded validation functions, and **B-Tree indexing** for understanding how MongoDB optimizes query performance at the storage engine level.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Route Ordering Strategy](#route-ordering-strategy)
- [MongoDB Aggregation Pipelines](#-mongodb-aggregation-pipelines)
  - [Why Aggregation?](#why-aggregation)
  - [Common Aggregation Operators](#common-aggregation-operators)
  - [Pipeline 1: Task Statistics ($match → $group → $sort)](#pipeline-1-task-statistics-match--group--sort)
  - [Pipeline 2: Top Performers ($match → $lookup → $unwind → $group → $sort → $project)](#pipeline-2-top-performers-match--lookup--unwind--group--sort--project)
  - [Aggregation Pipelines Cheat Sheet](#aggregation-pipelines-cheat-sheet)
- [Joi Validation Middleware Factory](#-joi-validation-middleware-factory)
  - [Direct Middleware vs Factory Pattern](#direct-middleware-vs-factory-pattern)
  - [The Factory Function](#the-factory-function)
  - [Joi Schema Definitions](#joi-schema-definitions)
  - [Route Integration](#route-integration)
- [MongoDB B-Tree Indexing](#-mongodb-b-tree-indexing)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Aggregation Pipelines** — Server-side data analysis using `$match`, `$group`, `$lookup`, `$unwind`, `$project`, and `$sort` stages
- **Task Statistics Endpoint** — Groups tasks by completion status with count, average difficulty, and max difficulty
- **Top Performers Endpoint** — Cross-collection join (`$lookup`) to rank users by completed task count
- **Joi Validation Factory** — A single reusable `validate(schema)` higher-order function replacing per-route hardcoded validators
- **Separate Create/Update Schemas** — `createTaskSchema` (strict required fields) and `updateTaskSchema` (flexible partial updates with `.min(1)`)
- **Route Ordering** — Static routes (`/stats`, `/top-performers`) registered before dynamic `/:id` routes to prevent conflicts
- **B-Tree Index Theory** — Understanding how MongoDB indexes work at the storage level for O(log n) lookups

---

## 🧰 Tech Stack

| Technology                | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| **Node.js**               | JavaScript runtime (v24+ recommended)              |
| **Express 5** (`^5.2.1`)  | Web framework with native async error propagation  |
| **Mongoose 9** (`^9.9.4`) | MongoDB ODM — schemas, aggregation, query chaining |
| **Joi** (`^18.2.5`)       | Declarative request body validation                |
| **ES Modules**            | Native `"type": "module"` (`import`/`export`)      |
| **Nodemon**               | Hot-reloading development server with `--env-file` |

---

## 🏗 Architecture

### Directory Structure

```
aggregation-pipeline/
├── server.js                         # App entry — MongoDB connect-then-listen
├── .env                              # Environment variables (NODE_ENV, MONGO_URI)
├── package.json                      # Dependencies & scripts (now includes Joi)
│
├── models/
│   ├── user.model.js                 # User schema + custom instance methods
│   └── task.model.js                 # Task schema + ObjectId ref to User
│
├── validations/
│   └── task.validation.js            # ★ Joi schemas (createTaskSchema, updateTaskSchema)
│
├── middleware/
│   ├── validate.middleware.js        # ★ Reusable Joi factory: validate(schema) → middleware
│   ├── logger.middleware.js          # ISO timestamp request logger
│   └── globalErrorHandler.js         # Centralized error handler (Mongoose + Joi errors)
│
├── routes/
│   ├── task.routes.js                # ★ Route ordering: static → CRUD → dynamic /:id
│   └── user.routes.js                # User creation route
│
├── controllers/
│   ├── task.controller.js            # ★ New: getTaskStats, getTopPerformers handlers
│   └── user.controller.js            # User creation handler
│
├── services/
│   ├── task.service.js               # ★ New: aggregation pipelines (getTaskStats, getTopPerformers)
│   └── user.service.js               # User creation service
│
└── utils/
    └── appError.js                   # Custom AppError class (statusCode + isOperational)
```

### Route Ordering Strategy

Routes are registered in a specific order to prevent Express from matching `/stats` as a dynamic `:id` parameter:

```javascript
// 1. Static/Custom Routes (Must come FIRST)
router.get("/stats", getTaskStats);
router.get("/top-performers", getTopPerformers);

// 2. Standard CRUD Routes
router.get("/", getTasks);
router.post("/", validate(createTaskSchema), createTask);

// 3. Dynamic ID Routes (Must come LAST)
router.get("/:id", getTask);
router.put("/:id", validate(updateTaskSchema), updateTask);
router.delete("/:id", deleteTask);
```

> **Why this order matters:** If `/:id` is registered before `/stats`, Express will treat the string `"stats"` as an `id` parameter — resulting in a `CastError` instead of calling `getTaskStats`.

---

## 📊 MongoDB Aggregation Pipelines

### Why Aggregation?

Without aggregation, the application must fetch all documents and calculate statistics in JavaScript (CPU-heavy, memory-intensive, and slow over the network). Aggregation moves the heavy computational work to the **MongoDB server**, which returns only the final result.

```
Without Aggregation:                    With Aggregation:
┌──────────┐    100,000 docs     ┌─────┐    ┌──────────┐    small result    ┌─────┐
│ MongoDB  │ ──────────────────▶ │ App │    │ MongoDB  │ ─────────────────▶│ App │
└──────────┘                     └─────┘    └──────────┘                    └─────┘
                                  App does     DB does group,
                                  grouping     sum, avg, sort
                                  locally      and sends back
                                               final answer
```

### Common Aggregation Operators

| Operator   | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `$match`   | Filter documents (like a `WHERE` clause) — use early to reduce data        |
| `$group`   | Group documents by a field and compute aggregates (`$sum`, `$avg`, `$max`) |
| `$sort`    | Sort the results (ascending `1`, descending `-1`)                          |
| `$limit`   | Limit the number of returned documents                                     |
| `$lookup`  | Join with another collection (like a SQL `LEFT JOIN`)                      |
| `$unwind`  | Deconstruct an array field into separate documents                         |
| `$project` | Reshape the output — rename fields, exclude `_id`, compute new fields      |

---

### Pipeline 1: Task Statistics (`$match` → `$group` → `$sort`)

Groups all non-archived tasks by their `completed` status and computes statistics:

```javascript
export const getTaskStats = async () => {
  const stats = await Task.aggregate([
    // STAGE 1: $match — Filter out archived tasks early
    { $match: { isArchived: { $ne: true } } },

    // STAGE 2: $group — Group by the 'completed' field
    {
      $group: {
        _id: "$completed", // Group by true or false
        numTasks: { $sum: 1 }, // Count documents in each group
        avgDifficulty: { $avg: "$difficulty" },
        maxDifficulty: { $max: "$difficulty" },
      },
    },

    // STAGE 3: $sort — Most tasks first
    { $sort: { numTasks: -1 } },
  ]);

  return stats;
};
```

**Example Response:**

```json
[
  {
    "_id": false,
    "numTasks": 5,
    "avgDifficulty": 3.4,
    "maxDifficulty": 8
  },
  {
    "_id": true,
    "numTasks": 3,
    "avgDifficulty": 6.0,
    "maxDifficulty": 10
  }
]
```

| Stage    | Input Documents | Output                                         |
| -------- | --------------- | ---------------------------------------------- |
| `$match` | All tasks       | Only non-archived tasks                        |
| `$group` | Filtered tasks  | 2 groups: `{ _id: true }` and `{ _id: false }` |
| `$sort`  | 2 groups        | Ordered by `numTasks` descending               |

---

### Pipeline 2: Top Performers (`$match` → `$lookup` → `$unwind` → `$group` → `$sort` → `$project`)

A 5-stage cross-collection pipeline that joins Tasks with Users to rank users by completed task count:

```javascript
export const getTopPerformers = async () => {
  return await Task.aggregate([
    // 1. MATCH: Only completed tasks
    { $match: { completed: true } },

    // 2. LOOKUP: Join the 'users' collection
    {
      $lookup: {
        from: "users", // Physical collection name (lowercase, plural)
        localField: "assignedTo", // Field in tasks
        foreignField: "_id", // Field in users
        as: "userDetails", // Output array field
      },
    },

    // 3. UNWIND: Flatten the userDetails array into a single object
    { $unwind: "$userDetails" },

    // 4. GROUP: Count tasks per user
    {
      $group: {
        _id: "$userDetails.name",
        completedCount: { $sum: 1 },
      },
    },

    // 5. SORT: Highest count first
    { $sort: { completedCount: -1 } },

    // 6. PROJECT: Reshape the output
    {
      $project: {
        _id: 0, // Remove default _id
        userName: "$_id", // Rename _id to userName
        totalCompleted: "$completedCount",
      },
    },
  ]);
};
```

**Example Response:**

```json
[
  { "userName": "Alice", "totalCompleted": 7 },
  { "userName": "Bob", "totalCompleted": 4 },
  { "userName": "Charlie", "totalCompleted": 2 }
]
```

| Stage      | What It Does                                                           |
| ---------- | ---------------------------------------------------------------------- |
| `$match`   | Filters to only completed tasks                                        |
| `$lookup`  | Joins `tasks.assignedTo` → `users._id`, creates `userDetails[]` array  |
| `$unwind`  | Flattens `userDetails[]` from an array to a single object per document |
| `$group`   | Groups by `userDetails.name`, counts documents per user                |
| `$sort`    | Orders by `completedCount` descending                                  |
| `$project` | Renames fields and removes `_id` for a clean API response              |

---

### Aggregation Pipelines Cheat Sheet

The following infographic shows 5 practical aggregation pipeline examples with step-by-step data flow visualizations:

![MongoDB Aggregation Pipelines Cheat Sheet](MongoDB%20Aggregation%20Pipelines%20Cheat%20Sheet.png)

---

## ✅ Joi Validation Middleware Factory

### Direct Middleware vs Factory Pattern

The previous approach used a **hardcoded middleware function** that only validated a single field (`title`). This project upgrades to a **middleware factory** — a higher-order function that accepts any Joi schema and returns a configured middleware.

The following infographic compares both approaches:

![Direct Middleware vs Joi Factory — Comparison](Direct%20Middleware%20vs%20Joi%20Factory.png)

| Feature             | Direct Middleware                 | Middleware Factory (with Joi)                       |
| ------------------- | --------------------------------- | --------------------------------------------------- |
| **How it's passed** | `validate` (no parentheses)       | `validate(schema)` (invoked with schema)            |
| **Signature**       | `(req, res, next) => { ... }`     | `(schema) => (req, res, next) => { ... }`           |
| **Flexibility**     | Validates only one specific thing | Validates anything based on the schema              |
| **Best used for**   | Quick/simple static checks        | Complex schemas & reusability across the entire app |

> **Key Takeaway:** Direct middleware **IS** the middleware. A middleware factory **CREATES** middleware configured with the schema you provide.

---

### The Factory Function

```javascript
import { AppError } from "../utils/appError.js";

// Higher-order function: takes a Joi schema, returns an Express middleware
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false, // Return ALL validation errors, not just the first
    stripUnknown: true, // Silently remove fields not defined in the schema
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => detail.message)
      .join(", ");
    return next(new AppError(`Validation Error: ${errorMessages}`, 400));
  }

  // Replace req.body with the validated & sanitized value
  req.body = value;
  next();
};
```

| Option               | Purpose                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `abortEarly: false`  | Collects all errors at once instead of stopping at the first failure         |
| `stripUnknown: true` | Silently removes any extra fields the client sends that aren't in the schema |
| `req.body = value`   | Overwrites the raw body with Joi's validated, trimmed, typed output          |

---

### Joi Schema Definitions

**Create Schema** — strict, required fields:

```javascript
export const createTaskSchema = Joi.object({
  title: Joi.string().trim().max(100).required().messages({
    "string.empty": "Task title cannot be empty",
    "string.max": "Title cannot exceed 100 characters",
  }),
  completed: Joi.boolean().optional(),
  difficulty: Joi.number().min(1).max(10).optional(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
  isArchived: Joi.boolean().optional(),
  assignedTo: Joi.string().hex().length(24).required().messages({
    "string.hex": "assignedTo must be a valid MongoDB ObjectId format",
    "string.length": "assignedTo must be exactly 24 characters long",
  }),
});
```

**Update Schema** — flexible partial updates:

```javascript
export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().max(100).optional(),
  completed: Joi.boolean().optional(),
  difficulty: Joi.number().min(1).max(10).optional(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
  isArchived: Joi.boolean().optional(),
  assignedTo: Joi.string().hex().length(24).optional(),
})
  .min(1) // Client must send at least one field
  .messages({
    "object.min": "You must provide at least one field to update",
  });
```

| Joi Method          | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `.trim()`           | Strips leading/trailing whitespace                          |
| `.max(100)`         | Maximum string length constraint                            |
| `.required()`       | Field must be present in the request body                   |
| `.optional()`       | Field is allowed but not required                           |
| `.valid(...)`       | Restricts to a predefined set of allowed values (enum)      |
| `.hex().length(24)` | Validates MongoDB ObjectId format (24-character hex string) |
| `.min(1)`           | On the object level — at least one key must be present      |
| `.messages({})`     | Custom error messages for each validation rule              |

---

### Route Integration

```javascript
import { validate } from "../middleware/validate.middleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validations/task.validation.js";

// POST uses the strict createTaskSchema
router.post("/", validate(createTaskSchema), createTask);

// PUT uses the flexible updateTaskSchema
router.put("/:id", validate(updateTaskSchema), updateTask);
```

---

## 🌳 MongoDB B-Tree Indexing

MongoDB uses **B-Tree indexes** to make queries fast. Without an index, MongoDB performs a **collection scan** — checking every single document. With a B-Tree index, lookups are **O(log n)** instead of O(n).

The following infographic explains how B-Tree indexes work when a new document is inserted, including node splitting and rebalancing:

![MongoDB B-Tree Index — How It Works When a New User is Inserted](MongoDB%20B-Tree%20Index%20Insertion.png)

| Aspect                | Without Index              | With B-Tree Index                       |
| --------------------- | -------------------------- | --------------------------------------- |
| **Read Performance**  | O(n) — scans all documents | O(log n) — binary search through tree   |
| **Write Performance** | Fast (no index to update)  | Slightly slower (index must be updated) |
| **Storage**           | No overhead                | Extra storage for the index             |
| **Use Case**          | Small collections          | Any collection queried frequently       |

> **Key Points:**
>
> - B-Tree keeps data sorted — on insert, only the affected path is updated
> - If a node overflows, it splits and promotes the middle value upward
> - The tree remains balanced, guaranteeing O(log n) operations
> - MongoDB's `unique: true` on a schema field (e.g., `email`) automatically creates a B-Tree index

---

## 📡 API Reference

### Task Endpoints — `http://localhost:3000/api/tasks`

| Method   | Endpoint                    | Description                                     | Validation         |
| -------- | --------------------------- | ----------------------------------------------- | ------------------ |
| `GET`    | `/api/tasks/stats`          | ★ Aggregation — task statistics by completion   | None               |
| `GET`    | `/api/tasks/top-performers` | ★ Aggregation — users ranked by completed tasks | None               |
| `GET`    | `/api/tasks`                | Get all tasks (optional `?completed=true`)      | None               |
| `POST`   | `/api/tasks`                | Create a new task                               | `createTaskSchema` |
| `GET`    | `/api/tasks/:id`            | Get a single task by `_id`                      | CastError check    |
| `PUT`    | `/api/tasks/:id`            | Update a task                                   | `updateTaskSchema` |
| `DELETE` | `/api/tasks/:id`            | Delete a task                                   | CastError check    |

### User Endpoints — `http://localhost:3000/api/users`

| Method | Endpoint     | Description       |
| ------ | ------------ | ----------------- |
| `POST` | `/api/users` | Create a new user |

### Request & Response Examples

#### Get Task Statistics

```bash
curl http://localhost:3000/api/tasks/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Task statistics retrieved successfully",
  "data": [
    { "_id": false, "numTasks": 5, "avgDifficulty": 3.4, "maxDifficulty": 8 },
    { "_id": true, "numTasks": 3, "avgDifficulty": 6.0, "maxDifficulty": 10 }
  ]
}
```

#### Get Top Performers

```bash
curl http://localhost:3000/api/tasks/top-performers
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Top performers retrieved successfully",
  "data": [
    { "userName": "Alice", "totalCompleted": 7 },
    { "userName": "Bob", "totalCompleted": 4 }
  ]
}
```

#### Create Task (with Joi validation)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "priority": "high", "assignedTo": "64abc123def456789012abcd"}'
```

**Validation Error Response (400):**

```json
{
  "status": "fail",
  "message": "Validation Error: assignedTo must be a valid MongoDB ObjectId format"
}
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- [MongoDB](https://www.mongodb.com/) (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster)
- npm (Node Package Manager)

---

## 🏁 Getting Started

### 1. Navigate to Project Directory

```bash
cd aggregation-pipeline
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Update the `.env` file with your MongoDB connection string:

```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/my_database
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test the Aggregation Endpoints

First create **Users** and **Tasks**, then query:

- `GET /api/tasks/stats` — Task statistics grouped by completion
- `GET /api/tasks/top-performers` — Users ranked by completed task count

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable    | Description                                     | Default                                 |
| ----------- | ----------------------------------------------- | --------------------------------------- |
| `NODE_ENV`  | Application mode (`development` / `production`) | `development`                           |
| `MONGO_URI` | MongoDB connection string                       | `mongodb://localhost:27017/my_database` |

---

## 🔑 Key Concepts Summary

| Concept                     | Description                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Aggregation Pipeline**    | Array of stages that process documents sequentially on the MongoDB server                   |
| **`$match`**                | Filters documents early in the pipeline (like `WHERE`) — reduces data for later stages      |
| **`$group`**                | Groups documents by a field and computes aggregates (`$sum`, `$avg`, `$max`)                |
| **`$lookup`**               | Performs a left outer join with another collection (cross-collection data retrieval)        |
| **`$unwind`**               | Flattens an array field into separate documents (required after `$lookup`)                  |
| **`$project`**              | Reshapes output — rename fields, exclude `_id`, compute new fields                          |
| **`$sort`**                 | Orders documents ascending (`1`) or descending (`-1`)                                       |
| **`_id: null` in `$group`** | Groups all documents into a single result (e.g., total count across entire collection)      |
| **Middleware Factory**      | Higher-order function `(schema) => (req, res, next) => {}` that creates reusable middleware |
| **`abortEarly: false`**     | Joi option to collect all validation errors instead of stopping at the first                |
| **`stripUnknown: true`**    | Joi option to silently remove fields not defined in the schema                              |
| **`req.body = value`**      | Replaces raw body with Joi's validated, sanitized output                                    |
| **`.min(1)` on Joi object** | Ensures at least one field is provided in the update body                                   |
| **`.hex().length(24)`**     | Validates MongoDB ObjectId format (24-character hexadecimal string)                         |
| **Route Ordering**          | Static routes before dynamic `/:id` routes to prevent Express from mismatching              |
| **B-Tree Index**            | Sorted tree structure for O(log n) lookups — MongoDB's default index type                   |
| **Node Split**              | When a B-Tree node overflows, the middle value is promoted up and the node splits           |
| **`unique: true`**          | Automatically creates a B-Tree index on the field and enforces uniqueness                   |
