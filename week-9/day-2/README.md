# Advanced API Querying — Safe Filtering, Text Search & Field Selection

Building on Day 1's security hardening, Day 2 evolves the `getPaginatedCourses` service into a new **`getAdvancedCourses`** service that introduces three critical upgrades: an **allowlist-based safe filtering** approach (replacing the blacklist pattern), **regex text search** (`?search=node`), and **field selection / projection** (`?fields=title,price`). The `server.js` middleware pipeline is also cleaned up by removing the commented-out inline rate limiter code, producing a streamlined production-ready entrypoint.

---

## Table of Contents

- [What Changed from Day 1](#-what-changed-from-day-1)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Middleware Pipeline (Unchanged)](#middleware-pipeline-unchanged)
- [The Filtering Security Problem](#-the-filtering-security-problem)
  - [Day 1: Blacklist (Exclusion-Based)](#day-1-blacklist-exclusion-based)
  - [Day 2: Allowlist (Inclusion-Based)](#day-2-allowlist-inclusion-based)
  - [Why Allowlist Wins](#why-allowlist-wins)
- [getAdvancedCourses — The 7-Step Pipeline](#-getadvancedcourses--the-7-step-pipeline)
  - [Step 1: Initialize Empty Filter](#step-1-initialize-empty-filter)
  - [Step 2: Safe Filtering (Allowlist)](#step-2-safe-filtering-allowlist)
  - [Step 3: Text Search (Regex)](#step-3-text-search-regex)
  - [Step 4: Sorting](#step-4-sorting)
  - [Step 5: Field Selection (Projection)](#step-5-field-selection-projection)
  - [Step 6: Pagination](#step-6-pagination)
  - [Step 7: Execution](#step-7-execution)
- [Controller & Route Updates](#-controller--route-updates)
- [server.js Cleanup](#-serverjs-cleanup)
- [API Reference](#-api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Course Endpoints — CRUD](#course-endpoints--crud)
  - [Course Endpoints — Advanced Query Examples](#course-endpoints--advanced-query-examples)
  - [Course Endpoints — Aggregation Analytics](#course-endpoints--aggregation-analytics)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🔄 What Changed from Day 1

| Area                | Day 1                                                 | Day 2                                                     |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| **Service**         | `getPaginatedCourses` — blacklist filtering           | `getAdvancedCourses` — allowlist filtering                |
| **Filtering**       | Exclude `["page","sort","limit","fields"]`, pass rest | Only allow `["category","price","rating","instructorId"]` |
| **Text Search**     | ❌ Not available                                      | ✅ `?search=node` → regex on `title` field                |
| **Field Selection** | ❌ Not available                                      | ✅ `?fields=title,price` → `.select("title price")`       |
| **Controller**      | `getCourses` → `getPaginatedCourses`                  | `getAllCourses` → `getAdvancedCourses`                    |
| **Route**           | `router.get("/", controller.getCourses)`              | `router.get("/", controller.getAllCourses)`               |
| **server.js**       | Contains commented-out inline rate limiter code       | Cleaned up — no inline comments, streamlined imports      |
| **Response order**  | `{ courses, meta }` (data first)                      | `{ meta, courses }` (metadata first)                      |

### Files Modified

| File                               | Change                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `services/course.service.js`       | Old `getPaginatedCourses` commented out, new `getAdvancedCourses` added          |
| `controllers/course.controller.js` | `getCourses` → `getAllCourses`, calls `getAdvancedCourses`                       |
| `routes/course.routes.js`          | Route handler changed from `controller.getCourses` to `controller.getAllCourses` |
| `server.js`                        | Removed commented-out inline rate limiter code                                   |

---

## 🚀 Key Features

- **Allowlist-based safe filtering** — Only explicitly declared fields (`category`, `price`, `rating`, `instructorId`) are processed; all others are silently ignored
- **Text search** — `?search=node` performs case-insensitive regex matching on the `title` field
- **Field selection (Projection)** — `?fields=title,price` returns only specified fields, reducing payload size
- **Operator translation** — `?price[lte]=100` safely translates to `{ $lte: 100 }` per-field (not globally)
- **All Day 1 security** — helmet, CORS, dual rate limiting, mongoSanitize, xssClean, payload size limiting (all unchanged)

---

## 🧰 Tech Stack

| Technology                            | Purpose                                                  |
| ------------------------------------- | -------------------------------------------------------- |
| **Node.js**                           | JavaScript runtime (v24+ recommended)                    |
| **Express 5** (`^5.2.1`)              | Web framework with native async error propagation        |
| **Mongoose 9** (`^9.9.4`)             | MongoDB ODM — schemas, TTL indexes, references           |
| **helmet** (`^8.3.0`)                 | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| **cors** (`^2.8.6`)                   | Cross-Origin Resource Sharing middleware                 |
| **express-rate-limit** (`^8.7.0`)     | IP-based request throttling with sliding window          |
| **express-mongo-sanitize** (`^2.2.0`) | NoSQL injection defense (strips `$` and `.` operators)   |
| **sanitize-html** (`^2.17.7`)         | HTML/JS tag stripping for XSS defense                    |
| **bcryptjs** (`^3.0.3`)               | Password hashing and verification                        |
| **jsonwebtoken** (`^9.0.3`)           | Access + Refresh token signing and verification          |
| **cookie-parser** (`^1.4.7`)          | Parse `Cookie` header → `req.cookies`                    |
| **nodemailer** (`^9.1.1`)             | SMTP email transport for password reset emails           |
| **Joi** (`^18.2.5`)                   | Declarative request body validation                      |
| **ES Modules**                        | Native `"type": "module"` (`import`/`export`)            |
| **Nodemon**                           | Hot-reloading development server with `--env-file`       |

---

## 🏗 Architecture

### Directory Structure

```
authentication/
├── server.js                          # ★ Cleaned up — no more inline rate limiter comments
├── .env                               # Access/Refresh secrets + email config
├── package.json                       # Same dependencies as Day 1
│
├── models/
│   ├── user.model.js                  # role: user | instructor | admin
│   ├── token.model.js                 # Refresh + reset_password tokens with TTL
│   ├── course.model.js                # Course schema with instructorId ref
│   └── instructor.model.js            # Instructor schema
│
├── validations/
│   ├── auth.validation.js             # register, login, forgotPassword, resetPassword schemas
│   └── course.validation.js           # createCourse + updateCourse schemas
│
├── middleware/
│   ├── auth.middleware.js             # protect + restrictTo()
│   ├── rateLimiter.middleware.js       # globalLimiter + authLimiter
│   ├── xss.middleware.js              # Recursive HTML/JS tag stripping
│   ├── validate.middleware.js         # Reusable Joi factory
│   ├── logger.middleware.js           # ISO timestamp request logger
│   └── globalErrorHandler.js          # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                 # authLimiter on POST /login
│   ├── user.routes.js                 # Blanket protect + admin restrictTo
│   └── course.routes.js               # ★ Route now uses controller.getAllCourses
│
├── controllers/
│   ├── auth.controller.js             # register, login, refresh, logout, forgotPassword, resetPassword
│   ├── user.controller.js             # getProfile, updatePassword, deleteAccount, getAllUsers
│   └── course.controller.js           # ★ getAllCourses (replaces getCourses)
│
├── services/
│   ├── auth.service.js                # registerUser, loginUser, refreshAccess, logoutUser, etc.
│   ├── user.service.js                # changePassword, deactivateUser, fetchAllUsers
│   └── course.service.js              # ★ getAdvancedCourses (replaces getPaginatedCourses)
│
└── utils/
    ├── appError.js                    # Custom AppError class
    ├── token.js                       # signAccessToken, signRefreshToken, createAuthSession, hashToken
    ├── cookie.js                      # setRefreshTokenCookie, clearRefreshTokenCookie
    ├── password.js                    # hashPassword, comparePassword
    ├── email.js                       # sendEmail (Nodemailer transport)
    └── responseHandler.js             # sendResponse (standardized JSON with extra spread)
```

### Middleware Pipeline (Unchanged)

The 5-layer security pipeline from Day 1 is unchanged:

```
Request → helmet → cors → rateLimiter → express.json → cookieParser → mongoSanitize → xssClean → Routes
```

---

## 🔐 The Filtering Security Problem

### Day 1: Blacklist (Exclusion-Based)

```javascript
// Day 1 — getPaginatedCourses
const filterObj = { ...queryObj };

// Remove known formatting fields
const excludedFields = ["page", "sort", "limit", "fields"];
excludedFields.forEach((el) => delete filterObj[el]);

// PROBLEM: Everything NOT in the excluded list passes through to MongoDB
// If someone sends ?isActive=true or ?password[$regex]=a, it goes straight to .find()
let queryStr = JSON.stringify(filterObj);
queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
const finalFilter = JSON.parse(queryStr);

Course.find(finalFilter); // ← Uncontrolled filter object
```

**The vulnerability:**

```
GET /api/v1/courses?isActive=false
→ filterObj = { isActive: "false" }
→ Course.find({ isActive: "false" })
→ Returns hidden/inactive courses (if the field exists)

GET /api/v1/courses?createdAt[gt]=2024-01-01
→ filterObj = { createdAt: { "$gt": "2024-01-01" } }
→ Attacker can query on ANY field, including internal ones
```

### Day 2: Allowlist (Inclusion-Based)

```javascript
// Day 2 — getAdvancedCourses
const filter = {}; // Start with an EMPTY object

// Only these 4 fields can ever be filtered on
const allowedFilters = ["category", "price", "rating", "instructorId"];

allowedFilters.forEach((field) => {
  if (queryObj[field]) {
    if (typeof queryObj[field] === "object") {
      // Handle operators per-field: ?price[lte]=100
      const operatorStr = JSON.stringify(queryObj[field]).replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`,
      );
      filter[field] = JSON.parse(operatorStr);
    } else {
      // Handle exact match: ?category=Web
      filter[field] = queryObj[field];
    }
  }
});

Course.find(filter); // ← Controlled filter object
```

**The protection:**

```
GET /api/v1/courses?isActive=false
→ "isActive" is NOT in allowedFilters
→ filter = {}  (silently ignored)
→ Course.find({})  ← No unintended filtering ✅

GET /api/v1/courses?password[$regex]=a
→ "password" is NOT in allowedFilters
→ filter = {}  (silently ignored)
→ No data leak ✅
```

### Why Allowlist Wins

| Aspect             | Blacklist (Day 1)                                | Allowlist (Day 2)                                 |
| ------------------ | ------------------------------------------------ | ------------------------------------------------- |
| **Default**        | Everything is allowed unless explicitly excluded | Everything is blocked unless explicitly allowed   |
| **New fields**     | Automatically exposed — security regression      | Automatically protected — must opt in             |
| **Maintenance**    | Must remember to add every new meta field        | Only add fields you intentionally want filterable |
| **Attack surface** | Unbounded — any schema field can be queried      | Bounded — exactly 4 fields are queryable          |
| **Principle**      | Deny known bad (fragile)                         | Allow known good (robust)                         |

```
                    Blacklist                         Allowlist
                ┌─────────────────┐            ┌─────────────────┐
                │ ✅ category     │            │ ✅ category    │
                │ ✅ price        │            │ ✅ price       │
                │ ✅ rating       │            │ ✅ rating      │
                │ ✅ instructorId │            │ ✅ instructorId│
                │ ⚠️  isActive    │            │ ❌ isActive    │
                │ ⚠️  password    │            │ ❌ password    │
                │ ⚠️  createdAt   │            │ ❌ createdAt   │
                │ ⚠️  __v         │            │ ❌ __v         │
                │ ⚠️  (any future)│            │ ❌ (any future)│
                └─────────────────┘            └─────────────────┘
                 "Exclude what's bad"           "Include what's good"
```

---

## 🔍 `getAdvancedCourses` — The 7-Step Pipeline

### Step 1: Initialize Empty Filter

```javascript
const filter = {};
```

Starting with an empty object ensures **nothing passes through by default**. This is the fundamental difference from Day 1's `{ ...queryObj }` approach that started with everything included.

### Step 2: Safe Filtering (Allowlist)

```javascript
const allowedFilters = ["category", "price", "rating", "instructorId"];

allowedFilters.forEach((field) => {
  if (queryObj[field]) {
    if (typeof queryObj[field] === "object") {
      // Handle operators: ?price[lte]=100 → { $lte: "100" }
      const operatorStr = JSON.stringify(queryObj[field]).replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`,
      );
      filter[field] = JSON.parse(operatorStr);
    } else {
      // Handle exact: ?category=Web → { category: "Web" }
      filter[field] = queryObj[field];
    }
  }
});
```

**Per-field operator translation:**

```
URL: ?price[lte]=100&price[gte]=50

Express parses:
  queryObj.price = { lte: "100", gte: "50" }

typeof queryObj.price === "object" → true

JSON.stringify({ lte: "100", gte: "50" })
  → '{"lte":"100","gte":"50"}'

.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)
  → '{"$lte":"100","$gte":"50"}'

JSON.parse(...)
  → { $lte: "100", $gte: "50" }

filter.price = { $lte: "100", $gte: "50" }
```

| URL Query                       | Filter Object                            | Type        |
| ------------------------------- | ---------------------------------------- | ----------- |
| `?category=Web`                 | `{ category: "Web" }`                    | Exact       |
| `?price[lte]=100`               | `{ price: { $lte: "100" } }`             | Operator    |
| `?price[gte]=50&price[lte]=100` | `{ price: { $gte: "50", $lte: "100" } }` | Range       |
| `?rating[gte]=4`                | `{ rating: { $gte: "4" } }`              | Operator    |
| `?isActive=false`               | `{}` ← silently ignored                  | **Blocked** |

### Step 3: Text Search (Regex)

```javascript
if (queryObj.search) {
  filter.title = {
    $regex: queryObj.search,
    $options: "i", // Case-insensitive
  };
}
```

**How it works:**

```
URL: ?search=node

filter.title = { $regex: "node", $options: "i" }

MongoDB equivalent:
  db.courses.find({ title: /node/i })

Matches:
  ✅ "Advanced Node.js"
  ✅ "NODE Fundamentals"
  ✅ "Building APIs with Node"
  ❌ "React Masterclass"
```

| URL Query       | MongoDB Query                                   | Matches                      |
| --------------- | ----------------------------------------------- | ---------------------------- |
| `?search=node`  | `{ title: { $regex: "node", $options: "i" } }`  | Any title containing "node"  |
| `?search=react` | `{ title: { $regex: "react", $options: "i" } }` | Any title containing "react" |
| `?search=js`    | `{ title: { $regex: "js", $options: "i" } }`    | Any title containing "js"    |

> **Text search + filtering combine:** `?search=node&category=Web` finds courses with "node" in the title AND in the "Web" category.

### Step 4: Sorting

```javascript
if (queryObj.sort) {
  // ?sort=-price,rating → .sort('-price rating')
  const sortBy = queryObj.sort.split(",").join(" ");
  query = query.sort(sortBy);
} else {
  query = query.sort("-createdAt"); // Default sort
}
```

| URL                      | Mongoose Sort               | Effect                       |
| ------------------------ | --------------------------- | ---------------------------- |
| `?sort=price`            | `.sort("price")`            | Cheapest first               |
| `?sort=-price`           | `.sort("-price")`           | Most expensive first         |
| `?sort=-price,createdAt` | `.sort("-price createdAt")` | Expensive first, then oldest |
| _(no sort param)_        | `.sort("-createdAt")`       | Default: newest first        |

### Step 5: Field Selection (Projection)

```javascript
if (queryObj.fields) {
  // ?fields=title,price → .select('title price')
  const fields = queryObj.fields.split(",").join(" ");
  query = query.select(fields);
} else {
  query = query.select("-__v"); // Default: exclude internal versioning
}
```

**Why this matters for performance:**

```
// Without field selection — full document returned
GET /api/v1/courses
→ { _id, title, description, price, category, rating, instructorId, duration, createdAt, ... }
→ ~500 bytes per document × 100 documents = 50KB

// With field selection — only requested fields
GET /api/v1/courses?fields=title,price
→ { _id, title, price }
→ ~80 bytes per document × 100 documents = 8KB  (84% reduction)
```

| URL Query              | `.select()` Call          | Fields Returned                 |
| ---------------------- | ------------------------- | ------------------------------- |
| `?fields=title,price`  | `.select("title price")`  | `_id`, `title`, `price`         |
| `?fields=title`        | `.select("title")`        | `_id`, `title`                  |
| `?fields=-description` | `.select("-description")` | Everything except `description` |
| _(no fields param)_    | `.select("-__v")`         | Everything except `__v`         |

> **Note:** MongoDB always includes `_id` unless explicitly excluded with `?fields=-_id,title`.

### Step 6: Pagination

```javascript
const page = Math.max(1, Number(queryObj.page) || 1);
const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
const skip = (page - 1) * limit;

query = query.skip(skip).limit(limit);
```

Unchanged from Day 1 — same guards apply:

| Guard        | Code                                        | Purpose                               |
| ------------ | ------------------------------------------- | ------------------------------------- |
| Min page     | `Math.max(1, Number(queryObj.page) \|\| 1)` | Prevents page 0 or negative           |
| Min limit    | `Math.max(1, ...)`                          | Prevents 0 items per page             |
| Max limit    | `Math.min(100, ...)`                        | Prevents `?limit=999999` memory abuse |
| Out-of-range | `if (page > totalPages)` → `404`            | Prevents accessing non-existent pages |

### Step 7: Execution

```javascript
const [totalCourses, courses] = await Promise.all([
  Course.countDocuments(filter),
  query.lean(),
]);

const totalPages = Math.ceil(totalCourses / limit);

if (page > totalPages && totalCourses > 0) {
  throw new AppError("This page does not exist.", 404);
}

return {
  meta: {
    totalItems: totalCourses,
    itemsPerPage: limit,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  },
  courses,
};
```

**Response order change:** In Day 2, `meta` is returned **before** `courses` in the response object. This is a convention preference — API consumers see the pagination context before the data array:

```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": [ ... ],
  "meta": {
    "totalItems": 25,
    "itemsPerPage": 10,
    "currentPage": 1,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔄 Controller & Route Updates

### Controller: `getCourses` → `getAllCourses`

```javascript
// controllers/course.controller.js

// Day 1 (commented out):
// export const getCourses = async (req, res) => {
//   const result = await courseService.getPaginatedCourses(req.query);
//   sendResponse(res, 200, result.courses, "Courses retrieved successfully", {
//     meta: result.meta,
//   });
// };

// Day 2 (active):
export const getAllCourses = async (req, res) => {
  const result = await courseService.getAdvancedCourses(req.query);

  sendResponse(res, 200, result.courses, "Courses retrieved successfully", {
    meta: result.meta,
  });
};
```

### Route: Updated Handler Reference

```javascript
// routes/course.routes.js

// Day 1 (commented out):
// router.get("/", controller.getCourses);

// Day 2 (active):
router.get("/", controller.getAllCourses);
```

---

## 🧹 server.js Cleanup

Day 2 removes the commented-out inline rate limiter code from `server.js`, producing a clean 66-line entrypoint:

```javascript
// server.js — Day 2 (cleaned up)
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import { globalLimiter } from "./middleware/rateLimiter.middleware.js";
import mongoSanitize from "express-mongo-sanitize";
import { xssClean } from "./middleware/xss.middleware.js";

import { AppError } from "./utils/appError.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";

import { requestLogger } from "./middleware/logger.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";

const app = express();
const PORT = 4000;

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/authentication";

// 1. Security Headers & CORS
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

// 2. Rate Limiting
app.use("/api", globalLimiter);

// 3. Body & Cookie Parsers
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(requestLogger);

// 4. Data Sanitization
app.use(mongoSanitize());
app.use(xssClean);

// 5. Application Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);

app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
```

| Day 1 server.js                          | Day 2 server.js                                          |
| ---------------------------------------- | -------------------------------------------------------- |
| 99 lines                                 | 66 lines                                                 |
| Inline rate limiter code (commented out) | Clean — all rate limiting in `rateLimiter.middleware.js` |
| Section comments with numbers            | Same numbered sections, no dead code                     |

---

## 📡 API Reference

### Auth Endpoints

| Endpoint                             | Method | Auth        | Rate Limited?            | Description                  |
| ------------------------------------ | ------ | ----------- | ------------------------ | ---------------------------- |
| `/api/v1/auth/register`              | `POST` | ❌          | Global only              | Register a new user          |
| `/api/v1/auth/login`                 | `POST` | ❌          | **Global + Auth (5/hr)** | Login and receive tokens     |
| `/api/v1/auth/refresh`               | `POST` | ❌ (cookie) | Global only              | Rotate refresh token         |
| `/api/v1/auth/logout`                | `POST` | ✅ Bearer   | Global only              | Invalidate session           |
| `/api/v1/auth/forgot-password`       | `POST` | ❌          | Global only              | Request password reset email |
| `/api/v1/auth/reset-password/:token` | `POST` | ❌ (token)  | Global only              | Reset password with token    |

### User Endpoints

| Endpoint                        | Method   | Auth | Roles   | Description             |
| ------------------------------- | -------- | ---- | ------- | ----------------------- |
| `/api/v1/users/profile`         | `GET`    | ✅   | Any     | Get own profile         |
| `/api/v1/users/update-password` | `PUT`    | ✅   | Any     | Change own password     |
| `/api/v1/users/delete-account`  | `DELETE` | ✅   | Any     | Soft-delete own account |
| `/api/v1/users`                 | `GET`    | ✅   | `admin` | List all active users   |

### Course Endpoints — CRUD

| Endpoint              | Method   | Auth | Roles                 | Description             |
| --------------------- | -------- | ---- | --------------------- | ----------------------- |
| `/api/v1/courses`     | `GET`    | ❌   | Public                | List courses (advanced) |
| `/api/v1/courses`     | `POST`   | ✅   | `instructor`, `admin` | Create a course         |
| `/api/v1/courses/:id` | `PUT`    | ✅   | `instructor`, `admin` | Update a course         |
| `/api/v1/courses/:id` | `DELETE` | ✅   | `admin`               | Delete a course         |

### Course Endpoints — Advanced Query Examples

```bash
# Default: page 1, 10 items, sorted by newest
curl http://localhost:4000/api/v1/courses

# ============================================
# TEXT SEARCH (NEW in Day 2)
# ============================================

# Search by title — case-insensitive partial match
curl "http://localhost:4000/api/v1/courses?search=node"

# Search + filter combined
curl "http://localhost:4000/api/v1/courses?search=advanced&category=Web"

# ============================================
# FIELD SELECTION (NEW in Day 2)
# ============================================

# Return only title and price (smaller payload)
curl "http://localhost:4000/api/v1/courses?fields=title,price"

# Return everything except description
curl "http://localhost:4000/api/v1/courses?fields=-description"

# Search + field selection combined
curl "http://localhost:4000/api/v1/courses?search=node&fields=title,price,category"

# ============================================
# SAFE FILTERING (Allowlist)
# ============================================

# Filter by category (exact match)
curl "http://localhost:4000/api/v1/courses?category=Web"

# Filter by price range (operators)
curl "http://localhost:4000/api/v1/courses?price[gte]=50&price[lte]=200"

# Filter by minimum rating
curl "http://localhost:4000/api/v1/courses?rating[gte]=4"

# Unknown fields are silently ignored (safe!)
curl "http://localhost:4000/api/v1/courses?isActive=false"
# → Returns ALL courses (isActive is not in allowlist)

# ============================================
# SORTING
# ============================================

# Sort by price ascending (cheapest first)
curl "http://localhost:4000/api/v1/courses?sort=price"

# Sort by price descending (most expensive first)
curl "http://localhost:4000/api/v1/courses?sort=-price"

# Multi-field sort
curl "http://localhost:4000/api/v1/courses?sort=-price,createdAt"

# ============================================
# PAGINATION
# ============================================

# Page 2 with 5 items per page
curl "http://localhost:4000/api/v1/courses?page=2&limit=5"

# ============================================
# COMBINED — Full Power Query
# ============================================

# Web courses matching "node", priced $20-$100,
# sorted cheapest first, showing only title+price, page 1
curl "http://localhost:4000/api/v1/courses?search=node&category=Web&price[gte]=20&price[lte]=100&sort=price&fields=title,price&page=1&limit=5"
```

### Course Endpoints — Aggregation Analytics

| Endpoint                                   | Method | Auth | Roles                 | Description                 |
| ------------------------------------------ | ------ | ---- | --------------------- | --------------------------- |
| `/api/v1/courses/stats/categories`         | `GET`  | ❌   | Public                | Average price per category  |
| `/api/v1/courses/stats/top-web`            | `GET`  | ❌   | Public                | Top 3 web courses by price  |
| `/api/v1/courses/stats/instructor-counts`  | `GET`  | ✅   | `instructor`, `admin` | Course count per instructor |
| `/api/v1/courses/stats/instructor-details` | `GET`  | ✅   | `admin`               | Instructor names + counts   |
| `/api/v1/courses/stats/revenue`            | `GET`  | ✅   | `admin`               | Total revenue potential     |

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- [MongoDB](https://www.mongodb.com/) (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster)
- [Mailtrap](https://mailtrap.io/) account (free tier for email testing)
- npm (Node Package Manager)

---

## 🏁 Getting Started

### 1. Navigate to Project Directory

```bash
cd authentication
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Update the `.env` file:

```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/authentication

ACCESS_TOKEN_SECRET=super-secure-and-ultra-long-secret-key-12345
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=super-secure-and-ultra-long-refresh-secret-key-12345
REFRESH_TOKEN_EXPIRY=7d

FRONTEND_URL=http://127.0.0.1:5173

EMAIL_ADMIN=admin@swiftcart.com
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_mailtrap_username
EMAIL_PASSWORD=your_mailtrap_password
EMAIL_SUPPORT=support@swiftcart.com
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test Advanced Querying

```bash
# Test text search
curl "http://localhost:4000/api/v1/courses?search=node"

# Test field selection
curl "http://localhost:4000/api/v1/courses?fields=title,price"

# Test allowlist filtering (unknown field should be ignored)
curl "http://localhost:4000/api/v1/courses?isActive=false"
# → Should return ALL courses, not filtered by isActive
```

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable               | Description                                         | Example                                    |
| ---------------------- | --------------------------------------------------- | ------------------------------------------ |
| `NODE_ENV`             | Application mode                                    | `development`                              |
| `MONGO_URI`            | MongoDB connection string                           | `mongodb://localhost:27017/authentication` |
| `ACCESS_TOKEN_SECRET`  | Secret for signing access JWTs                      | (long random string)                       |
| `ACCESS_TOKEN_EXPIRY`  | Access token lifetime                               | `15m`                                      |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh JWTs                     | (different long random string)             |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime                              | `7d`                                       |
| `FRONTEND_URL`         | Frontend URL for CORS origin + password reset links | `http://127.0.0.1:5173`                    |
| `EMAIL_HOST`           | SMTP host                                           | `sandbox.smtp.mailtrap.io`                 |
| `EMAIL_PORT`           | SMTP port                                           | `2525`                                     |
| `EMAIL_USERNAME`       | SMTP username (Mailtrap)                            | (from Mailtrap dashboard)                  |
| `EMAIL_PASSWORD`       | SMTP password (Mailtrap)                            | (from Mailtrap dashboard)                  |
| `EMAIL_ADMIN`          | Admin email address                                 | `admin@swiftcart.com`                      |
| `EMAIL_SUPPORT`        | Support email (sender address)                      | `support@swiftcart.com`                    |

---

## 🔑 Key Concepts Summary

| Concept                                 | Description                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Blacklist filtering (Day 1)**         | Remove known meta fields, pass everything else → unbounded attack surface                        |
| **Allowlist filtering (Day 2)**         | Start empty, only add explicitly declared fields → bounded, secure                               |
| **`allowedFilters` array**              | `["category", "price", "rating", "instructorId"]` — the only fields that can reach `.find()`     |
| **Per-field operator translation**      | Regex replaces `gte`→`$gte` within each allowed field's value, not globally across the query     |
| **Text search (`$regex`)**              | `?search=node` → `{ title: { $regex: "node", $options: "i" } }` — case-insensitive partial match |
| **Field selection (Projection)**        | `?fields=title,price` → `.select("title price")` — reduces response payload size                 |
| **Default projection**                  | When no `fields` param, defaults to `.select("-__v")` — excludes version key only                |
| **Combined queries**                    | Search + filter + sort + fields + pagination can all be used together in a single request        |
| **`getAllCourses` controller**          | Replaces `getCourses` — calls `getAdvancedCourses` instead of `getPaginatedCourses`              |
| **Response order: `{ meta, courses }`** | Metadata placed before data in the response object for API consumer convenience                  |
| **server.js cleanup**                   | Removed 33 lines of commented-out inline rate limiter code — clean 66-line entrypoint            |
| **Security pipeline (unchanged)**       | helmet → cors → rateLimiter → express.json → cookieParser → mongoSanitize → xssClean → routes    |
