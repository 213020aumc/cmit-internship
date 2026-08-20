# Express 5 Joi Validation & Centralized Error Handling

A production-grade Express 5 REST API demonstrating schema-based request validation with **Joi**, custom operational error handling with `AppError`, wildcard 404 route interception, and environment-aware centralized global error middleware.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Interactive API Documentation (Swagger UI)](#-interactive-api-documentation-swagger-ui)
- [Joi Schema Validation Deep Dive](#-joi-schema-validation-deep-dive)
  - [1. Defining Joi Schemas](#1-defining-joi-schemas)
  - [2. Generic Validation Middleware Factory](#2-generic-validation-middleware-factory)
  - [3. Applying Validation to Routes](#3-applying-validation-to-routes)
- [Centralized Error Handling Architecture](#-centralized-error-handling-architecture)
  - [1. Custom AppError Class](#1-custom-apperror-class)
  - [2. Express 5 Native Async Error Handling](#2-express-5-native-async-error-handling)
  - [3. Catching 404 Unhandled Routes](#3-catching-404-unhandled-routes)
  - [4. Global Error Middleware (Dev vs. Prod)](#4-global-error-middleware-dev-vs-prod)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Joi Schema Validation** — Strict schema contracts for request bodies with custom validation messages
- **Generic Validation Factory** — Reusable `validate(schema)` middleware checking all fields (`abortEarly: false`) and sanitizing data (`stripUnknown: true`)
- **Custom `AppError` Class** — Distinguishes operational errors (expected client faults) from programming errors (unexpected server bugs)
- **Express 5 Native Async Errors** — Thrown errors in `async` handlers automatically propagate to error middleware without `try/catch`
- **Wildcard 404 Interceptor** — `app.all("/*splat")` catches unmatched routes across all HTTP methods
- **Environment-Aware Error Responses** — Detailed stack traces in development; sanitized, safe messages in production
- **Interactive Swagger UI** — In-browser API documentation and live endpoint testing at `/api-docs`
- **Decoupled 3-Tier Architecture** — Clean separation of Routes → Controllers → Services

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime (v24+ recommended) |
| **Express 5** (`^5.2.1`) | Web framework with native async error propagation |
| **Joi** (`^17.13.3`) | Schema description and data validation library |
| **Swagger UI** (`swagger-ui-express`) | OpenAPI 3.0.0 interactive documentation at `/api-docs` |
| **ES Modules** | Native `"type": "module"` (`import`/`export`) |
| **Nodemon** | Hot-reloading development server with `--env-file` |

---

## 🏗 Architecture

### Directory Structure

```
validation-error-handling/
├── server.js                          # App entry — mounts global middleware, routes & error handler
├── swagger.json                       # Standalone OpenAPI 3.0.0 specification file
├── .env                               # Environment variables (NODE_ENV, PORT)
├── package.json                       # Dependencies & scripts
│
├── validations/
│   └── task.validation.js             # Joi schemas for task creation & updates
│
├── middleware/
│   ├── validate.middleware.js         # Generic Joi validation middleware factory
│   ├── logger.middleware.js           # Global request logger
│   └── globalErrorHandler.js          # Centralized 4-param error handler (dev/prod modes)
│
├── routes/
│   └── task.routes.js                 # Route definitions with validation middleware
│
├── controllers/
│   └── task.controller.js             # Request handling & HTTP response envelopes
│
├── services/
│   └── task.service.js                # Pure business logic & in-memory data store
│
└── utils/
    └── appError.js                    # Custom AppError class (statusCode + isOperational)
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
  taskRoutes                  ──▶ Matches requested endpoint
      │
      ▼
  validate(schema)            ──▶ Validates & sanitizes req.body via Joi
      │                           ├─ Invalid ──▶ next(new AppError(..., 400)) ──┐
      │                           └─ Valid   ──▶ req.body = sanitizedValue      │
      ▼                                                                         │
  taskController              ──▶ Extracts params/body, calls taskService       │
      │                           └─ Throws AppError if not found (404) ────────┤
      ▼                                                                         │
  taskService                 ──▶ Executes business logic                       │
      │                                                                         │
      ▼                                                                         │
  Response (200 / 201)                                                          │
                                                                                ▼
                                                                     globalErrorHandler
                                                             (Formats response for dev / prod)
```

---

## 📖 Interactive API Documentation (Swagger UI)

Interactive OpenAPI 3.0.0 documentation is built directly into the server.

### Accessing Swagger UI

Start the development server and open your browser:
```
http://localhost:3000/api-docs
```

### Features
- **Live Endpoint Testing**: Test valid and invalid payloads in real time without external tools.
- **Detailed Joi Constraints**: Visual representation of minimum length, maximum length, and required fields.
- **Response Envelopes**: Inspect standard success formats and error envelopes.

---

## 🔍 Joi Schema Validation Deep Dive

Writing manual `if/else` checks for every field in every route leads to brittle, repetitive code. **Joi** provides a declarative blueprint for incoming request data.

### 1. Defining Joi Schemas (`validations/task.validation.js`)

```javascript
import Joi from "joi";

// Schema for creating a new task
export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Title cannot be empty",
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 100 characters",
    "any.required": "Title is a required field",
  }),
  completed: Joi.boolean().optional(),
});

// Schema for updating an existing task (at least one field required)
export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional().messages({
    "string.empty": "Title cannot be empty",
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 100 characters",
  }),
  completed: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field ('title' or 'completed') must be provided for update",
  });
```

### 2. Generic Validation Middleware Factory (`middleware/validate.middleware.js`)

A single reusable factory function wraps *any* Joi schema into standard Express middleware:

```javascript
import { AppError } from "../utils/appError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    // abortEarly: false collects ALL validation errors before responding
    // stripUnknown: true removes any extra unvalidated fields (sanitization)
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      // Combine all Joi error messages into a single readable string
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(". ");
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    // Overwrite req.body with sanitized and type-cast data
    req.body = value;
    next();
  };
};
```

### 3. Applying Validation to Routes (`routes/task.routes.js`)

Inject the validation middleware directly in the route declaration before the controller:

```javascript
import express from "express";
import { createTask, updateTask } from "../controllers/task.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createTaskSchema, updateTaskSchema } from "../validations/task.validation.js";

const router = express.Router();

// The validation bouncer runs before the controller is ever reached
router.post("/", validate(createTaskSchema), createTask);
router.put("/:id", validate(updateTaskSchema), updateTask);

export default router;
```

---

## 🛡️ Centralized Error Handling Architecture

### 1. Custom `AppError` Class (`utils/appError.js`)

Native JavaScript `Error` objects lack HTTP context. `AppError` extends `Error` to attach HTTP status codes and operational flags:

```javascript
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    // 4xx errors are 'fail' (client faults), 5xx errors are 'error' (server faults)
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
```

- **`isOperational: true`** — Expected, handled errors (e.g. invalid input, resource not found). Safe to show to clients.
- **`isOperational: false / undefined`** — Unexpected programming bugs (e.g. `TypeError`, database outage). Internal details hidden in production.

---

### 2. Express 5 Native Async Error Handling

In **Express 5**, any error thrown inside an `async` controller or service is automatically caught and forwarded to the error pipeline:

```javascript
export const getTask = async (req, res) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) throw new AppError("Invalid Task ID. Must be a number.", 400);

  const task = await taskService.fetchTaskById(taskId);
  // Express 5 automatically catches this thrown AppError!
  if (!task) throw new AppError("Task not found", 404);

  res.status(200).json({ success: true, data: task });
};
```

> **No `try/catch` or `next(err)` boilerplate required inside controllers.**

---

### 3. Catching 404 Unhandled Routes

Mounted after all application routes to catch invalid endpoints:

```javascript
// Express 5 wildcard syntax to intercept all unmatched HTTP methods & paths
app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
```

---

### 4. Global Error Middleware (Dev vs. Prod)

The 4-parameter error handler sits at the absolute end of `server.js`:

```javascript
app.use(globalErrorHandler);
```

#### Development Response (`NODE_ENV=development`)
Includes the full error object and stack trace for debugging:

```json
{
  "status": "fail",
  "error": {
    "statusCode": 400,
    "status": "fail",
    "isOperational": true
  },
  "message": "Validation Error: Title must be at least 3 characters long",
  "stack": "AppError: Validation Error: Title must be at least 3 characters long\n    at validate..."
}
```

#### Production Response (`NODE_ENV=production`)
Hides sensitive stack traces and protects server internals:

```json
// Operational error (safe)
{
  "status": "fail",
  "message": "Validation Error: Title must be at least 3 characters long"
}

// Programming bug (hidden)
{
  "status": "error",
  "message": "Something went very wrong!"
}
```

---

## 📡 API Reference

**Base URL:** `http://localhost:3000/api/tasks`

### Endpoints

| Method | Endpoint | Description | Validation Schema |
|---|---|---|---|
| `GET` | `/api/tasks` | Get all tasks (optional `?completed=true/false`) | None |
| `GET` | `/api/tasks/:id` | Get task by numeric ID | ID parameter check |
| `POST` | `/api/tasks` | Create a new task | `createTaskSchema` |
| `PUT` | `/api/tasks/:id` | Update task title or status | `updateTaskSchema` |
| `DELETE` | `/api/tasks/:id` | Delete task by numeric ID | ID parameter check |

### Request & Response Examples

#### 1. Create Task (Valid)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Implement Joi validation schemas"}'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": 3,
    "title": "Implement Joi validation schemas",
    "completed": false
  }
}
```

#### 2. Create Task (Validation Error - Short Title)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "ab"}'
```

**Response (400 Bad Request):**
```json
{
  "status": "fail",
  "message": "Validation Error: Title must be at least 3 characters long"
}
```

#### 3. Update Task (Validation Error - Empty Object)
```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400 Bad Request):**
```json
{
  "status": "fail",
  "message": "Validation Error: At least one field ('title' or 'completed') must be provided for update"
}
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🏁 Getting Started

### 1. Navigate to Project Directory
```bash
cd validation-error-handling
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000` with Swagger docs at `http://localhost:3000/api-docs`.

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start server with Node.js (`node server.js`) |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Application mode (`development` or `production`) | `development` |
| `PORT` | HTTP server port | `3000` |

Loaded natively using Node.js `--env-file=.env` without external `dotenv` dependencies.

---

## 🔑 Key Concepts Summary

| Concept | Purpose |
|---|---|
| **Joi Schema** | Declarative blueprint enforcing data types, string constraints, and custom error messages |
| **`abortEarly: false`** | Instructs Joi to find and report all validation failures simultaneously |
| **`stripUnknown: true`** | Automatically strips unvalidated properties from the request body |
| **`AppError`** | Custom Error subclass with HTTP status codes and `isOperational: true` flag |
| **Operational Error** | Expected client errors (400 Bad Request, 404 Not Found) safe to show users |
| **Programming Error** | Unexpected bugs (500 Internal Server Error) sanitized in production |
| **`app.all("/*splat")`** | Catch-all wildcard middleware intercepting unhandled routes |
| **4-Param Middleware** | `(err, req, res, next)` function recognized by Express as the global error handler |
