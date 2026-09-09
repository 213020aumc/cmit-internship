# Dual Token Auth — Refresh Rotation, RBAC & Password Reset via Email

A production-structured Express 5 REST API that upgrades from a single JWT to a **dual token architecture** (short-lived Access Token + long-lived Refresh Token). This project introduces **refresh token rotation** with **reuse detection** for stolen-token defense, **HTTP-only cookies** for secure refresh token storage, **role-based access control (RBAC)** with `restrictTo()` middleware, a complete **forgot password / reset password** flow using **Nodemailer** + **crypto tokens**, centralized **utility modules** (`token.js`, `cookie.js`, `password.js`, `email.js`, `responseHandler.js`), and a **Token model** with MongoDB **TTL indexes** for automatic token cleanup.

---

## Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Visual Guide: Traditional Session vs Modern Token Flow](#visual-guide-traditional-session-vs-modern-token-flow)
  - [Dual Token Authentication Flow](#dual-token-authentication-flow)
- [Dual Token Architecture — Access + Refresh](#-dual-token-architecture--access--refresh)
  - [Visual Flowchart: Access vs Refresh Tokens](#visual-flowchart-access-vs-refresh-tokens)
  - [Why Two Tokens?](#why-two-tokens)
  - [Token Comparison Table](#token-comparison-table)
  - [signAccessToken() and signRefreshToken()](#signaccesstoken-and-signrefreshtoken)
  - [createAuthSession() — DRY Session Creator](#createauthsession--dry-session-creator)
- [Token Model — MongoDB with TTL Index](#-token-model--mongodb-with-ttl-index)
  - [Schema Definition](#schema-definition)
  - [TTL Index — expires: 0](#ttl-index--expires-0)
  - [Token Types](#token-types)
- [Refresh Token Rotation & Reuse Detection](#-refresh-token-rotation--reuse-detection)
  - [Visual Guide: Refresh Token Lifecycle & Rotation](#visual-guide-refresh-token-lifecycle--rotation)
  - [The Rotation Flow](#the-rotation-flow)
  - [Reuse Detection — Stolen Token Defense](#reuse-detection--stolen-token-defense)
  - [refreshAccess() Service](#refreshaccess-service)
- [HTTP-Only Cookies — Secure Refresh Token Storage](#-http-only-cookies--secure-refresh-token-storage)
  - [Visual Comparison: Token Storage Options](#visual-comparison-token-storage-options)
  - [Why Cookies Instead of localStorage?](#why-cookies-instead-of-localstorage)
  - [cookie.js — Centralized Cookie Helpers](#cookiejs--centralized-cookie-helpers)
  - [cookie-parser Middleware](#cookie-parser-middleware)
  - [Cookie Security Flags](#cookie-security-flags)
- [RBAC — Role-Based Access Control](#-rbac--role-based-access-control)
  - [Visual Cheat Sheet: Express.js RBAC Middleware](#visual-cheat-sheet-expressjs-rbac-middleware)
  - [restrictTo() Middleware](#restrictto-middleware)
  - [How protect + restrictTo Work Together](#how-protect--restrictto-work-together)
  - [User Model — role Field](#user-model--role-field)
- [Forgot Password / Reset Password Flow](#-forgot-password--reset-password-flow)
  - [The Complete Flow](#the-complete-flow)
  - [Step 1: Generate Reset Token](#step-1-generate-reset-token)
  - [Step 2: Send Email with Nodemailer](#step-2-send-email-with-nodemailer)
  - [Step 3: Reset Password with Hashed Token Lookup](#step-3-reset-password-with-hashed-token-lookup)
  - [Why Hash the Reset Token?](#why-hash-the-reset-token)
- [Centralized Utility Modules](#-centralized-utility-modules)
  - [token.js — Token Generation & Hashing](#tokenjs--token-generation--hashing)
  - [password.js — Explicit Hashing](#passwordjs--explicit-hashing)
  - [email.js — Nodemailer Transport](#emailjs--nodemailer-transport)
  - [responseHandler.js — Standardized JSON Responses](#responsehandlerjs--standardized-json-responses)
  - [cookie.js — HTTP-Only Cookie Management](#cookiejs--http-only-cookie-management)
- [User Model — Complete Schema](#-user-model--complete-schema)
- [Login Flow — Dual Token Issuance](#-login-flow--dual-token-issuance)
- [Logout Flow — Token + Cookie Cleanup](#-logout-flow--token--cookie-cleanup)
- [Password Change — Session Rotation](#-password-change--session-rotation)
- [API Reference](#-api-reference)
- [Modern Authentication Ecosystem & Industry Paradigms](#-modern-authentication-ecosystem--industry-paradigms)
  - [OAuth 2.0 & OpenID Connect (OIDC)](#oauth-20--openid-connect-oidc)
  - [API Keys Architecture](#api-keys-architecture)
  - [Passwordless Authentication (Magic Links & OTP)](#passwordless-authentication-magic-links--otp)
  - [Passkeys & WebAuthn (FIDO2)](#passkeys--webauthn-fido2)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🚀 Key Features

- **Dual Token Architecture** — Short-lived Access Token (15m) sent in JSON + long-lived Refresh Token (7d) stored in HTTP-only cookie
- **Refresh Token Rotation** — Every `/refresh` call issues a new pair and invalidates the old refresh token
- **Reuse Detection** — If a rotated-out refresh token is replayed, all sessions for that user are revoked
- **HTTP-Only Cookies** — Refresh token invisible to JavaScript (`document.cookie` cannot read it) via `cookie-parser`
- **`restrictTo()` RBAC Middleware** — Closure-based role guard: `restrictTo("admin", "instructor")`
- **Forgot/Reset Password** — Crypto random token → SHA-256 hash in DB → Nodemailer email → token validation → password update
- **Token Model with TTL** — MongoDB `expires: 0` TTL index auto-deletes tokens when `expiresAt` is reached
- **Centralized Utilities** — `token.js`, `cookie.js`, `password.js`, `email.js`, `responseHandler.js` eliminate duplication
- **Explicit Password Hashing** — `hashPassword()` utility replaces pre-save hook for full control over when hashing occurs

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
├── server.js                          # ★ cookie-parser + course routes mounted
├── .env                               # Access/Refresh secrets + email config
├── package.json                       # ★ NEW: cookie-parser, nodemailer, crypto
│
├── models/
│   ├── user.model.js                  # ★ role + rating fields, no pre-save hook
│   ├── token.model.js                 # ★ NEW: Refresh + reset_password tokens with TTL
│   ├── course.model.js                # Course schema with instructorId ref
│   └── instructor.model.js            # Instructor schema
│
├── validations/
│   ├── auth.validation.js             # ★ NEW: forgotPasswordSchema + resetPasswordSchema
│   └── course.validation.js           # createCourseSchema + updateCourseSchema
│
├── middleware/
│   ├── auth.middleware.js             # ★ protect (ACCESS_TOKEN_SECRET) + restrictTo()
│   ├── validate.middleware.js         # Reusable Joi factory
│   ├── logger.middleware.js           # ISO timestamp request logger
│   └── globalErrorHandler.js          # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                 # ★ NEW: /refresh, /logout, /forgot-password, /reset-password
│   ├── user.routes.js                 # Protected: profile, password, delete
│   └── course.routes.js               # CRUD + aggregation endpoints
│
├── controllers/
│   ├── auth.controller.js             # ★ NEW: refresh(), logout(), forgotPassword(), resetPassword()
│   ├── user.controller.js             # ★ Session rotation on password change
│   └── course.controller.js           # CRUD + aggregation handlers
│
├── services/
│   ├── auth.service.js                # ★ NEW: refreshAccess(), logoutUser(), generateResetToken(), resetPassword()
│   ├── user.service.js                # ★ Session revocation on password change + deactivation
│   └── course.service.js              # CRUD + aggregation pipelines
│
└── utils/
    ├── appError.js                    # Custom AppError class
    ├── token.js                       # ★ NEW: signAccessToken, signRefreshToken, createAuthSession, hashToken
    ├── cookie.js                      # ★ NEW: setRefreshTokenCookie, clearRefreshTokenCookie
    ├── password.js                    # ★ NEW: hashPassword, comparePassword
    ├── email.js                       # ★ NEW: sendEmail (Nodemailer transport)
    └── responseHandler.js             # ★ NEW: sendResponse (standardized JSON)
```

### Visual Guide: Traditional Session vs Modern Token Flow

Before understanding the dual-token model, it helps to understand why the industry moved away from monolithic server-side session IDs (stored in server memory/Redis) to token-based authentication:

![Traditional Session-Based Authentication Flow](Traditional%20Session-Based%20Authentication%20Flow.png)

### Dual Token Authentication Flow

```
Client POST /api/auth/login
  │
  │  { email, password }
  │
  ▼
authService.loginUser()
  │
  ├── 1. Verify credentials (email + bcrypt compare)
  │
  ├── 2. createAuthSession(user._id)
  │       ├── signAccessToken(id)  → JWT signed with ACCESS_TOKEN_SECRET  (15m)
  │       ├── signRefreshToken(id) → JWT signed with REFRESH_TOKEN_SECRET (7d)
  │       └── Token.create({ userId, token: refreshToken, type: "refresh", expiresAt })
  │
  ├── 3. setRefreshTokenCookie(res, refreshToken)
  │       └── res.cookie("jwt_refresh", token, { httpOnly, secure, sameSite, maxAge })
  │
  └── 4. res.json({ accessToken })  ← JSON body (short-lived, stored in memory)
         Set-Cookie: jwt_refresh=...  ← HTTP header (long-lived, invisible to JS)

────────────────────────────────────────────────────────────────

Client GET /api/users/profile
  │
  │  Authorization: Bearer <accessToken>     (from memory)
  │  Cookie: jwt_refresh=<refreshToken>      (auto-sent by browser)
  │
  ▼
protect middleware
  │  Verifies accessToken with ACCESS_TOKEN_SECRET
  │
  ▼
Route handler → res.json(req.user)

────────────────────────────────────────────────────────────────

Client POST /api/auth/refresh       (when accessToken expires)
  │
  │  Cookie: jwt_refresh=<oldRefreshToken>    (auto-sent)
  │
  ▼
authService.refreshAccess()
  │
  ├── 1. jwt.verify(oldRefreshToken, REFRESH_TOKEN_SECRET)
  ├── 2. Token.findOne({ token: oldRefreshToken, type: "refresh" })
  │       └── ❌ Not found → REUSE ATTACK! → Revoke ALL sessions
  ├── 3. Token.findByIdAndDelete(oldToken)  ← Invalidate used token
  ├── 4. createAuthSession(user._id)        ← New pair
  └── 5. setRefreshTokenCookie(res, newRefreshToken)
         res.json({ accessToken: newAccessToken })
```

---

## 🔐 Dual Token Architecture — Access + Refresh

### Visual Flowchart: Access vs Refresh Tokens

The following flowchart visualizes the complete lifecycle distinction between short-lived Access Tokens and long-lived Refresh Tokens:

![Authentication Token Flowchart (Access Vs Refresh Token)](Authentication%20Token%20Flowchart%20(Access%20Vs%20Refresh%20Token).png)

### Why Two Tokens?

A single long-lived JWT is a security risk — if stolen, the attacker has access for the entire lifetime. The dual token pattern separates **authorization** from **session persistence**:

| Concern | Single JWT | Dual Token |
| --- | --- | --- |
| Token stolen? | Attacker has access for hours/days | Access token expires in 15 minutes |
| How to extend session? | Issue new JWT (requires re-login) | Silent refresh via cookie |
| Where is the token stored? | localStorage (XSS-vulnerable) | Access in memory, refresh in HTTP-only cookie |
| Can server revoke access? | ❌ No (stateless) | ✅ Yes (delete refresh token from DB) |

### Token Comparison Table

| Property | Access Token | Refresh Token |
| --- | --- | --- |
| **Secret** | `ACCESS_TOKEN_SECRET` | `REFRESH_TOKEN_SECRET` |
| **Lifetime** | `15m` (short) | `7d` (long) |
| **Storage (Client)** | JavaScript memory / state | HTTP-only cookie |
| **Storage (Server)** | Stateless (not stored) | Token collection in MongoDB |
| **Purpose** | Authorize API requests | Silently obtain new access tokens |
| **Sent via** | `Authorization: Bearer <token>` header | `Cookie: jwt_refresh=<token>` (automatic) |
| **Visible to JS?** | ✅ Yes | ❌ No (`httpOnly: true`) |

### `signAccessToken()` and `signRefreshToken()`

```javascript
// utils/token.js
import jwt from "jsonwebtoken";

export const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,   // "15m"
  });

export const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,   // "7d"
  });
```

> **Critical:** Each token uses a **different secret**. If only one secret existed, an attacker with a refresh token could forge access tokens.

### `createAuthSession()` — DRY Session Creator

```javascript
// utils/token.js
export const createAuthSession = async (userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  await Token.create({
    userId,
    token: refreshToken,
    type: "refresh",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};
```

| Where It's Called | Context |
| --- | --- |
| `loginUser()` | After credential verification |
| `refreshAccess()` | After rotating out the old refresh token |
| `changePassword()` | After invalidating all previous sessions |

> **Why centralize?** Without `createAuthSession()`, the 3 lines of token-signing + DB-storage logic were duplicated in `loginUser`, `refreshAccess`, and `changePassword`. One change (e.g., adding a `deviceId` field) would require editing 3 places.

---

## 🗃️ Token Model — MongoDB with TTL Index

### Schema Definition

```javascript
import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,       // Fast lookups by user
    },
    token: {
      type: String,
      required: true,
      index: true,       // Fast lookups by token value
    },
    type: {
      type: String,
      enum: ["refresh", "reset_password"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,         // ★ MongoDB TTL index
    },
  },
  { timestamps: true },
);

export const Token = mongoose.model("Token", tokenSchema);
```

### TTL Index — `expires: 0`

```javascript
expiresAt: {
  type: Date,
  required: true,
  expires: 0,   // MongoDB auto-deletes when expiresAt ≤ now
}
```

| Setting | Behavior |
| --- | --- |
| `expires: 0` | Document is auto-deleted when `expiresAt` timestamp is reached |
| `expires: 3600` | Document is auto-deleted 3600 seconds **after** `expiresAt` |
| No `expires` | Document stays forever (manual cleanup required) |

> **How it works:** MongoDB runs a background thread every ~60 seconds that scans for documents where `expiresAt` ≤ `Date.now()` and removes them. This means expired tokens are cleaned up automatically — no cron job needed.

### Token Types

| Type | Purpose | Lifetime | Storage |
| --- | --- | --- | --- |
| `"refresh"` | Refresh token rotation | 7 days | JWT string (signed) |
| `"reset_password"` | Forgot password flow | 10 minutes | SHA-256 hash of random bytes |

---

## 🔄 Refresh Token Rotation & Reuse Detection

### Visual Guide: Refresh Token Lifecycle & Rotation

The following infographic illustrates end-to-end refresh token storage, issuance, expiration, rotation cycles, and malicious replay detection:

![Refresh Token Storage and Flow Guide](Refresh%20Token%20Storage%20and%20Flow%20Guide.png)

### The Rotation Flow

```
            ┌─────────────────────────────────────────────┐
            │          REFRESH TOKEN ROTATION              │
            └─────────────────────────────────────────────┘

  Request:  POST /api/auth/refresh
            Cookie: jwt_refresh = RT_old

  Step 1:   jwt.verify(RT_old, REFRESH_TOKEN_SECRET) → decoded.id
  Step 2:   Token.findOne({ token: RT_old, type: "refresh" })
            ├── ✅ Found → Continue (legitimate use)
            └── ❌ Not found → REUSE DETECTED → Revoke ALL sessions!
  Step 3:   Token.findByIdAndDelete(existingToken._id)  ← Delete RT_old
  Step 4:   createAuthSession(user._id)                 ← Generate RT_new + AT_new
  Step 5:   setRefreshTokenCookie(res, RT_new)          ← Set new cookie
            res.json({ accessToken: AT_new })           ← Send new access token

  Result:   RT_old → invalidated (deleted from DB)
            RT_new → stored in DB + cookie
            AT_new → sent in JSON response
```

### Reuse Detection — Stolen Token Defense

The most important security feature of rotation. Consider this attack scenario:

```
Timeline:
  T1: User logs in     → gets RT₁
  T2: Attacker steals RT₁
  T3: User refreshes   → RT₁ deleted, gets RT₂  (legitimate)
  T4: Attacker uses RT₁ → jwt.verify passes (signature valid)
                         → Token.findOne fails (RT₁ already deleted!)
                         → REUSE DETECTED!
                         → Token.deleteMany({ userId }) → ALL sessions revoked
                         → User must re-login on ALL devices
```

```javascript
// Reuse detection in refreshAccess()
if (!existingToken) {
  // Token is cryptographically valid but NOT in DB
  // → It was already rotated out → Someone is replaying it!
  await Token.deleteMany({ userId: decoded.id, type: "refresh" });
  throw new AppError(
    "Invalid refresh token reused! All sessions have been logged out for security.",
    403,
  );
}
```

| Scenario | Token in DB? | Signature Valid? | Result |
| --- | --- | --- | --- |
| Normal refresh | ✅ Yes | ✅ Yes | New pair issued, old deleted |
| Expired token | — | ❌ No | `jwt.verify` throws `TokenExpiredError` |
| Forged token | — | ❌ No | `jwt.verify` throws `JsonWebTokenError` |
| **Stolen/replayed token** | **❌ No** | **✅ Yes** | **REUSE → All sessions revoked** |

### `refreshAccess()` Service

```javascript
export const refreshAccess = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError("No refresh token provided", 401);
  }

  // 1. Verify the refresh token cryptographically
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 403);
  }

  // 2. Check if this exact token exists in the Token collection
  const existingToken = await Token.findOne({
    userId: decoded.id,
    token: incomingRefreshToken,
    type: "refresh",
  });

  // 3. REUSE DETECTION
  if (!existingToken) {
    await Token.deleteMany({ userId: decoded.id, type: "refresh" });
    throw new AppError(
      "Invalid refresh token reused! All sessions have been logged out for security.",
      403,
    );
  }

  // 4. ROTATION: Delete the used refresh token
  await Token.findByIdAndDelete(existingToken._id);

  // 5. Ensure active user still exists
  const user = await User.findOne({
    _id: decoded.id,
    isActive: { $ne: false },
  });
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
  }

  // 6. DRY Centralized session creator
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await createAuthSession(user._id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
```

---

## 🍪 HTTP-Only Cookies — Secure Refresh Token Storage

### Visual Comparison: Token Storage Options

The diagram below contrasts client storage mechanisms (localStorage, sessionStorage, in-memory, and HTTP-only cookies) in terms of persistence and threat exposure:

![Refresh Token Storage](Refresh%20Token%20Storage.png)

### Why Cookies Instead of `localStorage`?

| Storage | XSS Vulnerable? | CSRF Vulnerable? | JS Accessible? |
| --- | --- | --- | --- |
| `localStorage` | ✅ **Yes** — Any injected script reads it | ❌ No | ✅ `window.localStorage.getItem()` |
| **HTTP-only Cookie** | **❌ No** — Invisible to JS | ✅ Mitigated with `sameSite: "strict"` | ❌ `document.cookie` returns nothing |

> **Key insight:** An XSS attack (`<script>fetch('/steal?token=' + localStorage.getItem('refresh'))</script>`) can steal tokens from `localStorage`. HTTP-only cookies are invisible to JavaScript — the browser sends them automatically but scripts cannot read them.

### `cookie.js` — Centralized Cookie Helpers

```javascript
export const setRefreshTokenCookie = (res, token) => {
  res.cookie("jwt_refresh", token, {
    httpOnly: true,                                    // Invisible to JS
    secure: process.env.NODE_ENV === "production",     // HTTPS only in prod
    sameSite: "strict",                                // No cross-site sending
    maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7 days in ms
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("jwt_refresh");
};
```

### `cookie-parser` Middleware

```javascript
// server.js
import cookieParser from "cookie-parser";
app.use(cookieParser());
```

Without `cookie-parser`, `req.cookies` is `undefined`. After adding it:

```javascript
// In any route handler:
const refreshToken = req.cookies?.jwt_refresh;
// → "eyJhbGciOiJIUzI1NiI..."
```

| Without `cookie-parser` | With `cookie-parser` |
| --- | --- |
| `req.cookies` → `undefined` | `req.cookies` → `{ jwt_refresh: "eyJ..." }` |
| Must manually parse `Cookie` header | Automatic parsing into key-value object |

### Cookie Security Flags

| Flag | Value | Purpose |
| --- | --- | --- |
| `httpOnly` | `true` | Cookie invisible to `document.cookie` — prevents XSS theft |
| `secure` | `true` in production | Cookie only sent over HTTPS — prevents network sniffing |
| `sameSite` | `"strict"` | Cookie never sent on cross-origin requests — prevents CSRF |
| `maxAge` | `604800000` (7 days) | Cookie auto-expires after 7 days — matches refresh token lifetime |

---

## 🛂 RBAC — Role-Based Access Control

### Visual Cheat Sheet: Express.js RBAC Middleware

The following visual cheat sheet breaks down how `protect` (authentication) and `restrictTo` (authorization) stack sequentially to secure Express route pipelines:

![RBAC Middleware Express.js Cheat Sheet](RBAC%20Middleware%20Express.js%20Cheat%20Sheet%20(protect%20%26%20restrictTo).png)

### `restrictTo()` Middleware

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

    // User is authorized, grant access
    next();
  };
};
```

| Concept | Explanation |
| --- | --- |
| `...roles` | Rest parameter — collects all arguments into an array: `restrictTo("admin", "instructor")` → `roles = ["admin", "instructor"]` |
| Closure | The inner function "remembers" the `roles` array from the outer scope even after `restrictTo()` returns |
| `req.user.role` | Set by `protect` middleware — the authenticated user's role from the database |
| `403 Forbidden` | User is authenticated (has a valid token) but **not authorized** (wrong role) |

### How `protect` + `restrictTo` Work Together

```javascript
// Example: Only admins can delete courses
router.delete(
  "/:id",
  protect,                           // Step 1: Verify JWT → attach req.user
  restrictTo("admin"),               // Step 2: Check req.user.role === "admin"
  deleteCourse                       // Step 3: Handler runs only if both pass
);

// Example: Admins and instructors can create courses
router.post(
  "/",
  protect,
  restrictTo("admin", "instructor"), // Either role passes
  createCourse
);
```

```
Request with valid token (role: "user")
  │
  ▼
protect middleware
  │  ✅ Token valid → req.user = { role: "user", ... }
  │
  ▼
restrictTo("admin", "instructor")
  │  roles = ["admin", "instructor"]
  │  roles.includes("user") → false
  │
  ▼
  ❌ 403: "You do not have permission to perform this action"
```

### User Model — `role` Field

```javascript
role: {
  type: String,
  enum: ["user", "instructor", "admin"],
  default: "user",
},
```

| Role | Description | Default? |
| --- | --- | --- |
| `user` | Standard user — can view profile, change password | ✅ Yes |
| `instructor` | Can create and manage courses | ❌ |
| `admin` | Full access — can manage users, courses, and system | ❌ |

---

## 📧 Forgot Password / Reset Password Flow

### The Complete Flow

```
Step 1: POST /api/auth/forgot-password  { email: "user@example.com" }
  │
  ├── Generate 32-byte random token (plaintext)
  ├── SHA-256 hash → store hashed version in Token collection (10 min TTL)
  ├── Build reset URL: http://127.0.0.1:5173/reset-password/<plaintext-token>
  └── Send email via Nodemailer (Mailtrap sandbox in dev)

Step 2: User clicks link in email → Frontend captures token from URL

Step 3: POST /api/auth/reset-password/:token  { password: "NewPass123" }
  │
  ├── SHA-256 hash the incoming URL token
  ├── Token.findOne({ token: hashedToken, type: "reset_password", expiresAt: { $gt: now } })
  │     ├── ✅ Found + not expired → Continue
  │     └── ❌ Not found or expired → "Token is invalid or has expired"
  ├── User.findOne({ _id: tokenDoc.userId, isActive: { $ne: false } })
  ├── user.password = hashPassword(newPassword) → user.save()
  └── Token.deleteMany({ userId }) → Invalidate ALL tokens (reset + refresh)
```

### Step 1: Generate Reset Token

```javascript
export const generateResetToken = async (email, reqOrigin) => {
  const user = await User.findOne({ email, isActive: { $ne: false } });
  if (!user) {
    throw new AppError("There is no user with that email address.", 404);
  }

  // Generate plain reset token & hash
  const rawResetToken = generateRandomToken(32);   // 64-char hex string
  const hashedResetToken = hashToken(rawResetToken); // SHA-256 digest

  // Delete any existing reset tokens for this user
  await Token.deleteMany({ userId: user._id, type: "reset_password" });

  // Store hashed token in Token collection (10 minutes expiry)
  await Token.create({
    userId: user._id,
    token: hashedResetToken,
    type: "reset_password",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const baseURL = process.env.FRONTEND_URL || reqOrigin;
  const resetURL = `${baseURL}/reset-password/${rawResetToken}`;

  const message = `Forgot your password? Click the link below:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset link (valid for 10 min)",
      message,
    });
  } catch (error) {
    // If email fails, clean up the token
    await Token.deleteMany({ userId: user._id, type: "reset_password" });
    throw new AppError("There was an error sending the email. Try again later!", 500);
  }
};
```

| Concept | Explanation |
| --- | --- |
| `generateRandomToken(32)` | `crypto.randomBytes(32).toString("hex")` → 64-character hex string |
| `hashToken(rawResetToken)` | `crypto.createHash("sha256").update(token).digest("hex")` |
| Only hash stored in DB | If database is compromised, attacker gets hashes — cannot reconstruct the URL token |
| 10-minute TTL | `Token.create({ expiresAt: Date.now() + 10 * 60 * 1000 })` |
| `deleteMany` before create | Ensures only one active reset token per user at a time |
| Email failure cleanup | If Nodemailer throws, the token is deleted so the user can retry |

### Step 2: Send Email with Nodemailer

```javascript
// utils/email.js
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,        // sandbox.smtp.mailtrap.io
    port: process.env.EMAIL_PORT,        // 2525
    auth: {
      user: process.env.EMAIL_USERNAME,  // Mailtrap credentials
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `Your App Name <${process.env.EMAIL_SUPPORT}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
```

> **Mailtrap** is a sandbox SMTP service that captures outgoing emails without actually delivering them. Perfect for development — you can inspect the email in the Mailtrap dashboard without spamming real inboxes.

### Step 3: Reset Password with Hashed Token Lookup

```javascript
export const resetPassword = async (token, newPassword) => {
  // 1. Hash the incoming token (same algorithm used when storing)
  const hashedToken = hashToken(token);

  // 2. Find matching valid reset token from Token collection
  const tokenDoc = await Token.findOne({
    token: hashedToken,
    type: "reset_password",
    expiresAt: { $gt: Date.now() },   // Not expired
  });

  if (!tokenDoc) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  // 3. Find the user
  const user = await User.findOne({
    _id: tokenDoc.userId,
    isActive: { $ne: false },
  });

  // 4. Update the password with explicit hashing
  user.password = await hashPassword(newPassword);
  await user.save();

  // 5. Invalidate ALL tokens (reset + refresh) — force re-login everywhere
  await Token.deleteMany({ userId: user._id });
};
```

### Why Hash the Reset Token?

```
Database stores:  a3f2b8c1d4e5... (SHA-256 hash)
Email contains:   7e9f1a2b3c4d... (plaintext token)

If database is compromised:
  ❌ Attacker has hash → cannot reverse to get plaintext
  ❌ Cannot construct the reset URL
  ✅ User's password reset flow remains secure

When user clicks the link:
  1. Server receives plaintext token from URL
  2. Server hashes it: SHA-256("7e9f1a2b3c4d...") → "a3f2b8c1d4e5..."
  3. Server queries: Token.findOne({ token: "a3f2b8c1d4e5..." })
  4. Match found → reset proceeds
```

| Approach | DB Compromise Impact | Token in URL |
| --- | --- | --- |
| Store plaintext in DB | ❌ Attacker can use token directly | Plaintext |
| **Store SHA-256 hash in DB** | **✅ Hash is useless without plaintext** | Plaintext (only in email) |

---

## 🧩 Centralized Utility Modules

### `token.js` — Token Generation & Hashing

```javascript
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Token } from "../models/token.model.js";

// Random token for password reset
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

// SHA-256 hash for secure storage
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// JWT signing
export const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });

export const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });

// DRY session creator
export const createAuthSession = async (userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await Token.create({
    userId,
    token: refreshToken,
    type: "refresh",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { accessToken, refreshToken };
};
```

### `password.js` — Explicit Hashing

```javascript
import bcrypt from "bcryptjs";

export const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};
```

> **Why explicit hashing instead of a pre-save hook?** In Day 3, password hashing was done via `pre("save")`. This project removes the hook and uses explicit `hashPassword()` calls. This gives **full control** over when hashing occurs — important because `user.save()` is also called for non-password fields, and the `isModified("password")` check in hooks can be error-prone when the field is explicitly set.

### `email.js` — Nodemailer Transport

```javascript
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `Your App Name <${process.env.EMAIL_SUPPORT}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
```

### `responseHandler.js` — Standardized JSON Responses

```javascript
export const sendResponse = (
  res,
  status,
  data = null,
  message = "",
  extra = {},
) => {
  res.status(status).json({
    success: true,
    message,
    data,
    ...extra,   // Spread additional fields like { accessToken }
  });
};
```

| Parameter | Purpose | Example |
| --- | --- | --- |
| `res` | Express response object | — |
| `status` | HTTP status code | `200`, `201` |
| `data` | Primary response payload | `user`, `course`, `null` |
| `message` | Human-readable description | `"Login successful"` |
| `extra` | Additional top-level fields (spread) | `{ accessToken: "eyJ..." }` |

**Usage:**

```javascript
// Login — sends accessToken as a top-level field
sendResponse(res, 200, { user }, "Login successful", { accessToken });

// Output:
// { success: true, message: "Login successful", data: { user }, accessToken: "eyJ..." }
```

### `cookie.js` — HTTP-Only Cookie Management

```javascript
export const setRefreshTokenCookie = (res, token) => {
  res.cookie("jwt_refresh", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("jwt_refresh");
};
```

---

## 👤 User Model — Complete Schema

```javascript
import mongoose from "mongoose";

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
      select: false,            // Never returned in queries by default
    },
    role: {                     // ★ NEW: RBAC field
      type: String,
      enum: ["user", "instructor", "admin"],
      default: "user",
    },
    rating: {                   // ★ NEW: Instructor rating
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
```

> **No pre-save hook.** Unlike Day 3, password hashing is handled explicitly via `hashPassword()` in the service layer. The `comparePassword` instance method is also replaced by the standalone `comparePassword()` utility in `password.js`.

---

## 🔑 Login Flow — Dual Token Issuance

```javascript
// services/auth.service.js
export const loginUser = async (email, password) => {
  const user = await User.findOne({
    email,
    isActive: { $ne: false },
  }).select("+password");

  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  // DRY Centralized session creator
  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};
```

```javascript
// controllers/auth.controller.js
export const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body.email,
    req.body.password,
  );

  user.password = undefined;          // Strip password from response

  setRefreshTokenCookie(res, refreshToken);  // HTTP-only cookie

  sendResponse(res, 200, { user }, "Login successful", { accessToken });
};
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "user": { "_id": "...", "name": "Alex", "email": "alex@example.com", "role": "user" } },
  "accessToken": "eyJhbGciOiJIUzI1NiI..."
}
```

**Plus the HTTP header:**

```
Set-Cookie: jwt_refresh=eyJhbGciOiJIUzI1NiI...; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800
```

---

## 🚪 Logout Flow — Token + Cookie Cleanup

```javascript
// services/auth.service.js
export const logoutUser = async (userId, tokenToRemove) => {
  // Delete only the specific refresh token being logged out
  await Token.deleteOne({
    userId,
    token: tokenToRemove,
    type: "refresh",
  });
};
```

```javascript
// controllers/auth.controller.js
export const logout = async (req, res) => {
  const refreshToken = req.cookies?.jwt_refresh;

  if (refreshToken) {
    await authService.logoutUser(req.user.id, refreshToken);
  }

  clearRefreshTokenCookie(res);   // Erase cookie from browser
  sendResponse(res, 200, null, "Logged out successfully");
};
```

| Step | Action | Purpose |
| --- | --- | --- |
| 1 | Read `req.cookies?.jwt_refresh` | Get the refresh token from the cookie |
| 2 | `Token.deleteOne({ token })` | Remove this specific session from DB |
| 3 | `res.clearCookie("jwt_refresh")` | Tell browser to delete the cookie |

> **Why `deleteOne` instead of `deleteMany`?** A user may be logged in on multiple devices. Logging out on one device should only revoke that device's refresh token, not all sessions.

---

## 🔄 Password Change — Session Rotation

```javascript
// services/user.service.js
export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user || !(await comparePassword(currentPassword, user.password))) {
    throw new AppError("Your current password is incorrect.", 401);
  }

  // 1. Update and hash password
  user.password = await hashPassword(newPassword);
  await user.save();

  // 2. Invalidate ALL previous refresh tokens
  await Token.deleteMany({ userId: user._id, type: "refresh" });

  // 3. Create fresh session for the current device
  const { accessToken, refreshToken } = await createAuthSession(user._id);

  return { user, accessToken, refreshToken };
};
```

```javascript
// controllers/user.controller.js
export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Please provide both current and new passwords.", 400);
  }

  const { accessToken, refreshToken } = await userService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
  );

  setRefreshTokenCookie(res, refreshToken);   // New cookie for this session
  sendResponse(res, 200, null, "Password updated successfully!", { accessToken });
};
```

| Step | Action | Why |
| --- | --- | --- |
| Hash new password | `hashPassword(newPassword)` | Explicit hashing (no pre-save hook) |
| `user.save()` | Persist to database | — |
| `Token.deleteMany` | Revoke ALL refresh tokens | Force re-login on all other devices |
| `createAuthSession` | Issue fresh pair | Keep current device logged in |
| `setRefreshTokenCookie` | Set new cookie | Browser gets the new refresh token |
| `sendResponse` with `accessToken` | Return new access token | Client can immediately use it |

---

## 📡 API Reference

### Auth Endpoints (Mixed) — `http://localhost:4000/api/auth`

| Method | Endpoint | Description | Auth | Validation |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register new user | ❌ No | `registerSchema` |
| `POST` | `/api/auth/login` | Login → access token + refresh cookie | ❌ No | `loginSchema` |
| `POST` | `/api/auth/refresh` | Rotate refresh token → new pair | ❌ Cookie only | — |
| `POST` | `/api/auth/logout` | Revoke refresh token + clear cookie | ✅ Bearer | — |
| `POST` | `/api/auth/forgot-password` | Send password reset email | ❌ No | `forgotPasswordSchema` |
| `POST` | `/api/auth/reset-password/:token` | Reset password with URL token | ❌ No | `resetPasswordSchema` |

### User Endpoints (Protected) — `http://localhost:4000/api/users`

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/users/profile` | Get current user profile | ✅ Bearer |
| `PUT` | `/api/users/update-password` | Change password + rotate session | ✅ Bearer |
| `DELETE` | `/api/users/delete-account` | Soft delete + revoke all sessions | ✅ Bearer |

### Course Endpoints — `http://localhost:4000/api/courses`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/courses/` | List all courses (populated instructor) |
| `POST` | `/api/courses/` | Create course |
| `PUT` | `/api/courses/:id` | Update course |
| `GET` | `/api/courses/stats/categories` | Average price by category |
| `GET` | `/api/courses/stats/top-web` | Top 3 web courses by price |
| `GET` | `/api/courses/stats/instructor-counts` | Course count per instructor |
| `GET` | `/api/courses/stats/instructor-details` | Instructor details with `$lookup` |
| `GET` | `/api/courses/stats/revenue` | Total revenue potential |

### Request & Response Examples

#### Login (Dual Token)

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com", "password": "MyPass123"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64abc123...",
      "name": "Alex",
      "email": "alex@example.com",
      "role": "user",
      "rating": 5,
      "isActive": true
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiI..."
}
```

**+ HTTP Header:**

```
Set-Cookie: jwt_refresh=eyJhbGciOiJIUzI1NiI...; HttpOnly; SameSite=Strict
```

#### Refresh Token

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  --cookie "jwt_refresh=eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": null,
  "accessToken": "eyJhbGciOiJIUzI1NiI..."
}
```

**Reuse Detected (403):**

```json
{
  "status": "fail",
  "message": "Invalid refresh token reused! All sessions have been logged out for security."
}
```

#### Forgot Password

```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Token sent to email!",
  "data": null
}
```

#### Reset Password

```bash
curl -X POST http://localhost:4000/api/auth/reset-password/7e9f1a2b3c4d... \
  -H "Content-Type: application/json" \
  -d '{"password": "NewSecure123"}'
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Password successfully updated. Please log in with your new password.",
  "data": null
}
```

#### Logout (Protected)

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  --cookie "jwt_refresh=eyJhbGciOiJIUzI1NiI..."
```

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## 🌐 Modern Authentication Ecosystem & Industry Paradigms

While Week 8 focuses on mastering **Dual-Token JWTs and HTTP-Only Cookie Rotation** in Express & Node.js, real-world systems leverage diverse authentication mechanisms depending on the client type, threat model, and user friction requirements:

### OAuth 2.0 & OpenID Connect (OIDC)

Used for delegated authorization ("Sign in with Google/GitHub") and identity verification across distributed services:

![OAuth 2.0 and OIDC Flow Infographic](OAuth%202.0%20and%20OIDC%20Flow%20Infographic.png)

### API Keys Architecture

Used for machine-to-machine (M2M) communication, developer platforms, and public developer APIs:

![API Keys How It Works Infographic](API%20Keys%20How%20It%20Works%20Infographic.png)

### Passwordless Authentication (Magic Links & OTP)

Removes static password vulnerabilities by delivering one-time login links or codes directly to user emails or SMS:

![Passwordless Authentication Infographic](Passwordless%20Authentication%20Infographic.png)

### Passkeys & WebAuthn (FIDO2)

The gold standard of phishing-resistant authentication backed by asymmetric public-key cryptography and biometrics (Face ID / Touch ID):

![Passkeys & WebAuthn Infographic](Passkeys%20%26%20WebAuthn%20Infographic.png)

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

### 5. Test the Full Auth Flow

1. **Register** — `POST /api/auth/register`
2. **Login** — `POST /api/auth/login` → save `accessToken` from JSON + `jwt_refresh` cookie is auto-set
3. **Profile** — `GET /api/users/profile` with `Authorization: Bearer <accessToken>`
4. **Refresh** — `POST /api/auth/refresh` with cookie → get new `accessToken`
5. **Change Password** — `PUT /api/users/update-password` → new tokens issued
6. **Forgot Password** — `POST /api/auth/forgot-password` → check Mailtrap inbox
7. **Reset Password** — `POST /api/auth/reset-password/:token` → password updated
8. **Logout** — `POST /api/auth/logout` → cookie cleared + token deleted

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
| **Dual Token Architecture** | Access Token (15m, in JSON) + Refresh Token (7d, in HTTP-only cookie) |
| **Separate secrets** | `ACCESS_TOKEN_SECRET` ≠ `REFRESH_TOKEN_SECRET` — prevents cross-token forgery |
| **Token Model** | MongoDB collection storing refresh + reset tokens with user reference and TTL |
| **`expires: 0` (TTL index)** | MongoDB auto-deletes document when `expiresAt` timestamp is reached |
| **Refresh Token Rotation** | Each refresh call issues new pair and invalidates old token |
| **Reuse Detection** | Signature-valid but DB-absent token → stolen → revoke ALL user sessions |
| **HTTP-only cookie** | `httpOnly: true` — `document.cookie` cannot read it, prevents XSS theft |
| **`cookie-parser`** | Middleware that parses `Cookie` header into `req.cookies` object |
| **`sameSite: "strict"`** | Cookie never sent on cross-origin requests — CSRF protection |
| **`restrictTo(...roles)`** | Closure-based RBAC middleware that checks `req.user.role` against allowed roles |
| **`protect` + `restrictTo`** | Authentication (who are you?) then Authorization (what can you do?) |
| **Forgot Password** | `crypto.randomBytes(32)` → SHA-256 hash stored in DB → plaintext in email URL |
| **Reset Password** | Hash incoming URL token → match DB → update password → delete ALL tokens |
| **Nodemailer** | SMTP transport for sending emails (Mailtrap sandbox in development) |
| **`createAuthSession()`** | DRY helper: sign both tokens + store refresh in DB — used in 3 places |
| **`hashPassword()` / `comparePassword()`** | Explicit bcrypt utilities replacing pre-save hook |
| **`sendResponse()`** | Standardized JSON response with `...extra` spread for additional fields |
| **`deleteOne` vs `deleteMany`** | Logout deletes one session; password change/reset deletes all sessions |
