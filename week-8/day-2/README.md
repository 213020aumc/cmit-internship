# Authentication API — JWT Login & bcrypt Password Verification

A production-structured Express 5 REST API that extends user registration with a complete **login flow**. This project introduces **JSON Web Tokens (JWT)** for stateless authentication, a **Mongoose instance method** (`comparePassword`) for secure password verification using `bcrypt.compare()`, the **`select("+password")` override** to temporarily include hidden fields during login, and a **dedicated login Joi schema** with custom error messages.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Registration vs Login Flow](#registration-vs-login-flow)
- [User Model — Instance Methods](#-user-model--instance-methods)
  - [Schema Definition](#schema-definition)
  - [comparePassword Instance Method](#comparepassword-instance-method)
  - [Why Instance Methods?](#why-instance-methods)
- [Authentication Service — JWT Integration](#-authentication-service--jwt-integration)
  - [signToken Helper](#signtoken-helper)
  - [registerUser — Registration Flow](#registeruser--registration-flow)
  - [loginUser — Login Flow (4-Step Process)](#loginuser--login-flow-4-step-process)
  - [select("+password") Override](#selectpassword-override)
  - [Vague Error Messages — Security Pattern](#vague-error-messages--security-pattern)
- [Controller — Password Stripping Strategies](#-controller--password-stripping-strategies)
- [Joi Validation — Login Schema](#-joi-validation--login-schema)
- [JWT Concepts](#-jwt-concepts)
  - [Token Structure](#token-structure)
  - [Token Lifecycle](#token-lifecycle)
  - [Environment Configuration](#environment-configuration)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **JWT Token Generation** — `jwt.sign()` creates a stateless token containing the user's `_id` as the payload
- **bcrypt Password Verification** — `bcrypt.compare()` securely compares plaintext input against the stored hash
- **Mongoose Instance Method** — `comparePassword()` attached directly to the User schema via `userSchema.methods`
- **`select("+password")` Override** — Temporarily includes the hidden password field during login queries
- **Vague Login Errors** — `"Incorrect email or password"` — intentionally ambiguous to prevent user enumeration
- **Login Joi Schema** — Separate validation schema with custom error messages for login-specific fields
- **Password Stripping** — Two strategies: `delete` for registration, `= undefined` for login responses
- **Dual-Route Auth** — `POST /register` and `POST /login` on the same `/api/auth` namespace

---

## 🧰 Tech Stack

| Technology                  | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| **Node.js**                 | JavaScript runtime (v24+ recommended)               |
| **Express 5** (`^5.2.1`)   | Web framework with native async error propagation   |
| **Mongoose 9** (`^9.9.4`)  | MongoDB ODM — schemas, hooks, instance methods      |
| **bcryptjs** (`^3.0.3`)    | Password hashing and verification                   |
| **jsonwebtoken** (`^9.0.3`) | JWT token generation and verification              |
| **Joi** (`^18.2.5`)        | Declarative request body validation                 |
| **ES Modules**              | Native `"type": "module"` (`import`/`export`)       |
| **Nodemon**                 | Hot-reloading development server with `--env-file`  |

---

## 🏗 Architecture

### Directory Structure

```
authentication/
├── server.js                         # App entry — MongoDB connect-then-listen
├── .env                              # ★ JWT_SECRET + JWT_EXPIRES_IN added
├── package.json                      # Dependencies (bcryptjs, jsonwebtoken, joi)
│
├── models/
│   └── user.model.js                 # ★ comparePassword() instance method added
│
├── validations/
│   └── auth.validation.js            # ★ loginSchema added alongside registerSchema
│
├── middleware/
│   ├── validate.middleware.js        # Reusable Joi factory: validate(schema) → middleware
│   ├── logger.middleware.js          # ISO timestamp request logger
│   └── globalErrorHandler.js         # Centralized error handler (DB + JWT errors)
│
├── routes/
│   └── auth.routes.js                # ★ POST /login route added
│
├── controllers/
│   └── auth.controller.js            # ★ login() handler added — token in response
│
├── services/
│   └── auth.service.js               # ★ signToken() + loginUser() added
│
└── utils/
    └── appError.js                   # Custom AppError class
```

### Registration vs Login Flow

```
┌─────────────────────────────────────────────────────┐
│                  REGISTRATION                       │
│                                                     │
│  Client POST /api/auth/register                     │
│    │                                                │
│    ▼                                                │
│  validate(registerSchema) → Joi: name, email, pw    │
│    │                                                │
│    ▼                                                │
│  registerUser()                                     │
│    ├── findOne({ email })   → duplicate check       │
│    ├── User.create()        → triggers pre("save")  │
│    │     └── bcrypt.hash(pw, 12)                    │
│    ├── .toObject()                                  │
│    └── delete password      → strip from response   │
│    │                                                │
│    ▼                                                │
│  res.status(201) → { success, data }                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     LOGIN                           │
│                                                     │
│  Client POST /api/auth/login                        │
│    │                                                │
│    ▼                                                │
│  validate(loginSchema) → Joi: email, password       │
│    │                                                │
│    ▼                                                │
│  loginUser(email, password)                         │
│    ├── 1. Check email & password exist              │
│    ├── 2. findOne({ email }).select("+password")    │
│    ├── 3. user.comparePassword(pw, hash)            │
│    │       └── bcrypt.compare(plaintext, hash)      │
│    └── 4. signToken(user._id)                       │
│             └── jwt.sign({ id }, secret, { expiresIn })
│    │                                                │
│    ▼                                                │
│  Controller: user.password = undefined              │
│    │                                                │
│    ▼                                                │
│  res.status(200) → { success, token, data: { user } }
└─────────────────────────────────────────────────────┘
```

---

## 👤 User Model — Instance Methods

### Schema Definition

The user model from day-1 is extended with a new **instance method** for password comparison:

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
  },
  { timestamps: true },
);

// Pre-save hook — hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ★ NEW: Instance method — compare candidate password with stored hash
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const User = mongoose.model("User", userSchema);
```

---

### `comparePassword` Instance Method

```javascript
userSchema.methods.comparePassword = async function (
  candidatePassword, // Plaintext password from the login request
  userPassword,      // Hashed password from the database
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
```

| Parameter           | Value                        | Source                                    |
| ------------------- | ---------------------------- | ----------------------------------------- |
| `candidatePassword` | `"MyPass123"` (plaintext)    | From `req.body.password` (user input)     |
| `userPassword`      | `"$2a$12..."` (bcrypt hash)  | From `user.password` (database)           |
| **Returns**         | `true` or `false`            | `bcrypt.compare()` result                 |

**How `bcrypt.compare()` works internally:**

1. Extracts the salt from the stored hash (`$2a$12$<salt>...`)
2. Hashes the candidate password with the **same salt**
3. Compares the two hashes — if they match, the password is correct
4. Returns `true`/`false` — **never reveals the original password**

---

### Why Instance Methods?

| Approach | Declaration | Access | Use Case |
| --- | --- | --- | --- |
| **Instance method** | `schema.methods.name` | `user.comparePassword()` | Operates on a specific document (needs `this`) |
| **Static method** | `schema.statics.name` | `User.findByEmail()` | Operates on the model/collection |
| **Pre/Post hook** | `schema.pre("save")` | Automatic — runs on save | Side effects before/after operations |

> Instance methods are attached to individual documents. They're ideal for password comparison because each user has their own unique hash.

---

## 🔑 Authentication Service — JWT Integration

### `signToken` Helper

A private helper that wraps `jwt.sign()` with environment-configured secret and expiration:

```javascript
import jwt from "jsonwebtoken";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
```

| Parameter | Value | Purpose |
| --- | --- | --- |
| `{ id }` | `{ id: "64abc123..." }` | JWT **payload** — the user's MongoDB `_id` |
| `process.env.JWT_SECRET` | `"super-secure-..."` | Secret key for signing (HMAC SHA-256) |
| `expiresIn` | `"1d"` | Token expires in 1 day |

---

### `registerUser` — Registration Flow

```javascript
export const registerUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 400);
  }

  const newUser = await User.create(userData);
  const userResponse = newUser.toObject();
  delete userResponse.password;

  return userResponse;
};
```

> Registration does **not** return a token — the user must login separately to receive one.

---

### `loginUser` — Login Flow (4-Step Process)

```javascript
export const loginUser = async (email, password) => {
  // 1. Check if email and password exist
  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  // 2. Find the user and explicitly select the password field
  const user = await User.findOne({ email }).select("+password");

  // 3. Check if user exists && password is correct
  if (!user || !(await user.comparePassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  // 4. Generate the JWT
  const token = signToken(user._id);

  return { user, token };
};
```

| Step | What Happens | Why |
| --- | --- | --- |
| **1** | Guard — check inputs exist | Prevent unnecessary DB queries |
| **2** | `findOne().select("+password")` | Override `select: false` to include the hash |
| **3** | `comparePassword()` | bcrypt compares plaintext against hash |
| **4** | `signToken(user._id)` | Generate JWT with user ID as payload |

---

### `select("+password")` Override

By default, `select: false` on the password field excludes it from all queries. During login, we **must** temporarily include it to compare passwords:

```javascript
// Normal query — password excluded
const user = await User.findOne({ email });
console.log(user.password); // undefined

// Override — password included
const user = await User.findOne({ email }).select("+password");
console.log(user.password); // "$2a$12$..."
```

| Query | Password Included? | Use Case |
| --- | --- | --- |
| `User.find()` | ❌ No | Listing users |
| `User.findById(id)` | ❌ No | Getting user profile |
| `User.findOne({ email }).select("+password")` | ✅ Yes | Login only |

> The `+` prefix is required to **add** a field that was excluded by `select: false`. Without it, `.select("password")` would return **only** the password field.

---

### Vague Error Messages — Security Pattern

```javascript
if (!user || !(await user.comparePassword(password, user.password))) {
  throw new AppError("Incorrect email or password", 401);
}
```

Both "user not found" and "wrong password" return the **same error message**. This is an intentional security pattern:

| Approach | Risk |
| --- | --- |
| ❌ `"No account found with this email"` | Reveals which emails are registered (**user enumeration**) |
| ❌ `"Password is incorrect"` | Confirms the email exists |
| ✅ `"Incorrect email or password"` | Attacker cannot distinguish between invalid email vs wrong password |

---

## 🎮 Controller — Password Stripping Strategies

The controller uses **two different strategies** to remove the password from responses:

```javascript
// Registration — delete from plain object
export const register = async (req, res) => {
  const newUser = await authService.registerUser(req.body);
  // Password was already stripped in the service via .toObject() + delete
  res.status(201).json({ success: true, message: "Registration successful", data: newUser });
};

// Login — set to undefined on Mongoose document
export const login = async (req, res) => {
  const { user, token } = await authService.loginUser(email, password);
  user.password = undefined; // ★ Different strategy
  res.status(200).json({ success: true, message: "Login successful", token, data: { user } });
};
```

| Strategy | Used In | How It Works |
| --- | --- | --- |
| `.toObject()` + `delete` | Registration | Converts Mongoose doc to plain object, then removes the key |
| `= undefined` | Login | Sets the property to `undefined` — JSON serialization omits it |

> Both achieve the same result in the JSON response. `= undefined` is a shortcut that works because `JSON.stringify()` omits keys with `undefined` values.

---

## ✅ Joi Validation — Login Schema

A separate login schema validates only `email` and `password` with custom error messages:

```javascript
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[A-Za-z])(?=.*\\d)"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one letter and one number.",
    }),
});

// ★ NEW: Login schema — no name, no password strength
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required for login.",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required for login.",
  }),
});
```

| Schema | Fields Validated | Password Strength? | Custom Messages? |
| --- | --- | --- | --- |
| `registerSchema` | name, email, password | ✅ Yes (regex) | ✅ Pattern error |
| `loginSchema` | email, password | ❌ No | ✅ Email + required errors |

> **Why no password strength on login?** The user is submitting an **existing** password — if it passed strength validation at registration, there's no need to re-validate the format during login.

---

## 🪪 JWT Concepts

### Token Structure

A JWT consists of three Base64-encoded parts separated by dots:

```
eyJhbGci.eyJpZCI.SflKxw   →   HEADER.PAYLOAD.SIGNATURE
```

| Part | Content | Example |
| --- | --- | --- |
| **Header** | Algorithm + token type | `{ "alg": "HS256", "typ": "JWT" }` |
| **Payload** | User data (claims) | `{ "id": "64abc123...", "iat": 1693..., "exp": 1693... }` |
| **Signature** | HMAC-SHA256(header + payload, secret) | Verifies the token hasn't been tampered with |

---

### Token Lifecycle

```
1. User sends credentials  →  POST /api/auth/login
2. Server verifies password →  bcrypt.compare()
3. Server creates JWT       →  jwt.sign({ id }, secret, { expiresIn: "1d" })
4. Server sends token       →  { token: "eyJhbGci..." }
5. Client stores token      →  localStorage / cookie
6. Client sends token       →  Authorization: Bearer <token>  (future requests)
7. Server verifies token    →  jwt.verify(token, secret)  (protected routes - future)
```

---

### Environment Configuration

```env
JWT_SECRET=super-secure-and-ultra-long-secret-key-12345
JWT_EXPIRES_IN=1d
```

| Variable | Purpose | Security Notes |
| --- | --- | --- |
| `JWT_SECRET` | HMAC signing key | Must be long, random, and **never** committed to version control |
| `JWT_EXPIRES_IN` | Token expiration | `"1d"` = 1 day; shorter = more secure, longer = better UX |

---

## 📡 API Reference

### Auth Endpoints — `http://localhost:3000/api/auth`

| Method | Endpoint             | Description       | Validation       |
| ------ | -------------------- | ----------------- | ---------------- |
| `POST` | `/api/auth/register` | Register new user | `registerSchema` |
| `POST` | `/api/auth/login`    | Login & get JWT   | `loginSchema`    |

### Request & Response Examples

#### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alex", "email": "alex@example.com", "password": "MyPass123"}'
```

**Success (201 Created):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "_id": "64abc123...",
    "name": "Alex",
    "email": "alex@example.com",
    "createdAt": "2026-09-02T...",
    "updatedAt": "2026-09-02T..."
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "MyPass123"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "64abc123...",
      "name": "Alex",
      "email": "alex@example.com",
      "createdAt": "2026-09-02T...",
      "updatedAt": "2026-09-02T..."
    }
  }
}
```

> **Note:** The `token` field is returned at the top level, not inside `data`. The client saves this token for future authenticated requests.

#### Wrong Credentials (401)

```json
{
  "status": "fail",
  "message": "Incorrect email or password"
}
```

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

### 5. Test the Auth Flow

1. **Register** — `POST /api/auth/register` with name, email, password
2. **Login** — `POST /api/auth/login` with email, password
3. **Save the token** from the login response for future authenticated requests

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
| `JWT_SECRET`     | Secret key for signing JWT tokens               | (must be configured)             |
| `JWT_EXPIRES_IN` | Token expiration duration                       | `1d`                             |

---

## 🔑 Key Concepts Summary

| Concept                         | Description                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| **`jwt.sign(payload, secret)`** | Creates a signed JWT token with the user's `_id` as the payload                          |
| **`expiresIn: "1d"`**           | Token auto-expires after 1 day — client must re-authenticate                             |
| **`bcrypt.compare()`**          | Compares plaintext password against stored hash without revealing the original            |
| **Instance method**             | `schema.methods.name` — function attached to individual documents, accessed via `user.fn()` |
| **`select("+password")`**       | Overrides `select: false` to temporarily include the password field during login          |
| **Vague error messages**        | `"Incorrect email or password"` — prevents user enumeration attacks                      |
| **`user.password = undefined`** | Sets password to `undefined` — `JSON.stringify()` omits `undefined` values               |
| **Login vs Register schemas**   | Login skips password strength validation — existing passwords already passed it           |
| **JWT payload**                 | Contains `{ id, iat, exp }` — user ID, issued-at timestamp, and expiration timestamp     |
| **HMAC-SHA256 signature**       | Ensures the token hasn't been tampered with — only the server can verify it               |
| **Token lifecycle**             | Register → Login → Receive token → Store → Send on future requests → Server verifies     |
