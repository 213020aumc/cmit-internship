# Mongoose Service Functions — CRUD with .select(), .lean() & .populate()

A production-structured Express 5 REST API focused on building **robust Mongoose service functions**. This project demonstrates how to write clean, reusable service-layer methods that handle all five CRUD operations against MongoDB — using `.select()` for field projection, `.lean()` for performance-optimized read responses, `.populate()` for resolving document references, and **referential integrity checks** that validate foreign-key relationships before creating or updating documents.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Request Lifecycle](#request-lifecycle)
- [Service Layer Deep Dive](#-service-layer-deep-dive)
  - [Create — Referential Integrity Check + Task.create()](#create--referential-integrity-check--taskcreate)
  - [Read All — Query Filters + populate + select + lean](#read-all--query-filters--populate--select--lean)
  - [Read One — findById + select + lean](#read-one--findbyid--select--lean)
  - [Update — Existence Check + findByIdAndUpdate Options](#update--existence-check--findbyidandupdate-options)
  - [Delete — findByIdAndDelete + Boolean Return](#delete--findbyidanddelete--boolean-return)
- [Mongoose .lean() — Performance Deep Dive](#-mongoose-lean--performance-deep-dive)
- [Controller Pattern — Thin Controllers, Fat Services](#-controller-pattern--thin-controllers-fat-services)
- [Centralized Error Handling](#-centralized-error-handling)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Complete CRUD Service Layer** — Five dedicated service functions (`create`, `fetchAll`, `fetchById`, `update`, `remove`) encapsulating all Mongoose queries
- **Referential Integrity** — Before creating or updating a task, the service verifies the `assignedTo` user actually exists in the database
- **Query Chaining** — `.populate()` → `.select()` → `.lean()` chained for optimized, projected, resolved responses
- **Query String Filtering** — Optional `?completed=true/false` filter on the read-all endpoint
- **Thin Controller Pattern** — Controllers contain zero business logic; they delegate everything to the service layer
- **Consistent JSON Responses** — `sendResponse()` helper ensures every success response follows `{ success, message, data }` format
- **Production Error Pipeline** — Mongoose `CastError`, `ValidationError`, and duplicate key (`11000`) all normalized into clean `AppError` responses

---

## 🧰 Tech Stack

| Technology                | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| **Node.js**               | JavaScript runtime (v24+ recommended)              |
| **Express 5** (`^5.2.1`)  | Web framework with native async error propagation  |
| **Mongoose 9** (`^9.9.4`) | MongoDB ODM — schemas, validation, query chaining  |
| **ES Modules**            | Native `"type": "module"` (`import`/`export`)      |
| **Nodemon**               | Hot-reloading development server with `--env-file` |

---

## 🏗 Architecture

### Directory Structure

```
service-functions-with-mongoose/
├── server.js                         # App entry — MongoDB connect-then-listen
├── .env                              # Environment variables (NODE_ENV, MONGO_URI)
├── package.json                      # Dependencies & scripts
│
├── models/
│   ├── user.model.js                 # User schema + custom instance methods
│   └── task.model.js                 # Task schema + ObjectId ref to User
│
├── services/
│   ├── task.service.js               # ★ Core focus — 5 CRUD functions with Mongoose queries
│   └── user.service.js               # User creation service
│
├── controllers/
│   ├── task.controller.js            # Thin controllers — delegates to task.service
│   └── user.controller.js            # User creation handler
│
├── routes/
│   ├── task.routes.js                # Task CRUD routes with validation middleware
│   └── user.routes.js                # User creation route
│
├── middleware/
│   ├── validate.middleware.js        # Title validation before controller
│   ├── logger.middleware.js          # ISO timestamp request logger
│   └── globalErrorHandler.js         # Centralized error handler (Mongoose errors → AppError)
│
└── utils/
    └── appError.js                   # Custom AppError class (statusCode + isOperational)
```

### Request Lifecycle

```
Client Request
      │
      ▼
  express.json() → requestLogger → Route Matching
      │
      ▼
  ┌─────────────────┐     ┌──────────────────────────┐      ┌───────────────────┐
  │    Controller   │────▶│      Service Layer       │────▶│    MongoDB        │
  │  (thin — no     │     │  (all business logic)    │      │  (persistent      │
  │   business      │     │                          │      │   storage)        │
  │   logic)        │     │  • Referential checks    │      │                   │
  │                 │     │  • Mongoose queries      │      │                   │
  │  Receives req   │     │  • .populate().select()  │      │                   │
  │  Sends res      │     │  • .lean() optimization  │      │                   │
  └─────────────────┘     └──────────────────────────┘      └───────────────────┘
        │                           │
        │                           │ Errors thrown
        ▼                           ▼
  sendResponse()           globalErrorHandler
  { success, msg, data }   ├── CastError → 400
                           ├── 11000 → 400 (duplicate)
                           ├── ValidationError → 400
                           └── Unknown → 500
```

---

## ⚙️ Service Layer Deep Dive

The service layer (`services/task.service.js`) is the core of this project. Every function encapsulates a specific Mongoose operation with proper query chaining and error handling.

### Create — Referential Integrity Check + Task.create()

Before creating a task, the service validates that the `assignedTo` user actually exists in the database:

```javascript
export const create = async (data) => {
  // Referential integrity check — prevents orphaned references
  if (data.assignedTo) {
    const userExists = await User.findById(data.assignedTo);
    if (!userExists) {
      throw new AppError("Assigned user does not exist", 404);
    }
  }

  // Task.create() validates against schema AND saves in one step
  const newTask = await Task.create(data);
  return newTask;
};
```

| Step                             | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `User.findById(data.assignedTo)` | Checks that the referenced user exists before creating the task |
| `throw new AppError(...)`        | Returns a 404 if the user doesn't exist (not a generic 500)     |
| `Task.create(data)`              | Validates against schema constraints AND inserts into MongoDB   |

---

### Read All — Query Filters + populate + select + lean

The most complex query chain — builds a dynamic filter, resolves references, strips internal fields, and returns lightweight objects:

```javascript
export const fetchAll = async (completedFilter) => {
  let query = {};

  // Dynamic filter from query string (?completed=true)
  if (completedFilter !== undefined) {
    query.completed = completedFilter === "true";
  }

  const tasks = await Task.find(query)
    .populate("assignedTo", "name email -_id") // Resolve ref, select only name & email
    .select("-__v") // Exclude Mongoose versioning field
    .lean(); // Return plain JS objects (faster)

  return tasks;
};
```

| Chain Method                                 | What It Does                                                          |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `Task.find(query)`                           | Finds all documents matching the filter object                        |
| `.populate("assignedTo", "name email -_id")` | Replaces the ObjectId with `{ name, email }` from the User document   |
| `.select("-__v")`                            | Excludes the internal `__v` versioning field from the response        |
| `.lean()`                                    | Skips Mongoose document hydration — returns a plain JavaScript object |

---

### Read One — findById + select + lean

```javascript
export const fetchById = async (id) => {
  const task = await Task.findById(id).select("-__v").lean();
  return task; // Returns null if not found (handled in controller)
};
```

> **Note:** Mongoose's `findById()` returns `null` (not an error) when no document matches. The controller is responsible for checking `null` and throwing `AppError("Task not found", 404)`.

---

### Update — Existence Check + findByIdAndUpdate Options

```javascript
export const update = async (id, data) => {
  // Referential integrity check on update too
  if (data.assignedTo) {
    const userExists = await User.findById(data.assignedTo);
    if (!userExists) {
      throw new AppError("Assigned user does not exist", 404);
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(id, data, {
    returnDocument: "after", // Modern syntax — returns the UPDATED document
    // new: true,             // Legacy Mongoose syntax (same effect)
    runValidators: true, // Forces schema validation on update data
  })
    .select("-__v")
    .lean();

  return updatedTask;
};
```

| Option                    | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `returnDocument: "after"` | Returns the document **after** the update is applied (modern native driver syntax) |
| `new: true`               | Legacy Mongoose equivalent of `returnDocument: "after"`                            |
| `runValidators: true`     | Without this, `findByIdAndUpdate` skips schema validation entirely                 |

> **Critical:** By default, `findByIdAndUpdate` does **NOT** run schema validators. You must explicitly pass `runValidators: true` or invalid data will be saved silently.

---

### Delete — findByIdAndDelete + Boolean Return

```javascript
export const remove = async (id) => {
  const deletedTask = await Task.findByIdAndDelete(id);

  // Return a boolean — the controller doesn't need the full deleted document
  return !!deletedTask;
};
```

| Pattern         | Reasoning                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `!!deletedTask` | Converts `null` (not found) to `false` and a document object to `true`       |
| Boolean return  | Keeps the service contract simple — the controller only needs "did it work?" |

---

## 📊 Mongoose .lean() — Performance Deep Dive

By default, every Mongoose query returns **full Mongoose Document objects** with change tracking, getters/setters, virtuals, and all instance methods. For read-only API responses, this overhead is unnecessary.

The following infographic compares the two approaches:

![Mongoose .lean() — What Happens and Why It Affects Performance](Mongoose%20Lean.png)

| Feature                                    | Without `.lean()` (Default)           | With `.lean()`                         |
| ------------------------------------------ | ------------------------------------- | -------------------------------------- |
| **Result Type**                            | Mongoose Document                     | Plain JavaScript Object                |
| **Has Methods** (`.save()`, `.populate()`) | ✅ Yes                                | ❌ No                                  |
| **Change Tracking**                        | ✅ Active                             | ❌ None                                |
| **Memory Usage**                           | Higher                                | Lower                                  |
| **Query Performance**                      | Slower (hydration overhead)           | Faster (skips hydration)               |
| **Best Use Case**                          | When you need to modify and `.save()` | When you only need to read and respond |

```javascript
// ❌ Without lean — heavy Mongoose Document
const task = await Task.findById(id);
task.title = "New Title";
await task.save(); // ✅ Works — full Document with .save()

// ✅ With lean — lightweight plain JS object
const task = await Task.findById(id).lean();
task.title = "New Title";
await task.save(); // ❌ Error — .save() is not a function
```

> **Rule of Thumb:** Use `.lean()` on all read-only queries (GET endpoints). Skip `.lean()` only when you need Mongoose document methods like `.save()`, `.populate()`, or custom instance methods.

---

## 🎛 Controller Pattern — Thin Controllers, Fat Services

Controllers in this architecture contain **zero business logic**. They receive the request, call the appropriate service function, and format the response:

```javascript
// Helper for consistent JSON response format
const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({ success: true, message, data });
};

export const getTasks = async (req, res) => {
  const tasks = await taskService.fetchAll(req.query.completed);
  sendResponse(res, 200, tasks, "Tasks retrieved successfully");
};

export const getTask = async (req, res) => {
  const taskId = req.params.id;
  const task = await taskService.fetchById(taskId);
  if (!task) throw new AppError("Task not found", 404); // Only decision: null check

  sendResponse(res, 200, task, "Task found");
};
```

| Responsibility                                | Controller      | Service              |
| --------------------------------------------- | --------------- | -------------------- |
| Parse `req.params` / `req.query` / `req.body` | ✅              | ❌                   |
| Call Mongoose queries                         | ❌              | ✅                   |
| Referential integrity checks                  | ❌              | ✅                   |
| Format JSON response                          | ✅              | ❌                   |
| Throw `AppError` for not found                | ✅ (null check) | ✅ (existence check) |

---

## 🛡️ Centralized Error Handling

The global error handler normalizes all Mongoose database errors into clean JSON responses:

| Error Type            | Trigger                                           | Normalized Response                                   |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| **`CastError`**       | Invalid ObjectId format (e.g., `"abc"` for `:id`) | `"Invalid _id: abc."` (400)                           |
| **`code: 11000`**     | Duplicate value on `unique` field                 | `"Duplicate field 'email' with value: '...'."` (400)  |
| **`ValidationError`** | Schema constraint violation                       | `"Invalid input data. Task title is required."` (400) |
| **JSON Parse Error**  | Malformed JSON in request body                    | `"Invalid JSON syntax in request body."` (400)        |
| **`AppError`**        | Custom application error                          | Original message with appropriate status code         |
| **Unknown**           | Programming/unexpected error                      | `"Something went very wrong!"` (500, production only) |

---

## 📡 API Reference

### Task Endpoints — `http://localhost:3000/api/tasks`

| Method   | Endpoint         | Description                                | Service Function |
| -------- | ---------------- | ------------------------------------------ | ---------------- |
| `GET`    | `/api/tasks`     | Get all tasks (optional `?completed=true`) | `fetchAll()`     |
| `GET`    | `/api/tasks/:id` | Get a single task by `_id`                 | `fetchById()`    |
| `POST`   | `/api/tasks`     | Create a new task                          | `create()`       |
| `PUT`    | `/api/tasks/:id` | Update a task                              | `update()`       |
| `DELETE` | `/api/tasks/:id` | Delete a task                              | `remove()`       |

### User Endpoints — `http://localhost:3000/api/users`

| Method | Endpoint     | Description       |
| ------ | ------------ | ----------------- |
| `POST` | `/api/users` | Create a new user |

### Request & Response Examples

#### Create a Task (with referential integrity)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "priority": "high", "assignedTo": "64abc123..."}'
```

**Success (201 Created):**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "789xyz456...",
    "title": "Fix login bug",
    "completed": false,
    "difficulty": 1,
    "priority": "high",
    "assignedTo": "64abc123...",
    "createdAt": "2026-09-01T...",
    "updatedAt": "2026-09-01T..."
  }
}
```

**Error — Invalid user reference (404):**

```json
{
  "status": "fail",
  "message": "Assigned user does not exist"
}
```

#### Get All Tasks (with populated user, projected fields, lean response)

```bash
curl http://localhost:3000/api/tasks
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "_id": "789xyz456...",
      "title": "Fix login bug",
      "completed": false,
      "difficulty": 1,
      "priority": "high",
      "assignedTo": {
        "name": "Alice",
        "email": "alice@mail.com"
      },
      "createdAt": "2026-09-01T...",
      "updatedAt": "2026-09-01T..."
    }
  ]
}
```

#### Filter by Completion Status

```bash
curl http://localhost:3000/api/tasks?completed=true
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
cd service-functions-with-mongoose
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

> For **MongoDB Atlas**, use: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<database_name>`

### 4. Start Development Server

```bash
npm run dev
```

You should see:

```
✅ Successfully connected to MongoDB
API structured and running on http://localhost:3000
```

### 5. Test the API

First create a **User** (`POST /api/users`), then use the returned `_id` as `assignedTo` when creating **Tasks** (`POST /api/tasks`).

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

| Concept                                             | Description                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Service Layer**                                   | Encapsulates all business logic and Mongoose queries — controllers never touch the database directly |
| **Referential Integrity**                           | Before create/update, verify the referenced document exists with `findById()`                        |
| **`Task.create(data)`**                             | Validates against schema AND inserts in a single atomic operation                                    |
| **`Task.find(query)`**                              | Returns all documents matching the filter object                                                     |
| **`Task.findById(id)`**                             | Returns a single document by `_id`, or `null` if not found                                           |
| **`.populate("field", "projection")`**              | Replaces an ObjectId with the actual referenced document (with field selection)                      |
| **`.select("-__v")`**                               | Excludes fields from the query result (projection)                                                   |
| **`.lean()`**                                       | Returns plain JS objects instead of heavy Mongoose documents (read-only optimization)                |
| **`findByIdAndUpdate` + `returnDocument: "after"`** | Returns the updated document (modern syntax, replaces legacy `new: true`)                            |
| **`runValidators: true`**                           | Forces schema validation on update operations (off by default)                                       |
| **`findByIdAndDelete`**                             | Finds and removes a document, returns the deleted document or `null`                                 |
| **`!!value`**                                       | Double negation — converts any value to its boolean equivalent                                       |
| **Thin Controller**                                 | Parses request, calls service, formats response — zero business logic                                |
| **`sendResponse()`**                                | Helper ensuring consistent `{ success, message, data }` JSON format                                  |
| **Connect-then-Listen**                             | `mongoose.connect().then(() => app.listen())` — server starts only after DB is ready                 |
