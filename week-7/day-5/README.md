# Course Management API — Multi-Resource Architecture with Aggregation Analytics

A production-structured Express 5 REST API managing **Courses** and **Instructors** as separate resources with cross-collection relationships. This project brings together everything from previous sessions into a new domain: **3-tier architecture** (Router → Controller → Service), **Joi validation schemas**, **5 aggregation analytics endpoints** (`$group`, `$match`, `$sort`, `$limit`, `$lookup`, `$unwind`, `$project`), **referential integrity** via ObjectId references, and **application-level duplicate checking** for unique constraints.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Multi-Resource Design](#multi-resource-design)
- [Data Models](#-data-models)
  - [Course Schema](#course-schema)
  - [Instructor Schema](#instructor-schema)
  - [Relationship Diagram](#relationship-diagram)
- [Aggregation Analytics — 5 Pipelines](#-aggregation-analytics--5-pipelines)
  - [1. Average Price by Category](#1-average-price-by-category)
  - [2. Top 3 Expensive Web Courses](#2-top-3-expensive-web-courses)
  - [3. Instructor Course Counts](#3-instructor-course-counts)
  - [4. Detailed Instructor Stats ($lookup)](#4-detailed-instructor-stats-lookup)
  - [5. Total Revenue Potential](#5-total-revenue-potential)
- [Validation Layer — Joi Schemas](#-validation-layer--joi-schemas)
- [Duplicate Email Prevention](#-duplicate-email-prevention)
- [Utility Modules](#-utility-modules)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Two Independent Resources** — Courses and Instructors with their own models, routes, and validation schemas
- **Cross-Collection Relationship** — `Course.instructorId` references `Instructor._id` with an indexed ObjectId field
- **5 Aggregation Endpoints** — Category averages, top web courses, instructor course counts, detailed instructor stats with `$lookup`, and total revenue potential
- **Joi Validation Factory** — Reusable `validate(schema)` middleware with separate create/update schemas per resource
- **Application-Level Duplicate Check** — `findOne({ email })` before `create()` to prevent duplicate instructors with a clean `400` error
- **Extracted Response Handler** — `sendResponse()` utility for consistent `{ success, message, data }` JSON format across all controllers
- **Route Namespace Isolation** — `/api/courses` and `/api/instructors` are independent route modules mounted on the Express app

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
course-management/
├── server.js                         # App entry — MongoDB connect-then-listen
├── .env                              # Environment variables (NODE_ENV, MONGO_URI)
├── package.json                      # Dependencies & scripts
│
├── models/
│   ├── course.model.js               # Course schema (title, price, category, instructorId ref)
│   └── instructor.model.js           # Instructor schema (name, email unique, rating)
│
├── validations/
│   ├── course.validation.js          # Joi: createCourseSchema, updateCourseSchema
│   └── instructor.validation.js      # Joi: createInstructorSchema
│
├── middleware/
│   ├── validate.middleware.js        # Reusable Joi factory: validate(schema) → middleware
│   ├── logger.middleware.js          # ISO timestamp request logger
│   └── globalErrorHandler.js         # Centralized error handler (CastError, 11000, Validation)
│
├── routes/
│   ├── course.routes.js              # ★ Aggregation stats routes + CRUD routes
│   └── instructor.routes.js          # Instructor creation route (with duplicate check)
│
├── controllers/
│   └── course.controller.js          # 7 handlers: 2 CRUD + 5 aggregation analytics
│
├── services/
│   └── course.service.js             # ★ 5 aggregation pipelines + standard CRUD operations
│
└── utils/
    ├── appError.js                   # Custom AppError class (statusCode + isOperational)
    └── responseHandler.js            # ★ Extracted sendResponse() utility
```

### Multi-Resource Design

```
Client
  │
  ├── POST /api/instructors ──── validate(createInstructorSchema)
  │                               │
  │                               ├── Duplicate email check (findOne)
  │                               └── Instructor.create()
  │
  ├── POST /api/courses ───────── validate(createCourseSchema)
  │                               │
  │                               └── Course.create() (instructorId → Instructor._id)
  │
  └── GET /api/courses/stats/* ── Aggregation pipelines
                                  │
                                  ├── $group → categories, revenue
                                  ├── $match → $sort → $limit → top web
                                  └── $lookup → $unwind → $project → instructor details
```

---

## 📦 Data Models

### Course Schema

```javascript
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      enum: {
        values: ["Web", "Data Science", "Design"],
        message: "{VALUE} is not a supported category",
      },
      required: [true, "Category is required"],
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: [true, "A course must be assigned to an instructor"],
      index: true, // ★ Explicit index for faster lookups & joins
    },
  },
  { timestamps: true },
);
```

| Field          | Type       | Constraints                                     |
| -------------- | ---------- | ----------------------------------------------- |
| `title`        | `String`   | Required, trimmed                               |
| `price`        | `Number`   | Required, minimum `0`                           |
| `category`     | `String`   | Required, enum: `Web`, `Data Science`, `Design` |
| `instructorId` | `ObjectId` | Required, ref → `Instructor`, indexed           |

> **Note:** The `index: true` on `instructorId` is explicitly declared to optimize aggregation `$lookup` joins and `populate()` queries.

---

### Instructor Schema

```javascript
const instructorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Instructor name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // ★ MongoDB unique index (B-Tree)
      lowercase: true, // Normalize before storing
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },
  },
  { timestamps: true },
);
```

| Field    | Type     | Constraints                         |
| -------- | -------- | ----------------------------------- |
| `name`   | `String` | Required, trimmed                   |
| `email`  | `String` | Required, unique index, lowercased  |
| `rating` | `Number` | Optional (default `5`), range `1–5` |

---

### Relationship Diagram

```
┌───────────────────┐         ┌───────────────────────┐
│   Instructor      │         │      Course           │
│───────────────────│         │───────────────────────│
│ _id (ObjectId)    │◄────────│ instructorId (ref)    │
│ name              │         │ title                 │
│ email (unique)    │         │ price                 │
│ rating (1-5)      │         │ category (enum)       │
│ createdAt         │         │ createdAt             │
│ updatedAt         │         │ updatedAt             │
└───────────────────┘         └───────────────────────┘
      ONE                            MANY
```

> An Instructor can have **many** Courses. Each Course belongs to **one** Instructor.

---

## 📊 Aggregation Analytics — 5 Pipelines

All aggregation pipelines are implemented in the service layer and exposed via `/api/courses/stats/*` endpoints.

### 1. Average Price by Category

Groups all courses by `category` and computes the average price per group:

```javascript
export const getAvgPriceByCategory = async () => {
  return await Course.aggregate([
    { $group: { _id: "$category", avgPrice: { $avg: "$price" } } },
  ]);
};
```

**Endpoint:** `GET /api/courses/stats/categories`

**Response:**

```json
[
  { "_id": "Web", "avgPrice": 200 },
  { "_id": "Database", "avgPrice": 500 },
  { "_id": "Design", "avgPrice": 150 }
]
```

---

### 2. Top 3 Expensive Web Courses

Filters to `Web` category, sorts by price descending, and limits to 3 results:

```javascript
export const getTopWebCourses = async () => {
  return await Course.aggregate([
    { $match: { category: "Web" } },
    { $sort: { price: -1 } },
    { $limit: 3 },
  ]);
};
```

**Endpoint:** `GET /api/courses/stats/top-web`

| Stage    | Purpose                             |
| -------- | ----------------------------------- |
| `$match` | Filter to only Web category courses |
| `$sort`  | Order by price, highest first       |
| `$limit` | Return only the top 3               |

---

### 3. Instructor Course Counts

Groups courses by `instructorId` and counts how many courses each instructor has:

```javascript
export const getInstructorCourseCounts = async () => {
  return await Course.aggregate([
    { $group: { _id: "$instructorId", totalCourses: { $sum: 1 } } },
    { $sort: { totalCourses: -1 } },
  ]);
};
```

**Endpoint:** `GET /api/courses/stats/instructor-counts`

---

### 4. Detailed Instructor Stats (`$lookup`)

A 4-stage cross-collection pipeline that joins Courses with Instructors to produce a human-readable report:

```javascript
export const getDetailedInstructorStats = async () => {
  return await Course.aggregate([
    // 1. Group courses by instructorId, count them
    { $group: { _id: "$instructorId", count: { $sum: 1 } } },

    // 2. Join with the instructors collection
    {
      $lookup: {
        from: "instructors", // Physical collection name
        localField: "_id", // From $group output (_id = instructorId)
        foreignField: "_id", // Match against Instructor._id
        as: "instructorDetails", // Output array
      },
    },

    // 3. Flatten the array to a single object
    { $unwind: "$instructorDetails" },

    // 4. Reshape the output
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
```

**Endpoint:** `GET /api/courses/stats/instructor-details`

**Response:**

```json
[
  { "name": "Alice", "email": "alice@tech.com", "courseCount": 4 },
  { "name": "Bob", "email": "bob@tech.com", "courseCount": 2 }
]
```

| Stage      | What It Does                                                        |
| ---------- | ------------------------------------------------------------------- |
| `$group`   | Counts courses per `instructorId`                                   |
| `$lookup`  | Joins `_id` (the grouped instructorId) with `instructors._id`       |
| `$unwind`  | Flattens the `instructorDetails[]` array to a single object         |
| `$project` | Picks `name`, `email`, and `courseCount`; removes `_id` from output |

---

### 5. Total Revenue Potential

Sums all course prices across the entire collection using `_id: null` (single group):

```javascript
export const getTotalRevenuePotential = async () => {
  return await Course.aggregate([
    { $group: { _id: null, totalValue: { $sum: "$price" } } },
    { $project: { _id: 0, totalValue: 1 } },
  ]);
};
```

**Endpoint:** `GET /api/courses/stats/revenue`

**Response:**

```json
[{ "totalValue": 4500 }]
```

> **Why `_id: null`?** Setting `_id` to `null` in `$group` puts all documents into a single group, allowing you to calculate a grand total across the entire collection.

---

## ✅ Validation Layer — Joi Schemas

### Course Validation

```javascript
// Strict schema — all required fields
export const createCourseSchema = Joi.object({
  title: Joi.string().trim().required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().valid("Web", "Data Science", "Design").required(),
  instructorId: Joi.string().hex().length(24).required().messages({
    "string.hex": "Instructor ID must be a valid MongoDB ObjectId",
  }),
});

// Flexible schema — partial updates
export const updateCourseSchema = Joi.object({
  title: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().valid("Web", "Data Science", "Design").optional(),
  instructorId: Joi.string().hex().length(24).optional(),
}).min(1); // At least one field must be provided
```

### Instructor Validation

```javascript
export const createInstructorSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(), // Joi validates email format
  rating: Joi.number().min(1).max(5).optional(),
});
```

| Joi Method          | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `.email()`          | Validates proper email format (RFC 5322)          |
| `.valid(...)`       | Restricts to a predefined set of allowed values   |
| `.hex().length(24)` | Validates MongoDB ObjectId format                 |
| `.min(1)` (object)  | Ensures at least one field is present in the body |

---

## 🛡️ Duplicate Email Prevention

The instructor route performs an **application-level pre-check** before calling `create()`, providing a clean `400` error instead of a raw MongoDB `E11000` error:

```javascript
router.post("/", validate(createInstructorSchema), async (req, res) => {
  // Application-level check BEFORE hitting the database
  const existingInstructor = await Instructor.findOne({
    email: req.body.email,
  });
  if (existingInstructor) {
    throw new AppError("An instructor with this email already exists", 400);
  }

  const instructor = await Instructor.create(req.body);
  sendResponse(res, 201, instructor, "Instructor created successfully");
});
```

| Defense Layer          | How It Works                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| **Joi**                | Validates email format before the route handler runs                      |
| **findOne()**          | Application-level check returns a clean `AppError` with a helpful message |
| **`unique: true`**     | MongoDB B-Tree index — ultimate safety net against race conditions        |
| **globalErrorHandler** | Catches `code: 11000` as a fallback and normalizes it to `400`            |

---

## 🔧 Utility Modules

### `sendResponse()` — Extracted Response Handler

Instead of repeating `res.status().json()` in every controller, a shared utility ensures consistent response format:

```javascript
export const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({ success: true, message, data });
};
```

**Usage in controllers:**

```javascript
sendResponse(res, 201, course, "Course created successfully");
sendResponse(res, 200, stats, "Category averages retrieved successfully");
```

### `AppError` — Custom Error Class

```javascript
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

---

## 📡 API Reference

### Course Endpoints — `http://localhost:3000/api/courses`

| Method | Endpoint                                | Description                                        | Validation           |
| ------ | --------------------------------------- | -------------------------------------------------- | -------------------- |
| `GET`  | `/api/courses/stats/categories`         | Average price grouped by category                  | None                 |
| `GET`  | `/api/courses/stats/top-web`            | Top 3 most expensive Web courses                   | None                 |
| `GET`  | `/api/courses/stats/instructor-counts`  | Course count per instructor (by ObjectId)          | None                 |
| `GET`  | `/api/courses/stats/instructor-details` | Instructor name, email, and course count ($lookup) | None                 |
| `GET`  | `/api/courses/stats/revenue`            | Total revenue potential (sum of all prices)        | None                 |
| `GET`  | `/api/courses`                          | Get all courses (populated instructor)             | None                 |
| `POST` | `/api/courses`                          | Create a new course                                | `createCourseSchema` |
| `PUT`  | `/api/courses/:id`                      | Update a course                                    | `updateCourseSchema` |

### Instructor Endpoints — `http://localhost:3000/api/instructors`

| Method | Endpoint           | Description                                    | Validation               |
| ------ | ------------------ | ---------------------------------------------- | ------------------------ |
| `POST` | `/api/instructors` | Create a new instructor (with duplicate check) | `createInstructorSchema` |

### Request & Response Examples

#### Create an Instructor

```bash
curl -X POST http://localhost:3000/api/instructors \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice@tech.com", "rating": 4}'
```

**Success (201 Created):**

```json
{
  "success": true,
  "message": "Instructor created successfully",
  "data": {
    "_id": "64abc123...",
    "name": "Alice Johnson",
    "email": "alice@tech.com",
    "rating": 4,
    "createdAt": "2026-09-02T...",
    "updatedAt": "2026-09-02T..."
  }
}
```

**Duplicate Email Error (400):**

```json
{
  "status": "fail",
  "message": "An instructor with this email already exists"
}
```

#### Create a Course

```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -d '{"title": "Advanced JavaScript", "price": 299, "category": "Web", "instructorId": "64abc123..."}'
```

#### Get All Courses (with populated instructor)

```bash
curl http://localhost:3000/api/courses
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": [
    {
      "_id": "789xyz...",
      "title": "Advanced JavaScript",
      "price": 299,
      "category": "Web",
      "instructorId": {
        "name": "Alice Johnson",
        "rating": 4
      },
      "createdAt": "2026-09-02T...",
      "updatedAt": "2026-09-02T..."
    }
  ]
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
cd course-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Update the `.env` file with your MongoDB connection string:

```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/course
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test the API

1. Create **Instructors** first (`POST /api/instructors`)
2. Use the returned `_id` as `instructorId` when creating **Courses** (`POST /api/courses`)
3. Query the **analytics endpoints** (`GET /api/courses/stats/*`)

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable    | Description                                     | Default                            |
| ----------- | ----------------------------------------------- | ---------------------------------- |
| `NODE_ENV`  | Application mode (`development` / `production`) | `development`                      |
| `MONGO_URI` | MongoDB connection string                       | `mongodb://localhost:27017/course` |

---

## 🔑 Key Concepts Summary

| Concept                                | Description                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Multi-Resource API**                 | Separate models, routes, and validations for each resource (Courses, Instructors)               |
| **`index: true`**                      | Explicitly indexes `instructorId` on Course for faster `$lookup` joins and `populate()` queries |
| **`unique: true`**                     | Creates a B-Tree index that enforces uniqueness at the database level                           |
| **Application-Level Duplicate Check**  | `findOne()` before `create()` for a clean `AppError` instead of a raw `E11000` error            |
| **`$group` with `_id: null`**          | Groups all documents into a single result for grand totals                                      |
| **`$match` → `$sort` → `$limit`**      | Filter → order → cap results (e.g., top 3 most expensive courses)                               |
| **`$lookup` → `$unwind` → `$project`** | Cross-collection join → flatten array → reshape output                                          |
| **`enum` with custom message**         | `{VALUE}` placeholder in Mongoose enum errors resolves to the rejected value                    |
| **`sendResponse()` utility**           | Extracted helper for consistent `{ success, message, data }` JSON format                        |
| **Route namespacing**                  | `/api/courses` and `/api/instructors` mounted as independent Express routers                    |
| **Stats route grouping**               | All aggregation endpoints under `/stats/*` namespace, registered before dynamic `/:id` routes   |
| **Joi `.email()`**                     | Validates RFC 5322 email format at the validation layer                                         |
| **Defense in depth**                   | Joi format check → `findOne()` pre-check → `unique` index → `globalErrorHandler` fallback       |
