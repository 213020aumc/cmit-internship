# Express 5 + Mongoose — MongoDB Connection, Schemas & References

A production-structured Express 5 REST API that replaces in-memory arrays with a **real MongoDB database** using **Mongoose 9**. This project introduces Mongoose schemas with built-in validations, document references (`ObjectId` + `populate()`), custom instance methods, Joi request validation, and a production-grade centralized error handler that normalizes Mongoose-specific errors (`CastError`, `ValidationError`, duplicate key `11000`).

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Request & Error Flow](#request--error-flow)
- [Mongoose Schema Design](#-mongoose-schema-design)
  - [User Model](#user-model-modelsusermodeljs)
  - [Task Model with ObjectId Reference](#task-model-with-objectid-reference-modelstaskmodeljs)
  - [Schema References & populate()](#schema-references--populate)
  - [Custom Instance Methods](#custom-instance-methods)
- [MongoDB Connection Strategy](#-mongodb-connection-strategy)
- [Mongoose Query Techniques](#-mongoose-query-techniques)
  - [.select() — Field Projection](#select--field-projection)
  - [.lean() — Plain JS Objects](#lean--plain-js-objects)
  - [.populate() — Resolving References](#populate--resolving-references)
  - [Update Options](#update-options-returndocument--runvalidators)
- [Centralized Error Handling](#-centralized-error-handling)
  - [Mongoose-Specific Error Normalization](#mongoose-specific-error-normalization)
  - [Development vs Production Responses](#development-vs-production-responses)
- [Common Debugging: ReferenceError from Missing Imports](#-common-debugging-referenceerror-from-missing-imports)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Real MongoDB Persistence** — Data survives server restarts via Mongoose ODM connected to MongoDB
- **Mongoose Schema Validation** — Built-in type checking, `required`, `trim`, `min`/`max`, `enum`, and custom error messages at the database layer
- **Document References** — Tasks link to Users via `ObjectId` + `ref: "User"`, resolved at query time with `.populate()`
- **Custom Instance Methods** — `getProfileUrl()` and `getProfileSummary()` attached to User documents via `schema.methods`
- **Joi Request Validation** — Validates incoming request bodies (hex ObjectId format, string constraints) before hitting the database
- **Mongoose Error Normalization** — Global error handler converts `CastError`, `ValidationError`, and duplicate key (`code: 11000`) into clean, client-friendly JSON
- **Connect-Then-Listen Pattern** — Express server starts only after a successful MongoDB connection
- **3-Tier Layered Architecture** — Routes → Controllers → Services with the Model layer handling all database operations

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime (v24+ recommended) |
| **Express 5** (`^5.2.1`) | Web framework with native async error propagation |
| **Mongoose 9** (`^9.9.4`) | MongoDB ODM for schema definition, validation & queries |
| **ES Modules** | Native `"type": "module"` (`import`/`export`) |
| **Nodemon** | Hot-reloading development server with `--env-file` |

---

## 🏗 Architecture

### Directory Structure

```
db-connection/
├── server.js                         # App entry — MongoDB connect-then-listen, routes & error handler
├── .env                              # Environment variables (NODE_ENV, MONGO_URI)
├── package.json                      # Dependencies & scripts
│
├── models/
│   ├── user.model.js                 # User schema (name, email, age) + custom instance methods
│   └── task.model.js                 # Task schema (title, priority, difficulty) + ObjectId ref to User
│
├── validations/
│   └── task.validation.js            # Joi schemas with hex ObjectId validation for assignedTo
│
├── middleware/
│   ├── validate.middleware.js        # Title validation middleware
│   ├── logger.middleware.js          # Global request logger
│   └── globalErrorHandler.js         # Centralized error handler with Mongoose error normalization
│
├── routes/
│   ├── task.routes.js                # Task CRUD routes with validation middleware
│   └── user.routes.js                # User creation route
│
├── controllers/
│   ├── task.controller.js            # Task request handling & standardized JSON responses
│   └── user.controller.js            # User creation handler
│
├── services/
│   ├── task.service.js               # Task business logic — Mongoose queries, populate, select, lean
│   └── user.service.js               # User creation via User.create()
│
└── utils/
    └── appError.js                   # Custom AppError class (statusCode + isOperational)
```

### Request & Error Flow

```
Client Request
      │
      ▼
  express.json()              ──▶ Parses raw JSON body into req.body
      │
      ▼
  requestLogger               ──▶ Logs "[timestamp] METHOD /url"
      │
      ▼
  taskRoutes / userRoutes     ──▶ Matches requested endpoint
      │
      ▼
  validate middleware         ──▶ Validates req.body (title check / Joi schema)
      │                           ├─ Invalid ──▶ next(new AppError(..., 400)) ──┐
      │                           └─ Valid   ──▶ continues to controller        │
      ▼                                                                         │
  Controller                  ──▶ Calls service layer                           │
      │                           └─ Throws AppError if not found (404) ────────┤
      ▼                                                                         │
  Service Layer               ──▶ Mongoose queries (Task.find, Task.create...)  │
      │                           └─ Mongoose errors (CastError, etc.) ─────────┤
      ▼                                                                         │
  MongoDB                     ──▶ Persistent document storage                   │
      │                                                                         │
      ▼                                                                         ▼
  Response (200 / 201)                                               globalErrorHandler
                                                          ┌─────────────────────────────────┐
                                                          │ CastError      → "Invalid _id"  │
                                                          │ Code 11000     → "Duplicate key" │
                                                          │ ValidationError→ "Invalid input" │
                                                          │ Dev mode: full stack trace       │
                                                          │ Prod mode: sanitized message     │
                                                          └─────────────────────────────────┘
```

---

## 📐 Mongoose Schema Design

### User Model (`models/user.model.js`)

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,       // Automatically creates a MongoDB unique index
      lowercase: true,    // Converts to lowercase before saving
    },
    age: {
      type: Number,
      min: [18, "You must be at least 18"],
      max: [120, "Age cannot exceed 120"],
    },
  },
  {
    timestamps: true,     // Adds createdAt and updatedAt automatically
  }
);
```

| Schema Option | Effect |
|---|---|
| `required: [true, "..."]` | Field must be present; custom error message on failure |
| `unique: true` | Creates a MongoDB unique index (triggers `code: 11000` on duplicates) |
| `lowercase: true` | Converts value to lowercase before saving to the database |
| `trim: true` | Strips leading/trailing whitespace |
| `min` / `max` | Numeric range enforcement with custom error messages |
| `timestamps: true` | Auto-adds `createdAt` and `updatedAt` fields |

---

### Task Model with ObjectId Reference (`models/task.model.js`)

```javascript
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    completed: { type: Boolean, default: false },
    difficulty: {
      type: Number,
      min: [1, "Difficulty must be at least 1"],
      max: [10, "Difficulty cannot exceed 10"],
      default: 1,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],  // Only these values are allowed
      default: "medium",
    },
    // The Reference — links this task to a specific User document
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",        // Must match the exact string name of the compiled User model
      required: [true, "A task must be assigned to a user"],
    },
  },
  { timestamps: true }
);
```

| Schema Feature | Purpose |
|---|---|
| `enum: [...]` | Restricts the value to a specific set of allowed strings |
| `default: "medium"` | Sets a default value if the client doesn't provide one |
| `type: ObjectId` + `ref: "User"` | Creates a reference to the User collection |
| `maxlength: [100, "..."]` | String length constraint with custom error message |

---

### Schema References & populate()

The `assignedTo` field stores only the `ObjectId` — not the entire User document. When you need the actual user data, you **populate** the reference at query time.

The following infographic explains how Mongoose schema references and `populate()` work together:

![Mongoose Schema References — ObjectId, ref, and populate()](Mongoose%20Schema%20References.png)

> **Key Insight:** `Task.assignedTo` stores the ObjectId of a User. It does NOT store the whole user object, only the reference (id). Calling `.populate("assignedTo")` replaces that ObjectId with the actual User document in the query result.

---

### Custom Instance Methods

Custom methods are defined on the schema **before** compiling the model. They are available on every Mongoose document instance (but NOT on `.lean()` results):

```javascript
// Define before mongoose.model()
userSchema.methods.getProfileUrl = function () {
  return `https://myapp.com/users/${this.name}`;
};

userSchema.methods.getProfileSummary = function () {
  return `${this.name} can be contacted at ${this.email}.`;
};
```

The following infographic shows how custom schema methods work and why they require full Mongoose documents:

![Custom Schema Method — How It Works](Custom%20Schema%20Method.png)

> **Important:** Custom methods use `this` to reference the current document. They do NOT work with `.lean()` because `.lean()` returns a plain JavaScript object without Mongoose's document prototype.

---

## 🔌 MongoDB Connection Strategy

The server uses a **connect-then-listen** pattern — Express only starts accepting requests after MongoDB is successfully connected:

```javascript
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/default";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);  // Force crash if the DB fails — prevents broken requests
  });
```

| Pattern | Why |
|---|---|
| `mongoose.connect()` inside `.then()` → `app.listen()` | Prevents the API from accepting requests before MongoDB is ready |
| `.catch()` → `process.exit(1)` | Crashes the process immediately if the database is unreachable |
| `MONGO_URI` from `.env` | Keeps connection credentials out of source code |

---

## 🔍 Mongoose Query Techniques

### .select() — Field Projection

Control which fields are returned from queries:

```javascript
// Exclude the __v versioning field
const tasks = await Task.find(query).select("-__v");

// Include only specific fields
const tasks = await Task.find(query).select("title completed");
```

### .lean() — Plain JS Objects

By default, Mongoose returns heavy document objects with change tracking. `.lean()` converts them to plain JavaScript objects for read-only responses:

```javascript
// Returns a lightweight plain object (no Mongoose methods available)
const tasks = await Task.find(query).select("-__v").lean();
```

| Method | Returns | Custom Methods | Performance |
|---|---|---|---|
| Without `.lean()` | Mongoose Document | ✅ Available | Heavier (change tracking) |
| With `.lean()` | Plain JS Object | ❌ Not available | Faster (read-only) |

### .populate() — Resolving References

Replace an ObjectId with the actual referenced document:

```javascript
// Populate the assignedTo field, returning only name and email (excluding _id)
const tasks = await Task.find(query)
  .populate("assignedTo", "name email -_id")
  .select("-__v")
  .lean();
```

### Update Options (`returnDocument` & `runValidators`)

```javascript
const updatedTask = await Task.findByIdAndUpdate(id, data, {
  returnDocument: "after",  // Modern syntax — returns the UPDATED document
  // new: true,             // Legacy Mongoose syntax (same effect)
  runValidators: true,      // Forces schema validation on the update data
})
  .select("-__v")
  .lean();
```

| Option | Purpose |
|---|---|
| `returnDocument: "after"` | Returns the document after the update is applied (modern native driver syntax) |
| `new: true` | Legacy Mongoose syntax equivalent to `returnDocument: "after"` |
| `runValidators: true` | Forces Mongoose to validate update data against the schema |

---

## 🛡️ Centralized Error Handling

### Mongoose-Specific Error Normalization

The global error handler detects and converts Mongoose database errors into clean, client-friendly `AppError` responses:

```javascript
// CastError — Invalid ObjectId format (e.g., "abc" instead of valid 24-char hex)
if (err.name === "CastError") error = handleCastErrorDB(error);
// → "Invalid _id: abc." (400)

// Duplicate Key — Unique constraint violation (e.g., duplicate email)
if (err.code === 11000) error = handleDuplicateFieldsDB(error);
// → "Duplicate field 'email' with value: "alice@mail.com". Please use another value!" (400)

// ValidationError — Schema validation failure (e.g., missing required field)
if (err.name === "ValidationError") error = handleValidationErrorDB(error);
// → "Invalid input data. Task title is required. Difficulty must be at least 1" (400)
```

| Mongoose Error | Trigger | Normalized Message |
|---|---|---|
| `CastError` | Invalid ObjectId format in `:id` param | `Invalid _id: <value>.` |
| `code: 11000` | Duplicate value on a `unique` field | `Duplicate field '<field>' with value: "<value>".` |
| `ValidationError` | Schema constraint violation | `Invalid input data. <all messages joined>` |

### Development vs Production Responses

**Development** — Full error object and stack trace for debugging:

```json
{
  "status": "fail",
  "error": { "statusCode": 400, "status": "fail", "isOperational": true },
  "message": "Invalid _id: abc.",
  "stack": "AppError: Invalid _id: abc.\\n    at handleCastErrorDB..."
}
```

**Production** — Sanitized, safe response:

```json
{
  "status": "fail",
  "message": "Invalid _id: abc."
}
```

Non-operational (programming) errors in production return a generic message to protect server internals:

```json
{
  "status": "error",
  "message": "Something went very wrong!"
}
```

---

## 🐛 Common Debugging: ReferenceError from Missing Imports

When using a model in the service layer without importing it, Node.js throws a `ReferenceError` that surfaces as a 500 error. The following infographic explains the problem and fix:

![ReferenceError — Missing Import Explained](ReferenceError%20Missing%20Import%20Explained.png)

> **Fix:** Always import the Model you reference in any file. `import { User } from "../models/user.model.js"` resolves the `ReferenceError: User is not defined` error.

---

## 📡 API Reference

### Task Endpoints — Base URL: `http://localhost:3000/api/tasks`

| Method | Endpoint | Description | Validation |
|---|---|---|---|
| `GET` | `/api/tasks` | Get all tasks (optional `?completed=true/false`) | None |
| `GET` | `/api/tasks/:id` | Get a single task by MongoDB `_id` | CastError check |
| `POST` | `/api/tasks` | Create a new task | Title validation + Joi |
| `PUT` | `/api/tasks/:id` | Update an existing task | CastError check |
| `DELETE` | `/api/tasks/:id` | Delete a task by `_id` | CastError check |

### User Endpoints — Base URL: `http://localhost:3000/api/users`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users` | Create a new user (name, email, age) |

### Request & Response Examples

#### Create User (Step 1 — needed for task assignment)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@mail.com", "age": 28}'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "64abc123...",
    "name": "Alice",
    "email": "alice@mail.com",
    "age": 28,
    "createdAt": "2026-09-01T...",
    "updatedAt": "2026-09-01T..."
  }
}
```

#### Create Task (with assignedTo reference)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "priority": "high", "assignedTo": "64abc123..."}'
```

#### Get All Tasks (with populated user)

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

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- [MongoDB](https://www.mongodb.com/) (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster)
- npm (Node Package Manager)

---

## 🏁 Getting Started

### 1. Navigate to Project Directory

```bash
cd db-connection
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

First create a **User**, then create **Tasks** with the user's `_id` in `assignedTo`.

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start server with Node.js (`node --env-file=.env server.js`) |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Application mode (`development` or `production`) | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/my_database` |

Loaded natively using Node.js `--env-file=.env` without external `dotenv` dependencies.

---

## 🔑 Key Concepts Summary

| Concept | Description |
|---|---|
| **Mongoose Schema** | Blueprint defining document structure, types, validations, and defaults |
| **`mongoose.model()`** | Compiles a schema into a Model class for querying a specific collection |
| **`ObjectId` + `ref`** | Creates a reference (foreign key equivalent) between two collections |
| **`.populate()`** | Replaces an ObjectId with the actual referenced document at query time |
| **`.select("-__v")`** | Field projection — excludes or includes specific fields from query results |
| **`.lean()`** | Converts Mongoose documents to plain JS objects for read-only performance |
| **`timestamps: true`** | Auto-adds `createdAt` and `updatedAt` to every document |
| **`unique: true`** | Creates a MongoDB unique index; violations trigger `code: 11000` |
| **`enum: [...]`** | Restricts a field to a predefined set of allowed values |
| **Custom Methods** | `schema.methods.fn = function()` adds instance methods to documents |
| **Connect-then-Listen** | `mongoose.connect().then(() => app.listen())` ensures DB is ready before serving |
| **`CastError`** | Thrown when an invalid ObjectId format is passed (e.g., `"abc"` for `:id`) |
| **`code: 11000`** | MongoDB duplicate key error on unique-indexed fields |
| **`ValidationError`** | Mongoose schema validation failure (missing required, out of range, etc.) |
| **`returnDocument: "after"`** | Modern option to return the updated document from `findByIdAndUpdate` |
| **`runValidators: true`** | Forces schema validation to run on update operations |
