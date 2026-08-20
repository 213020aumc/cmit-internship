# 3-Tier Backend Architecture (Controller-Service Pattern)

A comprehensive architectural guide to refactoring monolithic, single-file Express applications into a clean, modular **3-Tier (Router → Controller → Service → Model)** architecture with reusable business logic and decoupled layers.

---

## Table of Contents

- [Overview](#-overview)
- [Why Layered Architecture Matters](#-why-layered-architecture-matters)
- [The Restaurant Analogy (Roles & Responsibilities)](#-the-restaurant-analogy-roles--responsibilities)
- [The 3-Tier Architecture Flow](#-the-3-tier-architecture-flow)
- [Refactoring Walkthrough: Before vs. After](#-refactoring-walkthrough-before-vs-after)
  - [The "Before": Spaghetti Single File](#the-before-messy-single-file)
  - [The "After": Clean Separation of Concerns](#the-after-clean-separation-of-concerns)
- [Layer-by-Layer Implementation Deep Dive](#-layer-by-layer-implementation-deep-dive)
  - [1. Router Layer (`routes/`)](#1-router-layer-routes)
  - [2. Validation Middleware (`middleware/`)](#2-validation-middleware-middleware)
  - [3. Controller Layer (`controllers/`)](#3-controller-layer-controllers)
  - [4. Service Layer (`services/`)](#4-service-layer-services)
  - [5. Model Layer (`models/`)](#5-model-layer-models)
- [The Superpower of Reusable Services](#-the-superpower-of-reusable-services)
- [Architectural Decision Matrix (What Goes Where?)](#-architectural-decision-matrix-what-goes-where)
- [Error Handling Across Layers](#-error-handling-across-layers)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Key Architectural Takeaways](#-key-architectural-takeaways)

---

## 📖 Overview

When developers first learn Express.js, it is tempting to put routing, validation, business logic, and database queries all inside a single `server.js` file. While convenient for trivial demos, this "single-file" anti-pattern quickly degrades as the application grows:

- **Tight Coupling**: Database queries are trapped inside HTTP route handlers.
- **Zero Reusability**: Logic cannot be executed by CLI scripts, background queues, or cron jobs.
- **Untestable Code**: Testing business logic requires spinning up full HTTP servers and mocking network requests.
- **Maintenance Nightmare**: A small change in database logic risks breaking HTTP response formatting.

The **3-Tier / Controller-Service Pattern** eliminates these bottlenecks by organizing code into strictly separated, single-responsibility layers.

---

## 🎯 Why Layered Architecture Matters

| Metric | Single-File Spaghetti | 3-Tier Layered Architecture |
|---|---|---|
| **Separation of Concerns** | ❌ Everything mixed in route handlers | ✅ Each file has one single responsibility |
| **Reusability** | ❌ Trapped inside `(req, res)` | ✅ Services can be called from HTTP, CLI, Cron, or WebSockets |
| **Unit Testability** | ❌ Requires HTTP simulation / Supertest | ✅ Pure unit tests for services without HTTP overhead |
| **Team Scalability** | ❌ Multiple devs editing `server.js` (merge conflicts) | ✅ Modular files enable parallel feature development |
| **Maintainability** | ❌ High cognitive load | ✅ Predictable code navigation and structure |

---

## 🍽️ The Restaurant Analogy (Roles & Responsibilities)

Think of a backend application like a well-run restaurant. If one person tries to be the host, the waiter, the chef, and the stock manager all at once, the restaurant collapses during the first dinner rush.

```
       Customer
          │ (Request)
          ▼
   ┌───────────────┐
   │    Router     │  ─── The Host (Greets customer, directs to the right table)
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Controller   │  ─── The Waiter (Takes the order, validates input, brings food back)
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │    Service    │  ─── The Chef (Applies recipes, calculates totals, cooks the meal)
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │     Model     │  ─── The Pantry (Supplies raw ingredients / queries database)
   └───────────────┘
```

### Responsibility Breakdown

| Layer | Analogy | Core Responsibility | Strict Architectural Rules |
|---|---|---|---|
| **Router** | **The Host** | Directs traffic. Maps URLs and HTTP methods (`GET`, `POST`, etc.) to the matching Controller. | 🚫 **Absolutely NO business logic or response sending.** |
| **Controller** | **The Waiter** | Accepts the HTTP request (`req`), extracts parameters, calls the Service, and returns the HTTP response (`res`). | 🚫 **NEVER touches the database directly. Only handles HTTP protocol concerns.** |
| **Service** | **The Chef** | Executes business logic, calculations, payment processing, external API calls, and validation rules. | 🚫 **NEVER touches HTTP objects (`req` or `res`). Pure JavaScript inputs/outputs.** |
| **Model** | **The Pantry** | Defines the data schema and executes direct database queries (SQL, ORM, ODM, in-memory store). | 🚫 **Only knows about data formatting, schema validation, and persistence.** |

---

## 🔄 The 3-Tier Architecture Flow

![The 3-Tier Architecture Flow](./The%203-Tier%20Architecture%20Flow.png)

---

## 🔨 Refactoring Walkthrough: Before vs. After

### The "Before" (Messy Single File)

In this anti-pattern, the route handler violates the Single Responsibility Principle by doing validation, database queries, and response formatting all in one place:

```javascript
// server.js (ANTI-PATTERN: Do NOT do this!)
app.post('/api/users', async (req, res) => {
  // 1. Validation (Should be Middleware)
  if (!req.body.email || typeof req.body.email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  // 2. Business Logic & Direct DB Query (Should be Service + Model)
  const existingUser = await db.users.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({ error: "User already registered" });
  }

  const newUser = await db.users.insertOne({
    email: req.body.email,
    createdAt: new Date(),
  });

  // 3. Response Delivery (Should be Controller)
  res.status(201).json({
    success: true,
    data: newUser,
  });
});
```

---

### The "After" (Clean Separation of Concerns)

We break that single monolithic block into dedicated, testable modules:

```
src/
├── routes/
│   └── user.routes.js        # Maps HTTP POST / to validate & controller
├── middleware/
│   └── validate.js           # Guard: Validates email payload
├── controllers/
│   └── user.controller.js    # Protocol: Extracts req.body, sends res
├── services/
│   └── user.service.js       # Logic: Registration rules & orchestration
└── models/
    └── user.model.js         # Persistence: Database operations
```

---

## 📂 Layer-by-Layer Implementation Deep Dive

### 1. Router Layer (`routes/user.routes.js`)

The router only maps endpoints and injects middleware. It contains zero logic:

```javascript
import express from "express";
import { registerUser } from "../controllers/user.controller.js";
import { validateRegistrationPayload } from "../middleware/validate.middleware.js";

const router = express.Router();

// Host maps the URL to the Guard (Middleware) and Waiter (Controller)
router.post("/register", validateRegistrationPayload, registerUser);

export default router;
```

---

### 2. Validation Middleware (`middleware/validate.middleware.js`)

Catches malformed payloads at the front door before expensive business logic or database calls run:

```javascript
import { AppError } from "../utils/appError.js";

export const validateRegistrationPayload = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return next(new AppError("A valid email address is required.", 400));
  }

  next();
};
```

---

### 3. Controller Layer (`controllers/user.controller.js`)

The controller acts as a bridge between HTTP protocols and pure JavaScript services:

```javascript
import * as userService from "../services/user.service.js";

export const registerUser = async (req, res) => {
  const { email } = req.body;

  // Delegate work to the Chef (Service)
  const newUser = await userService.registerNewUser(email);

  // Return formatted HTTP response to customer
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: newUser,
  });
};
```

---

### 4. Service Layer (`services/user.service.js`)

The service contains pure business logic. Notice that **no `req` or `res` objects exist here**:

```javascript
import * as userModel from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

export const registerNewUser = async (email) => {
  // Business Rule 1: Check for existing account
  const existingUser = await userModel.findUserByEmail(email);
  if (existingUser) {
    throw new AppError("An account with this email already exists.", 400);
  }

  // Business Rule 2: Create user entity
  const newUser = await userModel.createUserRecord({
    email: email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
  });

  return newUser;
};
```

---

### 5. Model Layer (`models/user.model.js`)

Handles data storage and retrieval. Can be swapped from in-memory arrays to MongoDB/PostgreSQL without modifying any Controller or Service code:

```javascript
// Simulated database collection
const users = [];

export const findUserByEmail = async (email) => {
  return users.find((u) => u.email === email.toLowerCase()) || null;
};

export const createUserRecord = async (userData) => {
  const record = {
    id: users.length + 1,
    ...userData,
  };
  users.push(record);
  return record;
};
```

---

## ⚡ The Superpower of Reusable Services

Why are we so strict about keeping `req` and `res` out of the Service layer? **Universal Reusability.**

If your business logic requires `req` and `res`, it is permanently locked inside the web server. When your requirements evolve, you are forced to copy-paste or rewrite code.

By keeping services decoupled, the exact same `userService.registerNewUser` can be consumed across multiple application contexts:

```
                       ┌───────────────────────────────┐
                       │   userService.register(...)   │
                       └───────────────▲───────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│ HTTP Controller │           │   CLI Command   │           │ Cron / Worker   │
│ (Web Request)   │           │ (Terminal tool) │           │ (CSV Importer)  │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

### Example 1: Web Request (HTTP)
```javascript
// controllers/user.controller.js
import { registerNewUser } from "../services/user.service.js";

export const handleHttpRequest = async (req, res) => {
  const user = await registerNewUser(req.body.email);
  res.status(201).json(user);
};
```

### Example 2: CLI Import Script (Terminal)
```javascript
// scripts/cliRegister.js
import { registerNewUser } from "../services/user.service.js";

const emailInput = process.argv[2];
const user = await registerNewUser(emailInput);
console.log(`✅ Registered via CLI: ${user.email} (ID: ${user.id})`);
```

### Example 3: Nightly CSV Importer (Cron Job / Background Worker)
```javascript
// cron/nightlyUserSync.js
import { registerNewUser } from "../services/user.service.js";
import { readEmailsFromCsv } from "./csvParser.js";

const emails = await readEmailsFromCsv("./pending-users.csv");

for (const email of emails) {
  try {
    await registerNewUser(email);
    console.log(`Synced: ${email}`);
  } catch (err) {
    console.error(`Failed to sync ${email}: ${err.message}`);
  }
}
```

---

## 🧭 Architectural Decision Matrix (What Goes Where?)

| Code / Logic Type | Correct Layer | Why? |
|---|---|---|
| `req.params.id` / `req.query.page` | **Controller** | Belongs to HTTP protocol |
| `if (!email.includes('@'))` | **Middleware / Validator** | Guard input before entering pipeline |
| `res.status(200).json(...)` | **Controller** | Formats response envelope and HTTP status code |
| `calculateDiscount(cart, userTier)` | **Service** | Pure business calculation |
| `db.collection('users').find(...)` | **Model** | Direct persistence layer query |
| `bcrypt.hash(password, 12)` | **Service** | Business security rule |
| `sendWelcomeEmail(user.email)` | **Service / Event** | Side effect triggered by business workflow |
| `throw new AppError('Not found', 404)` | **Controller / Service** | Caught by centralized global error middleware |

---

## 🛡️ Error Handling Across Layers

In modern **Express 5**, error propagation is completely unified across the 3-tier stack:

1. **Service Throws**: `throw new AppError("User exists", 400)`
2. **Controller Propagates**: Native Express 5 `async` error handling catches the thrown error automatically.
3. **Global Error Middleware Handles**: The centralized 4-parameter `(err, req, res, next)` middleware catches the error and sends a standardized JSON envelope.

```
Service Layer (throw error)
     │
     ▼ (Express 5 auto-propagates)
Controller Layer
     │
     ▼
Global Error Handler ──▶ { status: "fail", message: "User exists" }
```

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- npm (Node Package Manager)

---

## 🏁 Getting Started

To explore this layered architecture in code:

1. Navigate to the project root:
   ```bash
   cd cmit-internship
   ```

2. Review the structured implementation:
   ```
   week-6/
   ├── day-1/task-api/           # Express 5 REST API basics & async routing
   ├── day-2/middleware-execution/# Middleware pipeline, validation & error handling
   └── day-3/                    # 3-Tier architecture principles & refactoring guide
   ```

---

## 🔑 Key Architectural Takeaways

1. **Host (Router)** maps paths; it never performs work.
2. **Waiter (Controller)** manages HTTP `req`/`res`; it never talks directly to databases.
3. **Chef (Service)** holds pure business logic; it never touches HTTP objects.
4. **Pantry (Model)** stores and fetches data; it only knows about schemas and queries.
5. **Decoupled services** enable seamless multi-channel execution (HTTP APIs, CLI tools, cron workers, and automated scripts).
