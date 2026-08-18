# Express 5 REST API: Async Error Handling, Routing & Parameter Patterns

A production-grade RESTful API built with **Express 5** demonstrating native asynchronous error propagation, Express Router modularity, CRUD operations, standardized response envelopes, and key parameter design concepts (**Path vs. Query Parameters** and **Rest vs. Spread Operators**).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Express 5 Async Error Handling (`server.js`)](#1-express-5-async-error-handling-serverjs)
  - [2. Router & CRUD Endpoints (`routes/taskRoutes.js`)](#2-router--crud-endpoints-routestaskroutesjs)
  - [3. Standardized Response Envelope](#3-standardized-response-envelope)
- [Key Architectural Concepts](#key-architectural-concepts)
  - [Path Parameters vs. Query Parameters](#path-parameters-vs-query-parameters)
  - [Rest vs. Spread Operators](#rest-vs-spread-operators)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Installing Dependencies](#installing-dependencies)
  - [Running the Server](#running-the-server)
  - [API Endpoints Reference](#api-endpoints-reference)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Express 5 introduces native support for rejected Promises and thrown errors inside `async` route handlers. Unlike earlier versions that required wrapping asynchronous handlers in `try/catch` or helper middleware, Express 5 automatically catches thrown errors and forwards them directly to the 4-argument global error middleware `(err, req, res, next)`.

---

## 🎯 Topics Covered

- **Express 5 Native Async Error Handling**: Throwing errors directly inside `async` route handlers without server crashes or manual `next(err)` calls.
- **Modular Express Router**: Organizing API endpoints using `express.Router()`.
- **Path vs. Query Parameters**: Identifying single resources via Path Params (`:id`) versus filtering collections via Query Params (`?completed=true`).
- **Rest & Spread Operators**: Immutably updating data payloads using Object Spread syntax (`...`).
- **Uniform API Envelope**: Standardizing JSON response structures across all endpoints.

---

## 📁 Project Structure

```text
.
├── task-api/
│   ├── server.js               # Express 5 server initialization and global error middleware
│   ├── routes/
│   │   └── taskRoutes.js       # Task CRUD route handlers & query filtering logic
│   ├── package.json            # Project configuration and dev dependencies
│   └── package-lock.json       # Dependency lockfile
├── Path vs Query Parameters.png # Concept diagram: Path vs Query Parameters
├── Rest vs Spread.png           # Concept diagram: Rest vs Spread Operators
└── README.md                   # Comprehensive project documentation
```

---

## 💻 Code Breakdown

### 1. Express 5 Async Error Handling (`server.js`)

In Express 5, throwing an error inside any `async` handler routes directly to the 4-parameter error middleware:

```javascript
import express from "express";
import taskRoutes from "./routes/taskRoutes.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/tasks", taskRoutes);

// Global 404 Catch-All Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null,
  });
});

// Express 5 Global Error Handler (4 parameters)
app.use((err, req, res, next) => {
  console.error("🔥 Error caught by Express 5:", err.message);

  res.status(400).json({
    success: false,
    message: err.message || "An unexpected error occurred",
    data: null,
  });
});

app.listen(PORT, () => {
  console.log(`Express 5 Server is running on http://localhost:${PORT}`);
});
```

---

### 2. Router & CRUD Endpoints (`routes/taskRoutes.js`)

Demonstrates GET (with filtering), GET by ID (with error throwing), POST, PUT, and DELETE operations:

```javascript
import express from "express";
const router = express.Router();

// READ ALL with Query Parameter Filtering
router.get("/", async (req, res) => {
  await simulateDbCall();
  const { completed } = req.query;
  let result = tasks;

  if (completed !== undefined) {
    const isCompleted = completed === "true";
    result = tasks.filter((task) => task.completed === isCompleted);
  }

  sendResponse(res, 200, result, "Tasks retrieved successfully");
});

// READ ONE with Path Parameter & Native Throw
router.get("/:id", async (req, res) => {
  await simulateDbCall();
  const taskId = Number(req.params.id);

  if (isNaN(taskId)) {
    // Native throw caught automatically by Express 5 error middleware
    throw new Error("Invalid Task ID. It must be a number.");
  }

  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return sendResponse(res, 404, null, `Task with ID ${taskId} not found`);
  }

  sendResponse(res, 200, task, "Task found");
});
```

---

### 3. Standardized Response Envelope

Every endpoint responds using a uniform payload schema:

```javascript
const sendResponse = (res, status, data, message = "") => {
  res.status(status).json({
    success: status >= 200 && status < 300,
    message,
    data,
  });
};
```

**Example Successful Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Task found",
  "data": {
    "id": 1,
    "title": "Learn Express 5",
    "completed": false
  }
}
```

---

## 🔑 Key Architectural Concepts

### Path Parameters vs. Query Parameters

![Path vs Query Parameters](./Path%20vs%20Query%20Parameters.png)

| Feature | Path Parameters (`req.params`) | Query Parameters (`req.query`) |
|---|---|---|
| **Syntax** | `/api/tasks/:id` | `/api/tasks?completed=true` |
| **Purpose** | Uniquely identify a specific resource | Filter, sort, paginate, or search a resource collection |
| **Example** | `GET /api/tasks/2` | `GET /api/tasks?completed=false` |
| **Required?** | Mandatory for matching the route pattern | Optional key-value pairs |

---

### Rest vs. Spread Operators

![Rest vs Spread](./Rest%20vs%20Spread.png)

| Operator | Context | Usage Description |
|---|---|---|
| **Spread (`...`)** | Unpacking elements | Expands iterable elements or object properties into new structures (e.g., `{ ...task, title }`) |
| **Rest (`...`)** | Packing elements | Gathers remaining elements into an array or object in function arguments or destructuring |

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Installing Dependencies

Navigate to the `task-api` directory and install project dependencies:

```bash
cd task-api
npm install
```

### Running the Server

Start the development server with `nodemon`:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
Express 5 Server is running on http://localhost:3000
```

---

### API Endpoints Reference

| Method | Endpoint | Query / Body | Description | Expected Status |
|---|---|---|---|---|
| `GET` | `/api/tasks` | `?completed=true` | Gets all tasks (optionally filtered by completion) | `200 OK` |
| `GET` | `/api/tasks/:id` | None | Gets task by numeric ID | `200 OK` / `404 Not Found` |
| `GET` | `/api/tasks/abc` | None | Triggers invalid ID error (native throw) | `400 Bad Request` |
| `POST` | `/api/tasks` | `{"title": "New Task"}` | Creates a new task | `201 Created` |
| `PUT` | `/api/tasks/:id` | `{"completed": true}` | Updates existing task fields | `200 OK` / `404 Not Found` |
| `DELETE` | `/api/tasks/:id` | None | Deletes task by ID | `200 OK` / `404 Not Found` |

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| Express 5 Async Error Handling | Native handling of rejected Promises inside async route handlers without `try/catch` wrappers |
| `(err, req, res, next)` | Express global error handling signature requiring exactly four arguments |
| Path Parameters | Named segments in route URLs used to locate specific resources |
| Query Parameters | Key-value pairs appended after `?` in URLs used for collection operations |
