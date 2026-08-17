# Native Node.js HTTP Server Architecture, Stream Body Parser & MVC Controllers

This repository demonstrates building a modular REST API using native **Node.js HTTP Server (`http.createServer`)** without third-party frameworks. It details stream-based request body parsing (`req` streams), controller separation, route matching, header inspection, and proper HTTP status code handling (`200`, `201`, `400`, `404`).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Stream Request Body Parser (`utils/bodyParser.js`)](#1-stream-request-body-parser-utilsbodyparserjs)
  - [2. Modern `async/await` Stream Parsing (`for await...of`)](#2-modern-asyncawait-stream-parsing-for-awaitof)
  - [3. Controller Layer (`controllers/userController.js`)](#3-controller-layer-controllersusercontrollerjs)
  - [4. Server Router & Entry Point (`app.js`)](#4-server-router--entry-point-appjs)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Running the Server](#running-the-server)
  - [API Endpoints & Example Requests](#api-endpoints--example-requests)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Higher-level frameworks like Express abstract away lower-level stream handling and middleware body parsing. This project breaks down how Node.js processes incoming HTTP request streams chunk-by-chunk, converts them into JSON payloads using Promises, and separates application logic into modular controllers.

---

## 🎯 Topics Covered

- **HTTP Request Stream Processing**: Listening to `req.on("data")`, `req.on("end")`, and `req.on("error")` stream events to assemble request body payloads.
- **Modern Async Iterables**: Iterating over request streams natively using `for await (const chunk of req)` with `async/await`.
- **Promise-Based Middleware Utility**: Wrapping asynchronous stream chunk collection in a reusable `Promise` (`getRequestBody`).
- **MVC Controller Architecture**: Separating routing logic (`app.js`) from domain business logic (`userController.js`).
- **HTTP Header Inspection & Response Standards**: Reading request headers (e.g., `user-agent`), setting `Content-Type: application/json`, and dispatching standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`).

---

## 📁 Project Structure

```text
.
├── app.js                      # Primary HTTP server, routing, and error handling
├── controllers/
│   └── userController.js      # Controller handling user retrieval and creation logic
├── utils/
│   └── bodyParser.js          # Stream-based JSON request body parser utility
├── package.json                # Project configuration and dev script
└── README.md                   # Project documentation
```

---

## 💻 Code Breakdown

### 1. Stream Request Body Parser (`utils/bodyParser.js`)

Converts the incoming Node.js readable request stream into a parsed JSON object using a `Promise` and EventEmitter listeners:

```javascript
export const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    // Assemble stream chunks as string data arrives
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // When the stream ends, parse JSON or resolve empty object
    req.on("end", () => {
      try {
        if (body === "") {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (error) {
        reject(new Error("Invalid JSON format"));
      }
    });

    // Handle stream connection errors
    req.on("error", (err) => {
      reject(err);
    });
  });
};
```

---

### 2. Modern `async/await` Stream Parsing (`for await...of`)

In modern Node.js, HTTP request streams (`req`) implement the **Async Iterable** interface. This enables iterating over incoming chunks directly using a `for await...of` loop with `async/await`, eliminating manual `new Promise` wrappers and event listeners:

```javascript
// Modern Alternative: Using async/await with for await...of loop
export const getRequestBodyAsync = async (req) => {
  let body = "";

  // Streams are async iterables in Node.js
  for await (const chunk of req) {
    body += chunk;
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error("Invalid JSON format");
  }
};
```

#### Comparison: EventEmitter vs. Async Iterable

| Approach | Mechanics | Advantages |
|---|---|---|
| **`req.on('data')`** | Explicit event handlers (`data`, `end`, `error`) wrapped in `new Promise` | Shows low-level Event Loop mechanics |
| **`for await (const chunk of req)`** | Native Async Iterable loop with standard `async/await` and `try/catch` | Concise, cleaner error handling, no manual promise creation |

---

### 3. Controller Layer (`controllers/userController.js`)

Manages in-memory user data, header logging, validation, and JSON responses:

```javascript
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

// GET /users Handler
export const getUsers = (req, res) => {
  const userAgent = req.headers["user-agent"];
  console.log(`Request made by: ${userAgent}`);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(users));
};

// POST /users Handler
export const createUser = (req, res, parsedBody) => {
  const { name } = parsedBody;

  if (!name) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Name is required" }));
  }

  const newUser = { id: users.length + 1, name };
  users.push(newUser);

  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({ message: "User created successfully", user: newUser }),
  );
};
```

---

### 4. Server Router & Entry Point (`app.js`)

Sets up the HTTP server, matches request methods and URLs, invokes the body parser, and routes requests to appropriate controllers:

```javascript
import http from "http";
import { getRequestBody } from "./utils/bodyParser.js";
import { getUsers, createUser } from "./controllers/userController.js";

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const url = req.url;

  // 1. Route: GET /users
  if (method === "GET" && url === "/users") {
    getUsers(req, res);
  }
  // 2. Route: POST /users
  else if (method === "POST" && url === "/users") {
    try {
      const parsedBody = await getRequestBody(req);
      createUser(req, res, parsedBody);
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON payload" }));
    }
  }
  // 3. Fallback: 404 Not Found
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Raw HTTP server running on http://localhost:${PORT}`);
});
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Running the Server

Start the server using Node:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
Raw HTTP server running on http://localhost:3000
```

---

### API Endpoints & Example Requests

| Method | Endpoint | Description | Expected Status | Payload / Output |
|---|---|---|---|---|
| `GET` | `/users` | Returns list of all users | `200 OK` | `[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]` |
| `POST` | `/users` | Creates a new user | `201 Created` | Request: `{"name":"Charlie"}`<br>Response: `{"message":"User created successfully","user":{"id":3,"name":"Charlie"}}` |
| `POST` | `/users` | Missing name validation | `400 Bad Request` | Request: `{}`<br>Response: `{"error":"Name is required"}` |
| `GET` | `/unknown` | Unhandled endpoint fallback | `404 Not Found` | `{"error":"Route not found"}` |

#### Testing `GET /users` via `curl`:
```bash
curl -X GET http://localhost:3000/users
```

#### Testing `POST /users` via `curl`:
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie"}'
```

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| Stream Chunks (`req.on('data')`) | Readable HTTP streams emit binary buffers in chunks as packets travel over the network |
| Stream Completion (`req.on('end')`) | Signals that all request data has been received and is ready for parsing |
| Async Iterables (`for await`) | Native JavaScript syntax allowing streams to be iterated directly with `async/await` |
| Controller Pattern | Keeps routing code concise by delegating request validation and data mutations to separate functions |
| HTTP Status `201` | Specific HTTP success code indicating a new resource was created successfully |
