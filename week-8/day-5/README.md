# API Versioning, Applied RBAC & Cookie Path Mechanics

A production-structured Express 5 REST API that introduces **API versioning** (`/api/v1/`) for forward-compatible route namespacing, **applied RBAC** with `protect` + `restrictTo()` middleware enforced across all course and user routes, a **complete permissions matrix** mapping every endpoint to its required roles, the `deleteCourse` operation protected behind admin-only authorization, an admin-only **user listing** endpoint, and a deep exploration of **HTTP cookie path mechanics** — how browsers decide which cookies to attach to which requests based on the `path` attribute.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [API Versioning — /api/v1/ Prefix](#api-versioning--apiv1-prefix)
  - [Request Lifecycle with RBAC](#request-lifecycle-with-rbac)
- [RBAC Applied — Full Permissions Matrix](#-rbac-applied--full-permissions-matrix)
  - [Visual Infographic: HTTP Cookies & Authentication Flow](#visual-infographic-http-cookies--authentication-flow)
  - [Course Routes — Role Enforcement](#course-routes--role-enforcement)
  - [User Routes — Self-Service vs Admin](#user-routes--self-service-vs-admin)
  - [Auth Routes — Public Endpoints](#auth-routes--public-endpoints)
  - [Complete Permissions Matrix](#complete-permissions-matrix)
- [protect + restrictTo — The Middleware Pipeline](#-protect--restrictto--the-middleware-pipeline)
  - [protect Middleware — Authentication](#protect-middleware--authentication)
  - [restrictTo Middleware — Authorization](#restrictto-middleware--authorization)
  - [Why Two Separate Middleware?](#why-two-separate-middleware)
  - [Blanket vs Per-Route Protection](#blanket-vs-per-route-protection)
- [Course Routes — RBAC in Practice](#-course-routes--rbac-in-practice)
  - [Public Routes (No Auth Required)](#public-routes-no-auth-required)
  - [Instructor + Admin Routes](#instructor--admin-routes)
  - [Admin-Only Routes](#admin-only-routes)
  - [deleteCourse — New Admin Operation](#deletecourse--new-admin-operation)
- [User Routes — RBAC in Practice](#-user-routes--rbac-in-practice)
  - [Self-Service Routes (Any Authenticated User)](#self-service-routes-any-authenticated-user)
  - [Admin-Only User Management](#admin-only-user-management)
  - [getAllUsers — Admin User Listing](#getallusers--admin-user-listing)
- [Cookie Path Mechanics — How Browsers Attach Cookies](#-cookie-path-mechanics--how-browsers-attach-cookies)
  - [Visual Infographic: Cookie Jar Concept](#visual-infographic-cookie-jar-concept)
  - [Visual Infographic: How Cookies Attach to Requests](#visual-infographic-how-cookies-attach-to-requests)
  - [What is the Cookie Path Attribute?](#what-is-the-cookie-path-attribute)
  - [Visual Infographic: Cookie Default Path Behavior](#visual-infographic-cookie-default-path-behavior)
  - [Default Path — Set-Cookie Without Explicit Path](#default-path--set-cookie-without-explicit-path)
  - [Visual Infographic: Cookie Path vs Routes](#visual-infographic-cookie-path-vs-routes)
  - [Path Matching Rules](#path-matching-rules)
  - [Visual Infographic: Cookie Path Behavior Deep Dive](#visual-infographic-cookie-path-behavior-deep-dive)
  - [Why path: "/" Is Used for Refresh Tokens](#why-path--is-used-for-refresh-tokens)
  - [Cookie Path vs Route Path — Common Confusion](#cookie-path-vs-route-path--common-confusion)
- [API Reference](#-api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Course Endpoints — CRUD](#course-endpoints--crud)
  - [Course Endpoints — Aggregation Analytics](#course-endpoints--aggregation-analytics)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **API Versioning (`/api/v1/`)** — All route namespaces prefixed with `/api/v1/` for backward-compatible API evolution
- **Applied RBAC on Every Route** — `protect` + `restrictTo()` middleware enforced across course CRUD, aggregation analytics, and user management
- **Complete Permissions Matrix** — Every endpoint mapped to its required authentication and role(s)
- **`deleteCourse` Admin Operation** — New `DELETE /api/v1/courses/:id` restricted to `admin` role only
- **Admin User Listing** — `GET /api/v1/users` returns all active users, restricted to `admin` role
- **Blanket vs Per-Route Protection** — User routes use `router.use(protect)` blanket; course routes use per-route `protect` for mixed public/private access
- **Cookie Path Mechanics** — Deep exploration of how browsers decide which cookies to attach to which requests based on the `path` attribute

---

## 🧰 Tech Stack

| Technology                  | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| **Node.js**                 | JavaScript runtime (v24+ recommended)                 |
| **Express 5** (`^5.2.1`)   | Web framework with native async error propagation     |
| **Mongoose 9** (`^9.9.4`)  | MongoDB ODM — schemas, TTL indexes, references        |
| **bcryptjs** (`^3.0.3`)    | Password hashing and verification                     |
| **jsonwebtoken** (`^9.0.3`) | Access + Refresh token signing and verification       |
| **cookie-parser** (`^1.4.7`) | Parse `Cookie` header → `req.cookies`                |
| **nodemailer** (`^9.1.1`)  | SMTP email transport for password reset emails        |
| **crypto** (built-in)      | `randomBytes` for reset tokens, `createHash` for SHA-256 |
| **Joi** (`^18.2.5`)        | Declarative request body validation                   |
| **ES Modules**              | Native `"type": "module"` (`import`/`export`)         |
| **Nodemon**                 | Hot-reloading development server with `--env-file`    |

---

## 🏗 Architecture

### Directory Structure

```
authentication/
├── server.js                          # ★ /api/v1/ versioned route mounting
├── .env                               # Access/Refresh secrets + email config
├── package.json                       # Dependencies + scripts
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
│   ├── auth.middleware.js             # ★ protect + restrictTo() — applied across routes
│   ├── validate.middleware.js         # Reusable Joi factory
│   ├── logger.middleware.js           # ISO timestamp request logger
│   └── globalErrorHandler.js          # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                 # Public: register, login, refresh, logout, forgot/reset
│   ├── user.routes.js                 # ★ Blanket protect + admin restrictTo for user listing
│   └── course.routes.js               # ★ Per-route protect + restrictTo for CRUD & analytics
│
├── controllers/
│   ├── auth.controller.js             # register, login, refresh, logout, forgotPassword, resetPassword
│   ├── user.controller.js             # ★ getProfile, updatePassword, deleteAccount, getAllUsers
│   └── course.controller.js           # ★ CRUD (create, get, update, delete) + aggregation handlers
│
├── services/
│   ├── auth.service.js                # registerUser, loginUser, refreshAccess, logoutUser, generateResetToken, resetPassword
│   ├── user.service.js                # ★ changePassword, deactivateUser, fetchAllUsers
│   └── course.service.js              # CRUD + aggregation pipelines
│
└── utils/
    ├── appError.js                    # Custom AppError class
    ├── token.js                       # signAccessToken, signRefreshToken, createAuthSession, hashToken
    ├── cookie.js                      # setRefreshTokenCookie, clearRefreshTokenCookie
    ├── password.js                    # hashPassword, comparePassword
    ├── email.js                       # sendEmail (Nodemailer transport)
    └── responseHandler.js             # sendResponse (standardized JSON)
```

### API Versioning — `/api/v1/` Prefix

```javascript
// server.js — Day 5 change: /api/ → /api/v1/
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
```

| Concept | Explanation |
| --- | --- |
| **Why version?** | Allows breaking changes in `v2` without affecting `v1` consumers |
| **URL-based versioning** | Most common REST pattern — version in URL path (`/api/v1/`, `/api/v2/`) |
| **Header-based versioning** | Alternative: `Accept: application/vnd.myapp.v1+json` (less common) |
| **When to bump?** | Only when making **breaking changes** — adding fields is NOT a breaking change |

```
Day 4:  POST /api/auth/login        ← No version
Day 5:  POST /api/v1/auth/login     ← Versioned (forward-compatible)
```

### Request Lifecycle with RBAC

```
Client POST /api/v1/courses
  │
  │  Authorization: Bearer <accessToken>
  │  { title, price, category, instructorId }
  │
  ▼
protect middleware                    ← Step 1: AUTHENTICATION
  │  Extract Bearer token
  │  jwt.verify(token, ACCESS_TOKEN_SECRET)
  │  User.findOne({ _id: decoded.id, isActive: true })
  │  req.user = currentUser
  │
  ▼
restrictTo("instructor", "admin")    ← Step 2: AUTHORIZATION
  │  Check req.user.role ∈ ["instructor", "admin"]
  │  ❌ "user" role → 403 Forbidden
  │  ✅ "instructor" or "admin" → next()
  │
  ▼
validate(createCourseSchema)         ← Step 3: VALIDATION
  │  Joi validates request body
  │
  ▼
createCourse controller              ← Step 4: HANDLER
  │  courseService.create(req.body)
  │
  ▼
201 Created { course }
```

---

## 🛂 RBAC Applied — Full Permissions Matrix

### Visual Infographic: HTTP Cookies & Authentication Flow

The following infographic visualizes how HTTP cookies transport authentication tokens through the complete request/response cycle:

![HTTP Cookies and Authentication Flow](HTTP%20Cookies%20and%20Authentication%20Flow.png)

### Course Routes — Role Enforcement

```javascript
// routes/course.routes.js

// ==========================================
// 1. Aggregation / Analytics Routes (RBAC)
// ==========================================

// Public / All: General catalog & web highlights
router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web", controller.getTopWeb);

// Instructor & Admin: Operational instructor metrics
router.get(
  "/stats/instructor-counts",
  protect,
  restrictTo("instructor", "admin"),
  controller.getInstructorCounts,
);

// Admin Only: Sensitive instructor details and financial revenue stats
router.get(
  "/stats/instructor-details",
  protect,
  restrictTo("admin"),
  controller.getInstructorDetails,
);
router.get(
  "/stats/revenue",
  protect,
  restrictTo("admin"),
  controller.getRevenue,
);

// ==========================================
// 2. Standard CRUD Routes (RBAC)
// ==========================================

// Public: Anyone can view courses
router.get("/", controller.getCourses);

// Instructor & Admin: Create and update courses
router.post(
  "/",
  protect,
  restrictTo("instructor", "admin"),
  validate(createCourseSchema),
  controller.createCourse,
);
router.put(
  "/:id",
  protect,
  restrictTo("instructor", "admin"),
  validate(updateCourseSchema),
  controller.updateCourse,
);

// Admin Only: Delete courses
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  controller.deleteCourse,
);
```

### User Routes — Self-Service vs Admin

```javascript
// routes/user.routes.js

const router = express.Router();

// All user routes require authentication
router.use(protect);    // ← Blanket protection

// Self-service routes (Available to any authenticated role: user, instructor, admin)
router.get("/profile", getProfile);
router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

// Admin-only management routes (RBAC)
router.get("/", restrictTo("admin"), getAllUsers);
```

> **Key pattern difference:** User routes use `router.use(protect)` because **every** user route requires authentication. Course routes apply `protect` **per-route** because some routes (`GET /` and stats) are public.

### Auth Routes — Public Endpoints

```javascript
// routes/auth.routes.js — No protect or restrictTo

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);    // ← Only logout requires auth
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);
```

### Complete Permissions Matrix

| Endpoint | Method | Auth Required? | Allowed Roles | Middleware Stack |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/register` | `POST` | ❌ No | Public | `validate(registerSchema)` |
| `/api/v1/auth/login` | `POST` | ❌ No | Public | `validate(loginSchema)` |
| `/api/v1/auth/refresh` | `POST` | ❌ No | Public (cookie-based) | — |
| `/api/v1/auth/logout` | `POST` | ✅ Yes | Any authenticated | `protect` |
| `/api/v1/auth/forgot-password` | `POST` | ❌ No | Public | `validate(forgotPasswordSchema)` |
| `/api/v1/auth/reset-password/:token` | `POST` | ❌ No | Public (token-based) | `validate(resetPasswordSchema)` |
| `/api/v1/users/profile` | `GET` | ✅ Yes | `user`, `instructor`, `admin` | `protect` (blanket) |
| `/api/v1/users/update-password` | `PUT` | ✅ Yes | `user`, `instructor`, `admin` | `protect` (blanket) |
| `/api/v1/users/delete-account` | `DELETE` | ✅ Yes | `user`, `instructor`, `admin` | `protect` (blanket) |
| `/api/v1/users` | `GET` | ✅ Yes | `admin` only | `protect` (blanket) + `restrictTo("admin")` |
| `/api/v1/courses` | `GET` | ❌ No | Public | — |
| `/api/v1/courses` | `POST` | ✅ Yes | `instructor`, `admin` | `protect` + `restrictTo(...)` + `validate(...)` |
| `/api/v1/courses/:id` | `PUT` | ✅ Yes | `instructor`, `admin` | `protect` + `restrictTo(...)` + `validate(...)` |
| `/api/v1/courses/:id` | `DELETE` | ✅ Yes | `admin` only | `protect` + `restrictTo("admin")` |
| `/api/v1/courses/stats/categories` | `GET` | ❌ No | Public | — |
| `/api/v1/courses/stats/top-web` | `GET` | ❌ No | Public | — |
| `/api/v1/courses/stats/instructor-counts` | `GET` | ✅ Yes | `instructor`, `admin` | `protect` + `restrictTo(...)` |
| `/api/v1/courses/stats/instructor-details` | `GET` | ✅ Yes | `admin` only | `protect` + `restrictTo("admin")` |
| `/api/v1/courses/stats/revenue` | `GET` | ✅ Yes | `admin` only | `protect` + `restrictTo("admin")` |

---

## 🔐 `protect` + `restrictTo` — The Middleware Pipeline

### `protect` Middleware — Authentication

```javascript
// middleware/auth.middleware.js
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("You are not logged in! Please provide a token.", 401);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);

  const currentUser = await User.findOne({
    _id: decoded.id,
    isActive: { $ne: false },
  });
  if (!currentUser) {
    throw new AppError(
      "The user belonging to this token no longer exists or is deactivated.",
      401,
    );
  }

  req.user = currentUser;
  next();
};
```

| Step | Action | Failure |
| --- | --- | --- |
| 1 | Extract `Bearer <token>` from `Authorization` header | `401` — No token provided |
| 2 | `jwt.verify(token, ACCESS_TOKEN_SECRET)` → `decoded.id` | `401` — Invalid/expired token |
| 3 | `User.findOne({ _id, isActive: { $ne: false } })` | `401` — User deleted/deactivated |
| 4 | Attach `req.user = currentUser` | — |
| 5 | Call `next()` → proceed to next middleware | — |

### `restrictTo` Middleware — Authorization

```javascript
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user was attached by the 'protect' middleware
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
      );
    }
    next();
  };
};
```

| Concept | Explanation |
| --- | --- |
| `...roles` | Rest parameter — `restrictTo("admin", "instructor")` → `roles = ["admin", "instructor"]` |
| Closure | Inner function "remembers" `roles` array after `restrictTo()` returns |
| `req.user.role` | Set by `protect` — the authenticated user's role from the database |
| `401` vs `403` | `401 Unauthorized` = "who are you?" / `403 Forbidden` = "you can't do this" |

### Why Two Separate Middleware?

```
protect     → Authentication → "Who are you?"     → 401 if unknown
restrictTo  → Authorization  → "What can you do?" → 403 if forbidden
```

**Separation of concerns:**

| Pattern | Problem |
| --- | --- |
| Combined `protectAdmin()` | Must create `protectUser()`, `protectInstructor()`, etc. — N middleware for N roles |
| Separated `protect` + `restrictTo("admin")` | Compose any combination: `restrictTo("admin", "instructor")` — 1 middleware, infinite combos |

### Blanket vs Per-Route Protection

| Strategy | Code | When to Use |
| --- | --- | --- |
| **Blanket** | `router.use(protect)` | When **ALL** routes below need authentication (user routes) |
| **Per-Route** | `router.get("/", protect, ...)` | When **some** routes are public and some are protected (course routes) |

```javascript
// BLANKET (user.routes.js) — Every route below is protected
router.use(protect);
router.get("/profile", getProfile);              // ← protected by blanket
router.get("/", restrictTo("admin"), getAllUsers); // ← protected by blanket + restricted

// PER-ROUTE (course.routes.js) — Mix of public and protected
router.get("/", controller.getCourses);           // ← public (no protect)
router.post("/", protect, restrictTo("instructor", "admin"), ...); // ← protected
```

---

## 📚 Course Routes — RBAC in Practice

### Public Routes (No Auth Required)

Any client (even unauthenticated) can access these:

```javascript
// Browse catalog — no protect middleware
router.get("/", controller.getCourses);
router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web", controller.getTopWeb);
```

> **Rationale:** Course browsing is the storefront — you don't ask for a login to window-shop.

### Instructor + Admin Routes

Content creators and administrators can manage courses:

```javascript
router.post("/", protect, restrictTo("instructor", "admin"), validate(createCourseSchema), controller.createCourse);
router.put("/:id", protect, restrictTo("instructor", "admin"), validate(updateCourseSchema), controller.updateCourse);
router.get("/stats/instructor-counts", protect, restrictTo("instructor", "admin"), controller.getInstructorCounts);
```

```
Request with role: "user"                     Request with role: "instructor"
  │                                              │
  ▼                                              ▼
protect ✅ (valid token)                      protect ✅ (valid token)
  │                                              │
  ▼                                              ▼
restrictTo("instructor", "admin")             restrictTo("instructor", "admin")
  │  ["instructor","admin"].includes("user")     │  ["instructor","admin"].includes("instructor")
  │  → false                                     │  → true
  │                                              │
  ▼                                              ▼
❌ 403 Forbidden                               ✅ createCourse handler
```

### Admin-Only Routes

Sensitive financial and user data restricted to administrators:

```javascript
router.get("/stats/instructor-details", protect, restrictTo("admin"), controller.getInstructorDetails);
router.get("/stats/revenue", protect, restrictTo("admin"), controller.getRevenue);
router.delete("/:id", protect, restrictTo("admin"), controller.deleteCourse);
```

> **Why admin-only for revenue?** Revenue data is financial intelligence — exposing it to instructors could create compensation disputes or competitive behavior.

### `deleteCourse` — New Admin Operation

```javascript
// controllers/course.controller.js
export const deleteCourse = async (req, res) => {
  const course = await courseService.remove(req.params.id);
  if (!course) throw new AppError("Course not found", 404);
  sendResponse(res, 200, null, "Course deleted successfully");
};
```

```javascript
// services/course.service.js
export const remove = async (id) => await Course.findByIdAndDelete(id);
```

| Why admin-only? | Explanation |
| --- | --- |
| Irreversible | `findByIdAndDelete` permanently removes the document — no soft delete |
| Cascading impact | Enrolled students lose access, revenue records affected |
| Audit trail | Admin actions should be logged and reviewable |

---

## 👥 User Routes — RBAC in Practice

### Self-Service Routes (Any Authenticated User)

Every authenticated user (regardless of role) can manage their own account:

```javascript
router.use(protect);                                   // ← Blanket: all routes below
router.get("/profile", getProfile);                    // user ✅ instructor ✅ admin ✅
router.put("/update-password", updatePassword);        // user ✅ instructor ✅ admin ✅
router.delete("/delete-account", deleteAccount);       // user ✅ instructor ✅ admin ✅
```

### Admin-Only User Management

```javascript
router.get("/", restrictTo("admin"), getAllUsers);      // user ❌ instructor ❌ admin ✅
```

> **Note:** `protect` is already applied via `router.use(protect)` above, so only `restrictTo` is needed on this route.

### `getAllUsers` — Admin User Listing

```javascript
// controllers/user.controller.js
export const getAllUsers = async (req, res) => {
  const users = await userService.fetchAllUsers();
  sendResponse(res, 200, users, "All users retrieved successfully");
};

// services/user.service.js
export const fetchAllUsers = async () => {
  return await User.find({ isActive: { $ne: false } }).select("-__v");
};
```

| Design Decision | Explanation |
| --- | --- |
| `isActive: { $ne: false }` | Excludes soft-deleted users — admins see only active accounts |
| `.select("-__v")` | Strips Mongoose version key from response |
| No `.select("+password")` | Password hash excluded by default (`select: false` on schema) |
| Admin-only | User listing contains PII (emails, roles) — must be restricted |

---

## 🍪 Cookie Path Mechanics — How Browsers Attach Cookies

### Visual Infographic: Cookie Jar Concept

The browser maintains a "cookie jar" — a key-value store of all cookies for a domain, each scoped by attributes like `path`, `domain`, `secure`, and `httpOnly`:

![Cookie Jar](Cookie%20Jar.png)

### Visual Infographic: How Cookies Attach to Requests

When the browser makes a request, it checks every cookie in the jar against the request URL and only sends cookies whose `path` prefix-matches the request path:

![How Cookies Attach to Requests](How%20Cookies%20Attach%20to%20Requests.png)

### What is the Cookie `path` Attribute?

The `path` attribute on a `Set-Cookie` header tells the browser: **"Only send this cookie on requests whose URL path starts with this prefix."**

```
Set-Cookie: jwt_refresh=abc123; Path=/api/v1/auth; HttpOnly; SameSite=Strict
                                      ▲
                                      │
                         Cookie ONLY sent to URLs starting with /api/v1/auth
```

| Request URL | Cookie sent? | Reason |
| --- | --- | --- |
| `POST /api/v1/auth/login` | ✅ Yes | `/api/v1/auth` prefix matches |
| `POST /api/v1/auth/refresh` | ✅ Yes | `/api/v1/auth` prefix matches |
| `POST /api/v1/auth/logout` | ✅ Yes | `/api/v1/auth` prefix matches |
| `GET /api/v1/users/profile` | ❌ **No** | `/api/v1/users` does NOT start with `/api/v1/auth` |
| `GET /api/v1/courses` | ❌ **No** | `/api/v1/courses` does NOT start with `/api/v1/auth` |

### Visual Infographic: Cookie Default Path Behavior

When `Set-Cookie` does NOT include an explicit `Path`, the browser derives the default path from the request URL that set it:

![Cookie Default Path](Cookie%20Default%20Path.png)

### Default Path — `Set-Cookie` Without Explicit Path

When the server sets a cookie **without** specifying `Path`, the browser uses the **directory of the request URL** as the default path:

```javascript
// Our cookie.js helper does NOT set a path:
res.cookie("jwt_refresh", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // No 'path' option → browser derives from request URL
});
```

**Browser default path algorithm:**

```
Request URL that set the cookie:  POST /api/v1/auth/login
                                               │
Browser computes default path:                 │
  1. Take the URL path:        /api/v1/auth/login
  2. Strip the last segment:   /api/v1/auth/
  3. Default cookie path:      /api/v1/auth
```

| Scenario | Default Path | Consequence |
| --- | --- | --- |
| Login at `/api/v1/auth/login` | `/api/v1/auth` | Cookie sent to `/api/v1/auth/*` but NOT `/api/v1/users/*` |
| Login at `/api/auth/login` | `/api/auth` | Cookie sent to `/api/auth/*` but NOT `/api/users/*` |
| Login at `/login` | `/` | Cookie sent to ALL paths (entire domain) |

### Visual Infographic: Cookie Path vs Routes

The following infographic contrasts cookie path scoping against Express route registration:

![Cookie Path vs Routes Infographic](Cookie%20Path%20vs%20Routes%20Infographic.png)

### Path Matching Rules

```
Cookie path: /api/v1/auth

  /api/v1/auth              ✅  Exact match
  /api/v1/auth/             ✅  Exact match with trailing slash
  /api/v1/auth/login        ✅  Starts with /api/v1/auth/
  /api/v1/auth/refresh      ✅  Starts with /api/v1/auth/
  /api/v1/auth/logout       ✅  Starts with /api/v1/auth/
  /api/v1/authx             ❌  "authx" ≠ "auth" (prefix must match at / boundary)
  /api/v1/users/profile     ❌  Different path entirely
  /api/v1/courses           ❌  Different path entirely
```

> **Critical rule:** Path matching is a **prefix match at path-segment boundaries** (separated by `/`). `/api/v1/auth` matches `/api/v1/auth/login` but does **NOT** match `/api/v1/authorize`.

### Visual Infographic: Cookie Path Behavior Deep Dive

The following infographic provides a comprehensive decision tree of how cookie path matching works across multiple scenarios:

![Cookie Path Behavior Infographic](Cookie%20Path%20Behavior%20Infographic.png)

### Why `path: "/"` Is Used for Refresh Tokens

If the cookie path defaults to `/api/v1/auth`, the refresh token cookie would **not** be sent to `/api/v1/users/update-password` (which also needs the cookie to rotate sessions). The fix:

```javascript
// Option 1: Explicitly set path to "/"
res.cookie("jwt_refresh", token, {
  httpOnly: true,
  path: "/",                  // ← Cookie sent to ALL paths on this domain
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Option 2: Don't set path (our current approach)
// Works because Express default cookie path is "/" when not specified in res.cookie()
```

| Approach | Express `res.cookie()` behavior | Browser receives |
| --- | --- | --- |
| No `path` in `res.cookie()` | Express sets `Path=/` by default | Cookie sent to **all** paths |
| `path: "/"` explicit | Explicitly sets `Path=/` | Cookie sent to **all** paths |
| `path: "/api/v1/auth"` | Cookie scoped to auth routes only | Cookie **NOT** sent to `/api/v1/users/*` |

> **Important distinction:** Express's `res.cookie()` defaults to `Path=/` (root), which is different from the raw `Set-Cookie` header default (which would be derived from the request URL). Express is being helpful here.

### Cookie Path vs Route Path — Common Confusion

| Concept | Cookie `path` | Express route `path` |
| --- | --- | --- |
| **What it controls** | Which requests the browser **sends** the cookie with | Which URLs the server **handles** |
| **Who enforces it?** | The **browser** | The **server** (Express router) |
| **Default** | `"/"` (Express) or derived from URL (raw `Set-Cookie`) | Must be explicitly registered |
| **Prefix matching** | Yes — `/api` matches `/api/v1/auth/login` | Yes — `app.use("/api", router)` matches sub-paths |
| **Security implication** | Narrow path → cookie not sent → request fails | Missing route → 404 |

---

## 📡 API Reference

### Auth Endpoints

#### Register

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alex", "email": "alex@example.com", "password": "Pass1234"}'
```

**Success (201 Created):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "_id": "665a1b...",
    "name": "Alex",
    "email": "alex@example.com",
    "role": "user",
    "rating": 5,
    "isActive": true
  }
}
```

#### Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "Pass1234"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "665a1b...", "name": "Alex", "role": "user" }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiI..."
}
```

> **Note:** The response also includes a `Set-Cookie: jwt_refresh=...` HTTP header.

#### Refresh Token

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  --cookie "jwt_refresh=eyJhbGciOiJIUzI1NiI..."
```

#### Forgot Password

```bash
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com"}'
```

#### Reset Password

```bash
curl -X POST http://localhost:4000/api/v1/auth/reset-password/abc123def456... \
  -H "Content-Type: application/json" \
  -d '{"password": "NewPass1234"}'
```

#### Logout (Protected)

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  --cookie "jwt_refresh=eyJhbGciOiJIUzI1NiI..."
```

### User Endpoints

#### Get Profile (Any Authenticated User)

```bash
curl http://localhost:4000/api/v1/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

#### Update Password (Any Authenticated User)

```bash
curl -X PUT http://localhost:4000/api/v1/users/update-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "Pass1234", "newPassword": "NewPass5678"}'
```

#### Delete Account (Any Authenticated User)

```bash
curl -X DELETE http://localhost:4000/api/v1/users/delete-account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

#### List All Users (Admin Only)

```bash
curl http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK) — Admin token:**

```json
{
  "success": true,
  "message": "All users retrieved successfully",
  "data": [
    { "_id": "665a1b...", "name": "Alex", "email": "alex@example.com", "role": "user", "isActive": true },
    { "_id": "665a2c...", "name": "Sarah", "email": "sarah@example.com", "role": "instructor", "isActive": true }
  ]
}
```

**Failure (403 Forbidden) — Non-admin token:**

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

### Course Endpoints — CRUD

#### List Courses (Public)

```bash
curl http://localhost:4000/api/v1/courses
```

#### Create Course (Instructor / Admin)

```bash
curl -X POST http://localhost:4000/api/v1/courses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Node.js Masterclass", "price": 49.99, "category": "Web", "instructorId": "665a2c..."}'
```

#### Update Course (Instructor / Admin)

```bash
curl -X PUT http://localhost:4000/api/v1/courses/665b3d... \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  -H "Content-Type: application/json" \
  -d '{"price": 59.99}'
```

#### Delete Course (Admin Only)

```bash
curl -X DELETE http://localhost:4000/api/v1/courses/665b3d... \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK) — Admin token:**

```json
{
  "success": true,
  "message": "Course deleted successfully",
  "data": null
}
```

**Failure (403 Forbidden) — Instructor token:**

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

### Course Endpoints — Aggregation Analytics

#### Category Stats (Public)

```bash
curl http://localhost:4000/api/v1/courses/stats/categories
```

#### Top Web Courses (Public)

```bash
curl http://localhost:4000/api/v1/courses/stats/top-web
```

#### Instructor Course Counts (Instructor / Admin)

```bash
curl http://localhost:4000/api/v1/courses/stats/instructor-counts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

#### Instructor Details (Admin Only)

```bash
curl http://localhost:4000/api/v1/courses/stats/instructor-details \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

#### Revenue Potential (Admin Only)

```bash
curl http://localhost:4000/api/v1/courses/stats/revenue \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

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

### 5. Test the RBAC Flow

1. **Register a regular user** — `POST /api/v1/auth/register` with `"role": "user"` (default)
2. **Register an instructor** — `POST /api/v1/auth/register` with `"role": "instructor"`
3. **Register an admin** — `POST /api/v1/auth/register` with `"role": "admin"`
4. **Login as user** → try `POST /api/v1/courses` → expect `403 Forbidden`
5. **Login as instructor** → try `POST /api/v1/courses` → expect `201 Created`
6. **Login as instructor** → try `DELETE /api/v1/courses/:id` → expect `403 Forbidden`
7. **Login as admin** → try `DELETE /api/v1/courses/:id` → expect `200 OK`
8. **Login as admin** → try `GET /api/v1/users` → expect `200 OK` with all users
9. **Login as user** → try `GET /api/v1/users` → expect `403 Forbidden`

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Application mode | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/authentication` |
| `ACCESS_TOKEN_SECRET` | Secret for signing access JWTs | (long random string) |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh JWTs | (different long random string) |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | `7d` |
| `FRONTEND_URL` | Frontend URL for password reset links | `http://127.0.0.1:5173` |
| `EMAIL_HOST` | SMTP host | `sandbox.smtp.mailtrap.io` |
| `EMAIL_PORT` | SMTP port | `2525` |
| `EMAIL_USERNAME` | SMTP username (Mailtrap) | (from Mailtrap dashboard) |
| `EMAIL_PASSWORD` | SMTP password (Mailtrap) | (from Mailtrap dashboard) |
| `EMAIL_ADMIN` | Admin email address | `admin@swiftcart.com` |
| `EMAIL_SUPPORT` | Support email (sender address) | `support@swiftcart.com` |

---

## 🔑 Key Concepts Summary

| Concept | Description |
| --- | --- |
| **API Versioning (`/api/v1/`)** | URL-path versioning for backward-compatible API evolution |
| **Applied RBAC** | `protect` + `restrictTo()` middleware enforced on every route based on operation sensitivity |
| **Permissions Matrix** | Every endpoint mapped to required auth level and allowed roles |
| **Blanket protection** | `router.use(protect)` — every route below is authenticated (used for user routes) |
| **Per-route protection** | `protect` applied individually — allows public/private route mixing (used for course routes) |
| **`restrictTo(...roles)`** | Closure-based role guard using rest parameter + `Array.includes()` |
| **Authentication vs Authorization** | `401 Unauthorized` = "who are you?" vs `403 Forbidden` = "you can't do this" |
| **`deleteCourse`** | Admin-only hard delete via `Course.findByIdAndDelete()` — irreversible |
| **`getAllUsers`** | Admin-only user listing with `isActive` filter and `select("-__v")` |
| **Cookie `path` attribute** | Controls which request URLs the browser includes the cookie with |
| **Default cookie path** | Express `res.cookie()` defaults to `Path=/`; raw `Set-Cookie` defaults to request URL directory |
| **Path prefix matching** | `/api/v1/auth` matches `/api/v1/auth/login` but NOT `/api/v1/users/profile` |
| **Cookie jar** | Browser's internal store of all cookies, scoped by domain + path + flags |
| **`httpOnly: true`** | Cookie invisible to JavaScript — prevents XSS theft |
| **`sameSite: "strict"`** | Cookie never sent on cross-origin requests — CSRF protection |
