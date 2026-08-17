# Native HTTP Server Routing & Manual Promisification CLI

This repository demonstrates two key backend Node.js techniques:
1. Building a multi-route HTTP Web Server with native `node:http` using custom JSON helper dispatchers.
2. Manually **Promisifying** legacy callback-based functions (`node:fs`) using `new Promise((resolve, reject))` to build a task-logging CLI tool.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Native HTTP Server Routing (`server.js`)](#1-native-http-server-routing-serverjs)
  - [2. Manual Promisification & Task CLI (`task-cli.js`)](#2-manual-promisification--task-cli-task-clijs)
  - [3. Tasks Data Store (`tasks.json`)](#3-tasks-data-store-tasksjson)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Running the HTTP Server](#running-the-http-server)
  - [Testing HTTP Endpoints](#testing-http-endpoints)
  - [Using the Task CLI Tool](#using-the-task-cli-tool)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

This project highlights core Node.js architectural patterns without external frameworks:
- Handling HTTP requests, chunked `POST` data parsing, and returning formatted JSON API responses.
- Understanding how to wrap callback-based asynchronous Node.js utilities into Promise-returning functions manually, enabling clean `async/await` syntax.

---

## 🎯 Topics Covered

- **Native Route Dispatching**: Implementing route matching (`GET /`, `GET /about`, `GET /api/users`, `POST /api/users`, `404`) with `node:http`.
- **JSON Helper Abstraction**: Encapsulating `res.writeHead` and `res.end(JSON.stringify(...))` into a clean `sendJson(status, data)` helper.
- **Manual Promisification**: Converting callback signatures `(path, callback)` into Promises using `new Promise((resolve, reject) => ...)`.
- **`ENOENT` Error Fallback**: Handling missing file errors (`err.code === "ENOENT"`) by initializing default fallback data structures.
- **CLI Task Persistence**: Reading and persisting JSON task records dynamically via process arguments (`process.argv`).

---

## 📁 Project Structure

```text
.
├── server.js          # Native HTTP server with custom route handlers and JSON helper
├── task-cli.js        # CLI task manager demonstrating manual promisification
├── tasks.json         # JSON storage file for persisted tasks
├── package.json       # Dependencies and development script configuration
└── README.md          # Project documentation
```

---

## 💻 Code Breakdown

### 1. Native HTTP Server Routing (`server.js`)

Uses `node:http` and a custom response helper `sendJson` to manage multiple API endpoints:

```javascript
import http from "node:http";

const PORT = 3000;

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Response helper abstraction
  const sendJson = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (method === "GET" && url === "/") {
    sendJson(200, { message: "Welcome to the API Root" });
  } else if (method === "GET" && url === "/about") {
    sendJson(200, { message: "Native Node.js Server v1.0" });
  } else if (method === "GET" && url === "/api/users") {
    sendJson(200, {
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    });
  } else if (method === "POST" && url === "/api/users") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        sendJson(201, { message: "User created", data: parsed });
      } catch (err) {
        sendJson(400, { error: "Invalid JSON format" });
      }
    });
  } else {
    sendJson(404, { error: "Route not found" });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

### 2. Manual Promisification & Task CLI (`task-cli.js`)

Manually converts Node's `readFile` and `writeFile` into Promise-returning functions (`readFileAsync` and `writeFileAsync`):

```javascript
import { readFile, writeFile } from "node:fs";
import { join } from "node:path";
import { cwd, argv } from "node:process";

const filePath = join(cwd(), "tasks.json");

// 1. Manually Promisifying readFile
const readFileAsync = (path) => {
  return new Promise((resolve, reject) => {
    readFile(path, "utf8", (err, data) => {
      if (err) {
        if (err.code === "ENOENT") resolve("[]"); // Default fallback if file does not exist
        else reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// 2. Manually Promisifying writeFile
const writeFileAsync = (path, data) => {
  return new Promise((resolve, reject) => {
    writeFile(path, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 3. Executing logic with async/await
const addTask = async (taskName) => {
  try {
    const fileData = await readFileAsync(filePath);
    const tasks = JSON.parse(fileData);

    tasks.push({ id: Date.now(), name: taskName, completed: false });

    await writeFileAsync(filePath, JSON.stringify(tasks, null, 2));
    console.log(`✅ Added task: "${taskName}"`);
  } catch (error) {
    console.error("❌ Failed to update tasks:", error.message);
  }
};

const taskInput = argv[2];
if (taskInput) addTask(taskInput);
else console.log("Please provide a task name.");
```

---

### 3. Tasks Data Store (`tasks.json`)

Persisted task list updated by `task-cli.js`:

```json
[
  {
    "id": 1786974938950,
    "name": "Buy milk",
    "completed": false
  }
]
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Running the HTTP Server

Start the server using Node:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
Server running on port 3000
```

---

### Testing HTTP Endpoints

| Method | Endpoint | Response Output | Status Code |
|---|---|---|---|
| `GET` | `/` | `{"message":"Welcome to the API Root"}` | `200 OK` |
| `GET` | `/about` | `{"message":"Native Node.js Server v1.0"}` | `200 OK` |
| `GET` | `/api/users` | `{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}` | `200 OK` |
| `POST` | `/api/users` | `{"message":"User created","data":{ ... }}` | `201 Created` |
| `GET` | `/unknown` | `{"error":"Route not found"}` | `404 Not Found` |

#### Example `POST` Request via `curl`:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie", "role": "Developer"}'
```

---

### Using the Task CLI Tool

Add tasks via command line:

```bash
node task-cli.js "Buy groceries"
```

**Expected Terminal Output:**
```text
✅ Added task: "Buy groceries"
```

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| Manual Promisification | Wrapping a callback-based API inside `new Promise((resolve, reject) => ...)` to enable `async/await` |
| `ENOENT` Error | File system error code indicating "No such file or directory" |
| `sendJson()` Helper | Custom function consolidating HTTP header setting and JSON serialization |
| `argv[2]` | Accessing command-line positional arguments passed to the Node process |
