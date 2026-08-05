# Node.js HTTP Server Routing & API Endpoints

This repository demonstrates building a lightweight HTTP web server with custom request routing, static data loading, and JSON API endpoint responses using native Node.js modules.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. ES Module Directory Resolution (`__dirname`)](#1-es-module-directory-resolution-__dirname)
  - [2. Synchronous Top-Level Data Pre-loading](#2-synchronous-top-level-data-pre-loading)
  - [3. Request Routing & HTTP Headers](#3-request-routing--http-headers)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Installing Dependencies](#installing-dependencies)
  - [Running the Development Server](#running-the-development-server)
  - [Testing Routes & Endpoints](#testing-routes--endpoints)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

This application showcases how to construct a custom URL routing engine and JSON API service using Node.js's built-in `http`, `fs`, `url`, and `path` modules without relying on external web frameworks.

---

## 🎯 Topics Covered

- **HTTP Request Routing**: Parsing `req.url` to handle multiple endpoints (`/`, `/overview`, `/product`, `/api`).
- **HTTP Status Codes & Response Headers**: Returning appropriate status codes (`200 OK`, `404 Not Found`) and setting content types (`application/json`, `text/plain`).
- **Top-Level Synchronous Pre-loading**: Reading static JSON data once at startup to optimize request performance.
- **ES Modules File Path Resolution**: Recreating `__filename` and `__dirname` using `import.meta.url` and `fileURLToPath`.
- **Automatic Server Reloading**: Utilizing Node's native watch mode (`node --watch`).

---

## 📁 Project Structure

```text
.
├── index.js           # Primary HTTP server and routing logic
├── package.json       # Project configuration and dev watch script
├── README.md          # Documentation for HTTP server routing and API endpoints
└── dev-data/          # Development mock data
    └── data.json      # Mock JSON dataset for API endpoint
```

---

## 💻 Code Breakdown

### 1. ES Module Directory Resolution (`__dirname`)

In ES Modules (`"type": "module"`), `__dirname` and `__filename` are not available by default. They are derived using the `url` and `path` modules:

```javascript
import url, { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

### 2. Synchronous Top-Level Data Pre-loading

To avoid reading files on every client request, `readFileSync` reads and parses `data.json` once when the application boots:

```javascript
const data = readFileSync(`${__dirname}/dev-data/data.json`, "utf-8");
const dataObject = JSON.parse(data);
```

---

### 3. Request Routing & HTTP Headers

The `createServer` callback inspects `req.url` to conditionally return responses and HTTP header metadata:

```javascript
const server = createServer((req, res) => {
  const pathName = req.url;

  if (pathName === "/") {
    res.end("This is the HOME.");
  } else if (pathName === "/overview") {
    res.end("This is the OVERVIEW.");
  } else if (pathName === "/product") {
    res.end("This is the PRODUCT.");
  } else if (pathName === "/api") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(data);
  } else {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Page not found!");
  }
});
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Installing Dependencies

Navigate to the project directory in your terminal and install packages:

```bash
npm install
```

### Running the Development Server

Start the server using Node's built-in watch mode:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
Server listening at http://localhost:8000
```

### Testing Routes & Endpoints

| Method | Endpoint | Response | Status Code | Content-Type |
|---|---|---|---|---|
| `GET` | `/` | `This is the HOME.` | `200 OK` | `text/plain` |
| `GET` | `/overview` | `This is the OVERVIEW.` | `200 OK` | `text/plain` |
| `GET` | `/product` | `This is the PRODUCT.` | `200 OK` | `text/plain` |
| `GET` | `/api` | JSON Dataset (`data.json`) | `200 OK` | `application/json` |
| `GET` | `/invalid-path` | `Page not found!` | `404 Not Found` | `text/plain` |

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| `req.url` | Path portion of the requested URL used to determine routing |
| `res.writeHead(status, headers)` | Sets HTTP status code and headers before sending body content |
| `node --watch` | Native feature in Node.js to automatically restart application on file changes |
| Top-level `readFileSync` | Best practice for loading immutable configuration/mock data once at startup |
