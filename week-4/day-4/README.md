# Express.js Fundamentals & Web Server Setup

This repository introduces core web application development using the **Express.js** framework in Node.js. It covers setting up an Express server instance, handling basic HTTP methods (`GET` and `POST`), sending JSON responses, and configuring development auto-reloading using `nodemon`.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Express Application Setup](#1-express-application-setup)
  - [2. GET Route & Method-Chained JSON Responses](#2-get-route--method-chained-json-responses)
  - [3. POST Route Handling](#3-post-route-handling)
  - [4. Server Listener](#4-server-listener)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Installing Dependencies](#installing-dependencies)
  - [Running the Development Server](#running-the-development-server)
  - [API Endpoints Reference](#api-endpoints-reference)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for building web and mobile applications. This module demonstrates building an HTTP application using Express, defining routes, and handling request/response flows efficiently.

---

## 🎯 Topics Covered

- **Express Server Initialization**: Creating an Express application instance using `express()`.
- **HTTP Routing**: Defining route handlers for `GET` and `POST` requests (`app.get`, `app.post`).
- **Response Formatting**: Sending JSON payloads using `res.json()` and setting explicit HTTP status codes via `res.status()`.
- **Development Tooling**: Automatic server restart on code updates via `nodemon`.

---

## 📁 Project Structure

```text
.
├── app.js             # Main Express server and route handlers
├── package.json       # Project dependencies and script configuration
├── package-lock.json  # Dependency lockfile
└── README.md          # Project documentation
```

---

## 💻 Code Breakdown

### 1. Express Application Setup

Imports Express using ES Module syntax and creates the server application instance:

```javascript
import express from "express";
const app = express();
const PORT = 3000;
```

---

### 2. GET Route & Method-Chained JSON Responses

Defines a `GET` endpoint at `/hello` that returns a JSON object with a `200 OK` status code using method chaining:

```javascript
app.get("/hello", (req, res) => {
  res
    .status(200)
    .json({ message: "Hello from the server side!", app: "Node JS" });
});
```

---

### 3. POST Route Handling

Defines a `POST` endpoint at `/` that handles incoming data submissions:

```javascript
app.post("/", (req, res) => {
  res.send("We can post to this endpoint...");
});
```

---

### 4. Server Listener

Binds and listens for connections on port `3000`:

```javascript
app.listen(PORT, () => {
  console.log(` http://localhost:${PORT}`);
});
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Installing Dependencies

Navigate to the project directory and install the required dependencies (`express` and `nodemon`):

```bash
npm install
```

### Running the Development Server

Start the development server with `nodemon` for hot-reloading:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] starting `node app.js`
 http://localhost:3000
```

---

### API Endpoints Reference

| Method | Endpoint | Description | Response Type | Example Output / Status |
|---|---|---|---|---|
| `GET` | `/hello` | Fetches greeting message | JSON | `{ "message": "Hello from the server side!", "app": "Node JS" }` (Status `200`) |
| `POST` | `/` | Test post endpoint | Text | `We can post to this endpoint...` |

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| `express()` | Instantiates a new Express web application |
| `res.status(code)` | Sets the HTTP status code for the response |
| `res.json(payload)` | Sends a JSON response with proper `Content-Type: application/json` headers |
| `nodemon` | Utility that monitors for file changes and automatically restarts the node application |
