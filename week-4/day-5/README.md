# RESTful API Routing & Response Formatting with Express.js

This repository demonstrates constructing a RESTful API service using **Express.js**, implementing API versioning best practices, standard JSON response formatting (JSend specification), and static dataset serving.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Topics Covered](#topics-covered)
- [Project Structure](#project-structure)
- [Code Breakdown](#code-breakdown)
  - [1. Environment & Path Setup](#1-environment--path-setup)
  - [2. Versioned API Endpoint (`/api/v1/topics`)](#2-versioned-api-endpoint-apiv1topics)
  - [3. JSend Response Formatting](#3-jsend-response-formatting)
- [Prerequisites](#prerequisites)
- [Getting Started & Usage](#getting-started--usage)
  - [Installing Dependencies](#installing-dependencies)
  - [Running the Development Server](#running-the-development-server)
  - [API Endpoints Reference](#api-endpoints-reference)
- [Summary of Key Concepts](#summary-of-key-concepts)

---

## 🔍 Overview

When building production-ready APIs, structuring endpoints with clear versioning (`/v1/`) and consistent JSON response schemas is essential. This project demonstrates reading mock data at application startup and serving it through an Express REST API endpoint following industry conventions.

---

## 🎯 Topics Covered

- **RESTful API Versioning**: Prefixing endpoints with `/api/v1/` to support clean API evolution and backwards compatibility.
- **JSend Response Structure**: Formatting JSON API responses with `status` envelope flags (`success`, `fail`, `error`) and structured `data` objects.
- **ES Modules Path Resolution**: Resolving local JSON datasets using `fileURLToPath`, `dirname`, and `import.meta.url`.
- **Express Data Serving**: Serving parsed JSON data directly through `res.json()`.

---

## 📁 Project Structure

```text
.
├── app.js             # Express application & API endpoint handlers
├── package.json       # Dependencies and development scripts
├── package-lock.json  # Locked dependency tree
├── README.md          # Project documentation
└── dev-data/          # Mock data directory
    └── data.json      # JSON dataset for topics API
```

---

## 💻 Code Breakdown

### 1. Environment & Path Setup

Initializes Express and resolves the file path to read `dev-data/data.json` synchronously at application boot:

```javascript
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readFileSync } from "fs";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const topics = JSON.parse(readFileSync(`${__dirname}/dev-data/data.json`));
```

---

### 2. Versioned API Endpoint (`/api/v1/topics`)

Defines a versioned GET route that returns all topics:

```javascript
app.get("/api/v1/topics", (req, res) => {
  res.json({
    status: "success",
    data: { topics },
  });
});
```

---

### 3. JSend Response Formatting

The endpoint formats the output according to the JSend specification:

```json
{
  "status": "success",
  "data": {
    "topics": [ ... ]
  }
}
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🚀 Getting Started & Usage

### Installing Dependencies

Navigate to the project directory in your terminal and install project dependencies:

```bash
npm install
```

### Running the Development Server

Start the application with `nodemon` for auto-reloading during development:

```bash
npm run dev
```

**Expected Terminal Output:**
```text
[nodemon] starting `node app.js`
Server listening at http://127.0.0.1:3000
```

---

### API Endpoints Reference

| HTTP Method | Endpoint | Description | Response Status | Content-Type |
|---|---|---|---|---|
| `GET` | `/api/v1/topics` | Retrieves list of all available topics | `200 OK` | `application/json` |

---

## 💡 Summary of Key Concepts

| Concept | Description |
|---|---|
| API Versioning (`/v1/`) | Allows introducing breaking changes in future API versions (`/v2/`) without disrupting existing clients |
| JSend Specification | Standardized JSON payload structure providing predictable API response handling |
| Top-level Data Loading | Reading static resources during startup avoids costly I/O operations per incoming HTTP request |
