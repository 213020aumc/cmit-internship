# Protected Routes — JWT Middleware, Password Change & Soft Delete

A production-structured Express 5 REST API that introduces **route protection** with JWT verification middleware. This project adds the `protect` middleware for guarding routes behind authentication, **`promisify(jwt.verify)`** for async token validation, **password change** using `.save()` to trigger the pre-save bcrypt hook, **soft delete** with an `isActive` field, and **Mongoose query middleware** (`pre(/^find/)`) to automatically exclude deactivated users from all queries.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Protected Request Flow](#protected-request-flow)
- [Protect Middleware — JWT Verification](#-protect-middleware--jwt-verification)
  - [The 5-Step Verification Process](#the-5-step-verification-process)
  - [promisify(jwt.verify) — Why Not jwt.verify Directly?](#promisifyjwtverify--why-not-jwtverify-directly)
  - [Bearer Token Extraction](#bearer-token-extraction)
  - [req.user — Attaching the Authenticated User](#requser--attaching-the-authenticated-user)
- [Route Protection Strategies](#-route-protection-strategies)
  - [Per-Route Protection](#per-route-protection)
  - [Blanket Protection with router.use()](#blanket-protection-with-routeruse)
- [Password Change — .save() vs .findByIdAndUpdate()](#-password-change--save-vs-findbyidandupdate)
- [Soft Delete — isActive Pattern](#-soft-delete--isactive-pattern)
  - [isActive Schema Field](#isactive-schema-field)
  - [Query Middleware — Automatic Filtering](#query-middleware--automatic-filtering)
  - [Deactivation Service](#deactivation-service)
  - [Hard Delete vs Soft Delete](#hard-delete-vs-soft-delete)
- [User Model — Complete Schema](#-user-model--complete-schema)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **`protect` Middleware** — 5-step JWT verification: extract token → verify signature → check user exists → attach `req.user` → call `next()`
- **`promisify(jwt.verify)`** — Converts callback-based `jwt.verify` to a Promise for `async`/`await` usage
- **Per-Route vs Blanket Protection** — Apply `protect` to individual routes or use `router.use(protect)` to guard all routes below
- **Password Change Flow** — Uses `.save()` instead of `.findByIdAndUpdate()` to trigger the `pre("save")` bcrypt hook
- **Soft Delete with `isActive`** — Deactivates users without deleting their data from the database
- **`pre(/^find/)` Query Middleware** — Automatically filters out inactive users from all `find*` queries
- **Dual Route Namespaces** — `/api/auth` (public: register/login) and `/api/users` (protected: profile/password/delete)

---

## 🧰 Tech Stack

| Technology                  | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| **Node.js**                 | JavaScript runtime (v24+ recommended)                |
| **Express 5** (`^5.2.1`)   | Web framework with native async error propagation    |
| **Mongoose 9** (`^9.9.4`)  | MongoDB ODM — schemas, hooks, query middleware       |
| **bcryptjs** (`^3.0.3`)    | Password hashing and verification                    |
| **jsonwebtoken** (`^9.0.3`) | JWT token generation and **verification**            |
| **Joi** (`^18.2.5`)        | Declarative request body validation                  |
| **ES Modules**              | Native `"type": "module"` (`import`/`export`)        |
| **Nodemon**                 | Hot-reloading development server with `--env-file`   |

---

## 🏗 Architecture

### Directory Structure

```
authentication/
├── server.js                         # ★ User routes mounted on /api/users
├── .env                              # JWT_SECRET + JWT_EXPIRES_IN
├── package.json                      # Dependencies
│
├── models/
│   └── user.model.js                 # ★ isActive field + pre(/^find/) query middleware
│
├── validations/
│   └── auth.validation.js            # registerSchema + loginSchema
│
├── middleware/
│   ├── auth.middleware.js            # ★ NEW: protect — JWT verification middleware
│   ├── validate.middleware.js        # Reusable Joi factory
│   ├── logger.middleware.js          # ISO timestamp request logger
│   └── globalErrorHandler.js         # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                # Public routes: register, login
│   └── user.routes.js                # ★ NEW: Protected routes: profile, password, delete
│
├── controllers/
│   ├── auth.controller.js            # register(), login(), getProfile()
│   └── user.controller.js            # ★ NEW: getProfile(), updatePassword(), deleteAccount()
│
├── services/
│   ├── auth.service.js               # registerUser(), loginUser()
│   └── user.service.js               # ★ NEW: changePassword(), deactivateUser()
│
└── utils/
    └── appError.js                   # Custom AppError class
```

### Protected Request Flow

```
Client GET /api/users/profile
  │
  │  Authorization: Bearer eyJhbGciOiJIUzI1NiI...
  │
  ▼
express.json() → requestLogger
  │
  ▼
protect middleware (auth.middleware.js)
  │
  ├── 1. Extract token from "Bearer <token>" header
  │
  ├── 2. promisify(jwt.verify)(token, secret)
  │       ├── ✅ Valid signature + not expired → decoded = { id, iat, exp }
  │       ├── ❌ Invalid signature → JsonWebTokenError → 401
  │       └── ❌ Expired → TokenExpiredError → 401
  │
  ├── 3. User.findById(decoded.id)
  │       ├── ✅ User found → continue
  │       └── ❌ User deleted → "no longer exists" → 401
  │
  ├── 4. req.user = currentUser  (attach to request)
  │
  └── 5. next()  →  route handler runs
                      │
                      ▼
              res.json({ success: true, data: req.user })
```

---

## 🛡️ Protect Middleware — JWT Verification

### The 5-Step Verification Process

```javascript
import jwt from "jsonwebtoken";
import { promisify } from "util";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";

export const protect = async (req, res, next) => {
  // 1. Read the Bearer token from the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Handle missing tokens
  if (!token) {
    throw new AppError("You are not logged in! Please provide a token.", 401);
  }

  // 2. Verify the token signature and expiration
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if the user still exists in the database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    throw new AppError(
      "The user belonging to this token no longer exists.",
      401,
    );
  }

  // 4. Attach the authenticated user to the request object
  req.user = currentUser;

  // 5. Grant access to the protected route
  next();
};
```

| Step | What Happens | Failure Response |
| --- | --- | --- |
| **1** | Extract token from `Authorization: Bearer <token>` header | `401` — "You are not logged in!" |
| **2** | `promisify(jwt.verify)` — verify signature + check expiration | `401` — "Invalid token" or "Token expired" |
| **3** | `User.findById(decoded.id)` — confirm user still exists | `401` — "User no longer exists" |
| **4** | `req.user = currentUser` — attach user to request | — |
| **5** | `next()` — pass control to the route handler | — |

---

### `promisify(jwt.verify)` — Why Not `jwt.verify` Directly?

`jwt.verify()` uses the older Node.js **callback pattern** (`(err, decoded) => {}`). The `promisify` utility from Node's `util` module converts it to return a Promise, enabling `async`/`await`:

```javascript
// ❌ Callback style (older pattern)
jwt.verify(token, secret, (err, decoded) => {
  if (err) throw new AppError("Invalid token", 401);
  // use decoded...
});

// ✅ Promisified (modern async/await)
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
// decoded = { id: "64abc123...", iat: 1693..., exp: 1693... }
```

| Approach | Style | Error Handling |
| --- | --- | --- |
| `jwt.verify(token, secret, callback)` | Callback | Manual `if (err)` check |
| `promisify(jwt.verify)(token, secret)` | `async`/`await` | Errors propagate to `try/catch` or Express error handler |

> **Why does this matter?** Express 5 automatically catches thrown errors in `async` middleware. By promisifying `jwt.verify`, invalid/expired tokens automatically propagate to `globalErrorHandler` where `JsonWebTokenError` and `TokenExpiredError` are normalized.

---

### Bearer Token Extraction

```javascript
// Header: "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
//                                 ↑ split(" ")[1]

let token;
if (
  req.headers.authorization &&
  req.headers.authorization.startsWith("Bearer")
) {
  token = req.headers.authorization.split(" ")[1];
}
```

| Header Value | Result |
| --- | --- |
| `"Bearer eyJhbGci..."` | `token = "eyJhbGci..."` ✅ |
| `"eyJhbGci..."` (no Bearer prefix) | `token = undefined` ❌ |
| Missing header | `token = undefined` ❌ |

---

### `req.user` — Attaching the Authenticated User

After verification, the full user document is attached to `req.user`. All downstream route handlers can access it without querying the database again:

```javascript
// In protect middleware:
req.user = currentUser;

// In any subsequent route handler:
export const getProfile = (req, res) => {
  res.status(200).json({ success: true, data: req.user });
  // No database query needed!
};
```

---

## 🔀 Route Protection Strategies

### Per-Route Protection

Apply `protect` to individual routes as middleware:

```javascript
// Only GET /profile requires a token
router.get("/profile", protect, getProfile);
```

### Blanket Protection with `router.use()`

Apply `protect` to **all routes** defined after the `router.use()` call:

```javascript
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// 1. Per-route protection
router.get("/profile", protect, getProfile);

// 2. Blanket protection — everything below requires a token
router.use(protect);

router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);
```

| Strategy | Syntax | When to Use |
| --- | --- | --- |
| **Per-route** | `router.get("/path", protect, handler)` | Mix of public and protected routes in the same file |
| **Blanket** | `router.use(protect)` then `router.get(...)` | All remaining routes require auth |

> **Order matters!** Routes defined **before** `router.use(protect)` are public. Routes defined **after** are automatically protected.

---

## 🔄 Password Change — `.save()` vs `.findByIdAndUpdate()`

### Change Password Service

```javascript
export const changePassword = async (userId, currentPassword, newPassword) => {
  // 1. Fetch the user and explicitly select the password
  const user = await User.findById(userId).select("+password");

  // 2. Verify the current password is correct
  if (!(await user.comparePassword(currentPassword, user.password))) {
    throw new AppError("Your current password is incorrect.", 401);
  }

  // 3. Update the password
  user.password = newPassword;

  // IMPORTANT: We use user.save() instead of User.findByIdAndUpdate()!
  // .save() triggers the Mongoose pre('save') hook we wrote earlier,
  // ensuring the new password is automatically hashed by bcrypt.
  await user.save();

  return true;
};
```

### Why `.save()` Instead of `.findByIdAndUpdate()`?

| Method | Triggers `pre("save")`? | Password Hashing? | Use Case |
| --- | --- | --- | --- |
| `user.save()` | ✅ Yes | ✅ Automatic (bcrypt hook runs) | Password changes, any field that needs hooks |
| `User.findByIdAndUpdate()` | ❌ No | ❌ Stores plaintext! | Simple updates where hooks aren't needed |

```javascript
// ✅ CORRECT — triggers pre("save") → password gets hashed
user.password = "NewPassword123";
await user.save();
// Stored: "$2a$12$..." (hashed)

// ❌ WRONG — bypasses pre("save") → password stored as plaintext!
await User.findByIdAndUpdate(id, { password: "NewPassword123" });
// Stored: "NewPassword123" (plaintext!)
```

> **Critical Rule:** Any operation that modifies the `password` field **must** use `.save()` to trigger the bcrypt pre-save hook. Using `findByIdAndUpdate()` bypasses all Mongoose middleware.

---

## 🗑️ Soft Delete — `isActive` Pattern

### `isActive` Schema Field

A Boolean field added to the user schema to track account status:

```javascript
isActive: {
  type: Boolean,
  default: true,
},
```

---

### Query Middleware — Automatic Filtering

A `pre(/^find/)` query middleware automatically excludes inactive users from **all** find queries:

```javascript
// Query Middleware: Exclude soft-deleted/inactive users from all find queries
userSchema.pre(/^find/, function () {
  // 'this' points to the current query
  this.find({ isActive: { $ne: false } });
});
```

| Concept | Explanation |
| --- | --- |
| `/^find/` | Regex matching all methods starting with "find": `find`, `findOne`, `findById`, `findOneAndUpdate`, etc. |
| `this` | In **query** middleware, `this` points to the current Query object (not the document) |
| `{ $ne: false }` | Matches documents where `isActive` is `true` **or** where `isActive` doesn't exist |

> **Why `$ne: false` instead of `{ isActive: true }`?** Documents created before the `isActive` field was added won't have the field at all. `$ne: false` matches both `true` and `undefined`, ensuring backward compatibility.

**Effect on queries:**

```javascript
// What you write:
const users = await User.find();

// What Mongoose actually executes:
const users = await User.find({ isActive: { $ne: false } });
// Inactive users are automatically excluded!
```

---

### Deactivation Service

```javascript
export const deactivateUser = async (userId) => {
  // "Soft Delete" — mark as inactive instead of erasing
  await User.findByIdAndUpdate(userId, { isActive: false });
};
```

---

### Hard Delete vs Soft Delete

| Approach | Operation | Data Preserved? | Reversible? | Use Case |
| --- | --- | --- | --- | --- |
| **Hard Delete** | `User.findByIdAndDelete(id)` | ❌ No | ❌ No | Test data, GDPR requests |
| **Soft Delete** | `User.findByIdAndUpdate(id, { isActive: false })` | ✅ Yes | ✅ Yes | Production accounts |

> **Why soft delete?** Hard-deleting a user could break relational references (Tasks, Courses, Orders that reference the user's `_id`). Soft delete preserves data integrity while hiding the user from queries.

---

## 👤 User Model — Complete Schema

```javascript
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email address."],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "A password is required for security."],
      minlength: [8, "Password must be at least 8 characters long."],
      select: false,
    },
    isActive: {          // ★ NEW
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ★ NEW: Query middleware — auto-filter inactive users
userSchema.pre(/^find/, function () {
  this.find({ isActive: { $ne: false } });
});

// Pre-save hook — hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method — compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const User = mongoose.model("User", userSchema);
```

| Middleware Type | Trigger | `this` Refers To | Purpose |
| --- | --- | --- | --- |
| `pre("save")` | `.save()`, `.create()` | The **document** being saved | Hash password before saving |
| `pre(/^find/)` | `.find()`, `.findOne()`, `.findById()`, etc. | The **query** object | Filter out inactive users |
| `methods.comparePassword` | `user.comparePassword()` | The **document** instance | Compare plaintext vs hash |

---

## 📡 API Reference

### Auth Endpoints (Public) — `http://localhost:4000/api/auth`

| Method | Endpoint             | Description       | Auth Required? | Validation       |
| ------ | -------------------- | ----------------- | -------------- | ---------------- |
| `POST` | `/api/auth/register` | Register new user | ❌ No          | `registerSchema` |
| `POST` | `/api/auth/login`    | Login & get JWT   | ❌ No          | `loginSchema`    |

### User Endpoints (Protected) — `http://localhost:4000/api/users`

| Method   | Endpoint                  | Description         | Auth Required? | Protection    |
| -------- | ------------------------- | ------------------- | -------------- | ------------- |
| `GET`    | `/api/users/profile`      | Get current user    | ✅ Bearer token | Per-route     |
| `PUT`    | `/api/users/update-password` | Change password  | ✅ Bearer token | Blanket       |
| `DELETE` | `/api/users/delete-account`  | Soft delete account | ✅ Bearer token | Blanket      |

### Request & Response Examples

#### Get Profile (Protected)

```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "name": "Alex",
    "email": "alex@example.com",
    "isActive": true,
    "createdAt": "2026-09-02T...",
    "updatedAt": "2026-09-02T..."
  }
}
```

**Missing Token (401):**

```json
{
  "status": "fail",
  "message": "You are not logged in! Please provide a token."
}
```

#### Change Password (Protected)

```bash
curl -X PUT http://localhost:4000/api/users/update-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "MyPass123", "newPassword": "NewPass456"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Password updated successfully. Please log in again with your new password."
}
```

**Wrong Current Password (401):**

```json
{
  "status": "fail",
  "message": "Your current password is incorrect."
}
```

#### Delete Account — Soft Delete (Protected)

```bash
curl -X DELETE http://localhost:4000/api/users/delete-account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Account deactivated successfully."
}
```

> After deactivation, the user will no longer appear in any `find` queries due to the `pre(/^find/)` query middleware. The data remains in the database for potential reactivation.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v24+ recommended)
- [MongoDB](https://www.mongodb.com/) (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster)
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
MONGO_URI=mongodb://localhost:27017/auth

JWT_SECRET=super-secure-and-ultra-long-secret-key-12345
JWT_EXPIRES_IN=1d
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test the Full Auth Flow

1. **Register** — `POST /api/auth/register`
2. **Login** — `POST /api/auth/login` → save the `token`
3. **Profile** — `GET /api/users/profile` with `Authorization: Bearer <token>`
4. **Change Password** — `PUT /api/users/update-password` with current + new passwords
5. **Delete Account** — `DELETE /api/users/delete-account` → user becomes invisible

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable         | Description                                     | Default                          |
| ---------------- | ----------------------------------------------- | -------------------------------- |
| `NODE_ENV`       | Application mode (`development` / `production`) | `development`                    |
| `MONGO_URI`      | MongoDB connection string                       | `mongodb://localhost:27017/auth` |
| `JWT_SECRET`     | Secret key for signing/verifying JWT tokens     | (must be configured)             |
| `JWT_EXPIRES_IN` | Token expiration duration                       | `1d`                             |

---

## 🔑 Key Concepts Summary

| Concept                       | Description                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| **`protect` middleware**      | 5-step JWT verification: extract → verify → user exists? → attach `req.user` → `next()`       |
| **`promisify(jwt.verify)`**   | Converts callback-based `jwt.verify` to Promise for `async`/`await` compatibility              |
| **Bearer token**              | `Authorization: Bearer <token>` — standard HTTP header format for JWT authentication           |
| **`req.user`**                | Authenticated user document attached by `protect` — available in all downstream handlers       |
| **Per-route vs blanket**      | `router.get("/path", protect, handler)` vs `router.use(protect)` for all routes below          |
| **`.save()` vs `findByIdAndUpdate()`** | `.save()` triggers `pre("save")` hooks; `findByIdAndUpdate()` bypasses them          |
| **Soft delete**               | Set `isActive: false` instead of deleting — preserves data integrity                           |
| **`pre(/^find/)`**            | Query middleware that runs before all `find*` operations — regex matches method names           |
| **`$ne: false`**              | Matches `true` and `undefined` — backward compatible with documents that lack the field        |
| **Document vs Query `this`**  | In `pre("save")`, `this` = document; in `pre(/^find/)`, `this` = query object                  |
| **`getProfile` optimization** | Returns `req.user` directly — no extra database query needed since `protect` already fetched it |
