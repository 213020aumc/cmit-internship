# Express 5 Complete In-Memory CRUD API

A production-structured Express 5 REST API combining every backend fundamental from the past week into a single, cohesive project — **Joi validation**, **custom middleware**, **3-tier layered architecture** (Routes → Controllers → Services), **centralized error handling**, and a complete **Postman test matrix** covering all success and failure scenarios.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Request & Error Flow](#request--error-flow)
  - [3-Tier Architecture Breakdown](#3-tier-architecture-breakdown)
- [Joi Schema Validation](#-joi-schema-validation)
  - [1. Defining Schemas](#1-defining-schemas-validationstaskvalidationjs)
  - [2. Generic Validation Middleware Factory](#2-generic-validation-middleware-factory-middlewarevalidatemiddlewarejs)
  - [3. Applying Validation to Routes](#3-applying-validation-to-routes-routestaskroutesjs)
- [Centralized Error Handling](#-centralized-error-handling)
  - [1. Custom AppError Class](#1-custom-apperror-class-utilsapperrorjs)
  - [2. Express 5 Native Async Error Propagation](#2-express-5-native-async-error-propagation)
  - [3. Wildcard 404 Route Interceptor](#3-wildcard-404-route-interceptor)
  - [4. Global Error Handler](#4-global-error-handler)
- [API Reference](#-api-reference)
- [Postman Test Matrix](#-postman-test-matrix)
  - [Success Cases](#-success-cases)
  - [Failure Cases](#-failure-cases)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Complete CRUD Operations** — Create, Read (all + by ID), Update, and Delete tasks with a fully functional in-memory data store
- **Joi Schema Validation** — Declarative request body validation with `abortEarly: false` to surface all errors at once
- **Generic Validation Factory** — A single `validate(schema)` middleware function that works with any Joi schema
- **Custom `AppError` Class** — Extends native `Error` with HTTP status codes, `fail`/`error` classification, and `isOperational` flag
- **Express 5 Native Async Errors** — Thrown errors in `async` handlers automatically propagate to the error handler without `try/catch`
- **Wildcard 404 Interceptor** — Catches all unmatched routes and HTTP methods using Express 5 regex syntax
- **3-Tier Layered Architecture** — Clean separation of Routes → Controllers → Services for scalable, testable code
- **Simulated Async Service Layer** — 50ms artificial delay mimics real database I/O for realistic async behavior

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime (v24+ recommended) |
| **Express 5** (`^5.2.1`) | Web framework with native async error propagation |
| **Joi** (`^18.2.5`) | Schema description and data validation library |
| **ES Modules** | Native `"type": "module"` (`import`/`export`) |
| **Nodemon** | Hot-reloading development server |

---

## 🏗 Architecture

### Directory Structure

```
day-5/
├── server.js                         # App entry — mounts JSON parser, routes, 404 handler & error middleware
├── package.json                      # Dependencies & scripts
│
├── validations/
│   └── task.validation.js            # Joi schemas (createTaskSchema, updateTaskSchema)
│
├── middleware/
│   └── validate.middleware.js        # Generic validate(schema) factory middleware
│
├── routes/
│   └── task.routes.js                # Route definitions with validation guards
│
├── controllers/
│   └── task.controller.js            # Request handling, ID parsing & response envelopes
│
├── services/
│   └── task.service.js               # Business logic & in-memory data store (simulated async)
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
  taskRoutes                  ──▶ Matches requested endpoint
      │
      ▼
  validate(schema)            ──▶ Validates req.body against Joi schema
      │                           ├─ Invalid ──▶ next(new AppError(..., 400)) ──┐
      │                           └─ Valid   ──▶ req.body = sanitizedValue      │
      ▼                                                                         │
  taskController              ──▶ Parses ID, calls taskService                 │
      │                           └─ Throws AppError if not found (404) ────────┤
      ▼                                                                         │
  taskService                 ──▶ Executes business logic (in-memory store)    │
      │                                                                         │
      ▼                                                                         │
  Response (200 / 201)                                                          │
                                                                                ▼
                                                                     Global Error Handler
                                                            (statusCode, success: false, message)
```

### 3-Tier Architecture Breakdown

| Layer | File | Responsibility |
|---|---|---|
| **Router** | `routes/task.routes.js` | Declares HTTP verb + path, wires validation and controller |
| **Controller** | `controllers/task.controller.js` | Extracts `req.params`/`req.body`, calls service, formats JSON response |
| **Service** | `services/task.service.js` | Pure business logic — no knowledge of HTTP, `req`, or `res` |
| **Utility** | `utils/appError.js` | Shared error infrastructure used across all layers |

> **Why 3 tiers?** The controller never touches data storage. The service never touches HTTP. This means the same service can be consumed by HTTP routes, CLI tools, background cron jobs, or WebSocket handlers without modification.

---

## 🔍 Joi Schema Validation

### 1. Defining Schemas (`validations/task.validation.js`)

```javascript
import Joi from "joi";

// POST /api/tasks — title is required, completed is optional
export const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  completed: Joi.boolean().optional(),
});

// PUT /api/tasks/:id — at least one field must be provided
export const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  completed: Joi.boolean().optional(),
}).min(1);
```

| Rule | Effect |
|---|---|
| `.min(3).max(100)` | Enforces title between 3–100 characters |
| `.required()` | Field must be present in the request body |
| `.optional()` | Field can be omitted |
| `.min(1)` on the object | At least one field (`title` or `completed`) must be sent for updates |

---

### 2. Generic Validation Middleware Factory (`middleware/validate.middleware.js`)

```javascript
import { AppError } from "../utils/appError.js";

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(". ");
    return next(new AppError(`Validation failed: ${errorMessage}`, 400));
  }
  req.body = value;
  next();
};
```

| Option | Purpose |
|---|---|
| `abortEarly: false` | Collects **all** validation errors before responding (doesn't stop at the first one) |
| `req.body = value` | Overwrites the original body with Joi's cleaned/cast output |

---

### 3. Applying Validation to Routes (`routes/task.routes.js`)

```javascript
import express from "express";
import * as controller from "../controllers/task.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createTaskSchema, updateTaskSchema } from "../validations/task.validation.js";

const router = express.Router();

router.get("/", controller.getTasks);
router.get("/:id", controller.getTask);
router.post("/", validate(createTaskSchema), controller.createTask);     // ← Joi guard
router.put("/:id", validate(updateTaskSchema), controller.updateTask);   // ← Joi guard
router.delete("/:id", controller.deleteTask);

export default router;
```

> The `validate(schema)` middleware intercepts the request **before** the controller is ever invoked. If validation fails, the controller never runs.

---

## 🛡️ Centralized Error Handling

### 1. Custom `AppError` Class (`utils/appError.js`)

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

| Property | Value | Meaning |
|---|---|---|
| `statusCode` | `400`, `404`, `500` | HTTP status code attached to the error |
| `status` | `"fail"` or `"error"` | `"fail"` for 4xx client errors, `"error"` for 5xx server errors |
| `isOperational` | `true` | Marks the error as expected/handled (safe to expose the message to clients) |

---

### 2. Express 5 Native Async Error Propagation

In Express 5, throwing inside an `async` handler automatically forwards the error to the error middleware — **no `try/catch` or `next(err)` wrappers needed**:

```javascript
export const getTask = async (req, res) => {
  const task = await taskService.fetchById(parseId(req.params.id));
  if (!task) throw new AppError("Task not found", 404);  // ← Express 5 catches this!
  res.status(200).json({ success: true, data: task });
};
```

---

### 3. Wildcard 404 Route Interceptor

Mounted **after** all application routes in `server.js` to catch any unmatched endpoint:

```javascript
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl}`, 404));
});
```

This catches **all** HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, etc.) on **any** path that hasn't been handled by a prior route.

---

### 4. Global Error Handler

The 4-parameter error middleware is the last middleware in the stack:

```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    status: err.status || "error",
    message: err.message || "Internal Server Error",
  });
});
```

**Example Error Response:**

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed: \"title\" is required"
}
```

---

## 📡 API Reference

**Base URL:** `http://localhost:3000/api/tasks`

### Endpoints

| Method | Endpoint | Description | Validation |
|---|---|---|---|
| `GET` | `/api/tasks` | Retrieve all tasks | None |
| `GET` | `/api/tasks/:id` | Retrieve a single task by numeric ID | ID format check |
| `POST` | `/api/tasks` | Create a new task | `createTaskSchema` |
| `PUT` | `/api/tasks/:id` | Update an existing task | `updateTaskSchema` |
| `DELETE` | `/api/tasks/:id` | Delete a task by numeric ID | ID format check |

### Request & Response Examples

#### Create Task (Valid)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Express 5"}'
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1724587200000,
    "title": "Learn Express 5",
    "completed": false
  }
}
```

#### Get All Tasks

```bash
curl http://localhost:3000/api/tasks
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "Learn Express", "completed": false }
  ]
}
```

#### Update Task

```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Learn Express",
    "completed": true
  }
}
```

#### Delete Task

```bash
curl -X DELETE http://localhost:3000/api/tasks/1
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## 🧪 Postman Test Matrix

### ✅ Success Cases

| # | Method | Endpoint | Body / Params | Expected Status | Expected Response |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/tasks` | — | `200 OK` | `{ success: true, data: [...] }` |
| 2 | `GET` | `/api/tasks/1` | — | `200 OK` | `{ success: true, data: { id: 1, ... } }` |
| 3 | `POST` | `/api/tasks` | `{ "title": "New Task" }` | `201 Created` | `{ success: true, data: { id: ..., title: "New Task", completed: false } }` |
| 4 | `POST` | `/api/tasks` | `{ "title": "Task", "completed": true }` | `201 Created` | `{ success: true, data: { ..., completed: true } }` |
| 5 | `PUT` | `/api/tasks/1` | `{ "title": "Updated Title" }` | `200 OK` | `{ success: true, data: { ..., title: "Updated Title" } }` |
| 6 | `PUT` | `/api/tasks/1` | `{ "completed": true }` | `200 OK` | `{ success: true, data: { ..., completed: true } }` |
| 7 | `PUT` | `/api/tasks/1` | `{ "title": "New", "completed": true }` | `200 OK` | Both fields updated |
| 8 | `DELETE` | `/api/tasks/1` | — | `200 OK` | `{ success: true, message: "Task deleted successfully" }` |

### ❌ Failure Cases

| # | Method | Endpoint | Body / Params | Expected Status | Expected Error Message |
|---|---|---|---|---|---|
| 1 | `POST` | `/api/tasks` | `{}` (empty body) | `400` | `Validation failed: "title" is required` |
| 2 | `POST` | `/api/tasks` | `{ "title": "ab" }` (too short) | `400` | `Validation failed: "title" length must be at least 3 characters long` |
| 3 | `POST` | `/api/tasks` | `{ "title": "a"×101 }` (too long) | `400` | `Validation failed: "title" length must be less than or equal to 100 characters long` |
| 4 | `POST` | `/api/tasks` | `{ "title": 123 }` (wrong type) | `400` | `Validation failed: "title" must be a string` |
| 5 | `PUT` | `/api/tasks/1` | `{}` (empty body) | `400` | `Validation failed: "value" must have at least 1 key` |
| 6 | `PUT` | `/api/tasks/1` | `{ "title": "ab" }` (too short) | `400` | `Validation failed: "title" length must be at least 3 characters long` |
| 7 | `GET` | `/api/tasks/abc` | Non-numeric ID | `400` | `Invalid ID format. Must be a number.` |
| 8 | `GET` | `/api/tasks/999` | Non-existent ID | `404` | `Task not found` |
| 9 | `PUT` | `/api/tasks/999` | `{ "title": "Test" }` | `404` | `Task not found` |
| 10 | `DELETE` | `/api/tasks/999` | Non-existent ID | `404` | `Task not found` |
| 11 | `GET` | `/api/unknown` | Undefined route | `404` | `Cannot find GET /api/unknown` |
| 12 | `PATCH` | `/api/tasks` | Unsupported HTTP method | `404` | `Cannot find PATCH /api/tasks` |

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🏁 Getting Started

### 1. Navigate to Project Directory

```bash
cd day-5
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### 4. Test the API

Use **Postman**, **Thunder Client**, or `curl` to test the endpoints against the [Postman Test Matrix](#-postman-test-matrix) above.

---

## 📋 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start server with Node.js (`node server.js`) |
| `npm run dev` | Start development server with hot-reload (`nodemon server.js`) |

---

## 🔑 Key Concepts Summary

| Concept | Purpose |
|---|---|
| **In-Memory CRUD** | Full Create, Read, Update, Delete lifecycle using a JavaScript array as the data store |
| **Joi Schema** | Declarative validation blueprint enforcing data types, string length constraints, and required fields |
| **`abortEarly: false`** | Instructs Joi to collect and report all validation failures simultaneously |
| **`validate(schema)`** | Generic middleware factory — pass any Joi schema to get a reusable Express middleware |
| **`AppError`** | Custom Error subclass with HTTP `statusCode`, `status` (`"fail"`/`"error"`), and `isOperational` flag |
| **3-Tier Architecture** | Routes → Controllers → Services separation for clean, testable, reusable code |
| **Express 5 Async Errors** | Thrown errors in `async` handlers auto-forward to error middleware without `try/catch` |
| **Wildcard 404** | `app.all(/(.*)/)` catches all unmatched routes across every HTTP method |
| **4-Param Middleware** | `(err, req, res, next)` function recognized by Express as the global error handler |
| **Simulated Async** | 50ms `setTimeout` delay in the service layer mimics real database I/O latency |
