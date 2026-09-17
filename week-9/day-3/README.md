# HTML Email System — Class-Based Transport, Templates & Welcome Emails

Building on Day 2's advanced querying, Day 3 replaces the procedural `sendEmail` function with a **class-based `Email` system** that introduces **environment-aware SMTP transport** (Mailtrap in development, SendGrid in production), **reusable HTML email templates** with a shared `baseLayout`, and **automatic welcome emails on user registration**. The `auth.service.js` registration flow now accepts the request origin and sends a branded HTML welcome email, while the password reset flow migrates from plain-text `sendEmail` to the new `Email` class with a dedicated `passwordResetTemplate`.

---

## Table of Contents

- [What Changed from Day 2](#-what-changed-from-day-2)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Middleware Pipeline (Unchanged)](#middleware-pipeline-unchanged)
- [The Email Class — Environment-Aware Transport](#-the-email-class--environment-aware-transport)
  - [Class Structure](#class-structure)
  - [Environment-Aware Transport Selection](#environment-aware-transport-selection)
  - [Core Sending Method](#core-sending-method)
  - [Pre-Configured Email Methods](#pre-configured-email-methods)
  - [Why a Class Instead of a Function?](#why-a-class-instead-of-a-function)
- [HTML Email Templates](#-html-email-templates)
  - [Base Layout Pattern](#base-layout-pattern)
  - [Welcome Template](#welcome-template)
  - [Password Reset Template](#password-reset-template)
  - [Why Template Composition?](#why-template-composition)
- [Registration Flow — Welcome Email](#-registration-flow--welcome-email)
  - [Controller: Capturing reqOrigin](#controller-capturing-reqorigin)
  - [Service: Non-Blocking Welcome Email](#service-non-blocking-welcome-email)
  - [Why Non-Blocking?](#why-non-blocking)
- [Password Reset Flow — HTML Upgrade](#-password-reset-flow--html-upgrade)
  - [Day 2 vs Day 3 Comparison](#day-2-vs-day-3-comparison)
  - [Why Blocking for Password Reset?](#why-blocking-for-password-reset)
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
- [Troubleshooting](#-troubleshooting)
- [Key Concepts Summary](#-key-concepts-summary)

---

## 🔄 What Changed from Day 2

| Area                   | Day 2                                                     | Day 3                                                                             |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Email Utility**      | `sendEmail(options)` — procedural function, plain-text    | `new Email(user, url)` — class-based, HTML templates, environment-aware transport |
| **Email Templates**    | ❌ Not available                                          | ✅ `emailTemplates.js` — `baseLayout`, `welcomeTemplate`, `passwordResetTemplate` |
| **Registration**       | No email sent on registration                             | ✅ Sends branded HTML welcome email with course catalog link                      |
| **Password Reset**     | Plain-text email via `sendEmail({ email, subject, msg })` | ✅ HTML email via `new Email(user, resetURL).sendPasswordReset()`                 |
| **Transport Strategy** | Single Mailtrap transport for all environments            | ✅ Mailtrap in `development`, SendGrid in `production`                            |
| **Auth Controller**    | `register(req, res)` — no origin capture                  | ✅ Captures `reqOrigin` from request URL or `FRONTEND_URL` env                    |
| **Auth Service**       | `registerUser(userData)` — no email logic                 | ✅ `registerUser(userData, reqOrigin)` — sends welcome email after user creation  |
| **ENV Variables**      | `EMAIL_SUPPORT` as sender                                 | ✅ `EMAIL_FROM` for class-based sender (+ `SENDGRID_*` for production)            |

### Files Changed

| File                             | Change Type | Description                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| `utils/email.js`                 | **Rewrite** | Procedural `sendEmail` → class-based `Email` with dual transport    |
| `utils/emailTemplates.js`        | **New**     | HTML email templates with shared `baseLayout`                       |
| `controllers/auth.controller.js` | Modified    | `register` now captures `reqOrigin` and passes it to service        |
| `services/auth.service.js`       | Modified    | `registerUser` accepts `reqOrigin`, sends welcome email             |
| `services/auth.service.js`       | Modified    | `generateResetToken` uses `Email` class (old `sendEmail` commented) |

---

## 🚀 Key Features

- **Class-Based Email System** — `new Email(user, url)` with constructor-injected user data and URL context
- **Environment-Aware Transport** — Mailtrap SMTP in development, SendGrid service in production
- **HTML Email Templates** — Branded `baseLayout` wrapper with `welcomeTemplate` and `passwordResetTemplate`
- **Auto-Generated Plain Text** — HTML tags stripped via regex for clients that only support plain text
- **Welcome Email on Registration** — Non-blocking branded email with course catalog link
- **HTML Password Reset** — Styled reset button with 10-minute expiry notice
- **Template Composition** — `baseLayout` wraps all templates for consistent branding (header + footer)
- **Non-Blocking vs Blocking Strategy** — Welcome email errors are caught silently; reset email errors clean up tokens and re-throw

---

## 🧰 Tech Stack

| Technology                            | Purpose                                                  |
| ------------------------------------- | -------------------------------------------------------- |
| **Node.js**                           | JavaScript runtime (v24+ recommended)                    |
| **Express 5** (`^5.2.1`)              | Web framework with native async error propagation        |
| **Mongoose 9** (`^9.9.4`)             | MongoDB ODM — schemas, TTL indexes, references           |
| **nodemailer** (`^9.1.1`)             | ★ SMTP email transport (Mailtrap dev, SendGrid prod)     |
| **helmet** (`^8.3.0`)                 | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| **cors** (`^2.8.6`)                   | Cross-Origin Resource Sharing middleware                 |
| **express-rate-limit** (`^8.7.0`)     | IP-based request throttling with sliding window          |
| **express-mongo-sanitize** (`^2.2.0`) | NoSQL injection defense (strips `$` and `.` operators)   |
| **sanitize-html** (`^2.17.7`)         | HTML/JS tag stripping for XSS defense                    |
| **bcryptjs** (`^3.0.3`)               | Password hashing and verification                        |
| **jsonwebtoken** (`^9.0.3`)           | Access + Refresh token signing and verification          |
| **cookie-parser** (`^1.4.7`)          | Parse `Cookie` header → `req.cookies`                    |
| **Joi** (`^18.2.5`)                   | Declarative request body validation                      |
| **ES Modules**                        | Native `"type": "module"` (`import`/`export`)            |
| **Nodemon**                           | Hot-reloading development server with `--env-file`       |

---

## 🏗 Architecture

### Directory Structure

```
authentication/
├── server.js                          # 5-layer ordered middleware pipeline + Express 5 query patch
├── .env                               # Access/Refresh secrets + email config + EMAIL_FROM
├── package.json                       # Dependencies including nodemailer
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
│   ├── xss.middleware.js              # Recursive HTML/JS tag stripping via sanitize-html
│   ├── validate.middleware.js         # Reusable Joi factory
│   ├── logger.middleware.js           # ISO timestamp request logger
│   └── globalErrorHandler.js          # Centralized error handler
│
├── routes/
│   ├── auth.routes.js                 # authLimiter applied directly to POST /login
│   ├── user.routes.js                 # Blanket protect + admin restrictTo for user listing
│   └── course.routes.js               # Per-route protect + restrictTo for CRUD & analytics
│
├── controllers/
│   ├── auth.controller.js             # ★ register now captures reqOrigin for welcome email
│   ├── user.controller.js             # getProfile, updatePassword, deleteAccount, getAllUsers
│   └── course.controller.js           # getCourses uses getAdvancedCourses with sendResponse meta
│
├── services/
│   ├── auth.service.js                # ★ registerUser sends welcome email, generateResetToken uses Email class
│   ├── user.service.js                # changePassword, deactivateUser, fetchAllUsers
│   └── course.service.js              # getAdvancedCourses with allowlist filtering, search, sorting, pagination
│
└── utils/
    ├── appError.js                    # Custom AppError class
    ├── token.js                       # signAccessToken, signRefreshToken, createAuthSession, hashToken
    ├── cookie.js                      # setRefreshTokenCookie, clearRefreshTokenCookie
    ├── password.js                    # hashPassword, comparePassword
    ├── email.js                       # ★ REWRITE: Email class with environment-aware transport
    ├── emailTemplates.js              # ★ NEW: baseLayout + welcomeTemplate + passwordResetTemplate
    └── responseHandler.js             # sendResponse (standardized JSON with extra spread)
```

### Middleware Pipeline (Unchanged)

The 5-layer middleware pipeline from Day 1 remains identical:

```javascript
// server.js — The complete ordered pipeline

// 1. Security Headers & CORS
app.use(helmet());
app.use(cors({ origin, credentials, methods }));

// 2. Rate Limiting
app.use("/api", globalLimiter);

// 3. Body & Cookie Parsers
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(requestLogger);

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
app.use(mongoSanitize());
app.use(xssClean);

// 5. Application Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
```

---

## 📧 The Email Class — Environment-Aware Transport

### Class Structure

```javascript
// utils/email.js
import nodemailer from "nodemailer";
import { welcomeTemplate, passwordResetTemplate } from "./emailTemplates.js";

export class Email {
  constructor(user, url) {
    this.to = user.email; // Recipient email
    this.firstName = user.name.split(" ")[0]; // First name for personalization
    this.url = url; // Action URL (login link, reset link)
    this.from = `CourseHub Admin <${process.env.EMAIL_FROM}>`; // Branded sender identity
  }

  newTransport() {
    /* ... environment-aware transport selection ... */
  }
  async send(html, subject) {
    /* ... core sending logic ... */
  }
  async sendWelcome() {
    /* ... pre-configured welcome email ... */
  }
  async sendPasswordReset() {
    /* ... pre-configured password reset email ... */
  }
}
```

### Day 2 `sendEmail` vs Day 3 `Email` Class

```
Day 2: Procedural Function                    Day 3: Class-Based System
─────────────────────────                     ─────────────────────────
sendEmail({                                   const email = new Email(user, url);
  email: user.email,                          email.sendWelcome();
  subject: "Reset link",                      // or
  message: "Click here..."                    email.sendPasswordReset();
})
     │                                              │
     ▼                                              ▼
Single transport                              Environment-aware transport
Plain-text only                               HTML + auto-generated plain text
Manual options object                         Constructor-injected user + URL
No template system                            Composable HTML templates
Same config for dev/prod                      Mailtrap (dev) / SendGrid (prod)
```

### Environment-Aware Transport Selection

```javascript
// utils/email.js
newTransport() {
  if (process.env.NODE_ENV === "production") {
    // Production: e.g., SendGrid
    return nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD,
      },
    });
  }

  // Development: Mailtrap (catches all emails in a sandbox inbox)
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}
```

```
                    ┌────────────────────┐
  new Email(user, url)                   │
         │                               │
         ▼                               │
  email.sendWelcome()                    │
         │                               │
         ▼                               │
  this.newTransport()                    │
         │                               │
    ┌────┴────────────┐                  │
    ▼                 ▼                  │
NODE_ENV ===      NODE_ENV ===           │
"production"?     "development"?         │
    │                 │                  │
    ▼                 ▼                  │
 SendGrid         Mailtrap               │
 (real inbox)     (sandbox)              │
    │                 │                  │
    └────────┬────────┘                  │
             ▼                           │
   transporter.sendMail(mailOptions)     │
                                         │
└────────────────────────────────────────┘
```

| Environment   | Transport        | Purpose                                            |
| ------------- | ---------------- | -------------------------------------------------- |
| `development` | Mailtrap SMTP    | Catches all emails in a sandbox — no real delivery |
| `production`  | SendGrid Service | Delivers real emails to actual recipients          |

### Core Sending Method

```javascript
// utils/email.js
async send(html, subject) {
  const mailOptions = {
    from: this.from,                              // "CourseHub Admin <admin@coursehub.com>"
    to: this.to,                                   // user.email
    subject,                                       // "Welcome to CourseHub!"
    html,                                          // Full HTML from template
    text: html.replace(/<[^>]*>?/gm, ""),         // Auto-strip tags for plain-text fallback
  };

  await this.newTransport().sendMail(mailOptions);
}
```

| Mail Option | Source                            | Purpose                                     |
| ----------- | --------------------------------- | ------------------------------------------- |
| `from`      | `this.from` (constructor)         | Branded sender: `CourseHub Admin <email>`   |
| `to`        | `this.to` (constructor)           | Recipient from `user.email`                 |
| `subject`   | Parameter from `sendWelcome` etc. | Email subject line                          |
| `html`      | Parameter from template function  | Full HTML content with inline styles        |
| `text`      | Auto-generated from `html`        | Plain-text fallback for older email clients |

> **Auto Plain Text**: `html.replace(/<[^>]*>?/gm, "")` strips all HTML tags using a regex, producing a readable plain-text version automatically. This ensures compatibility with email clients that don't render HTML.

### Pre-Configured Email Methods

```javascript
// utils/email.js
async sendWelcome() {
  const html = welcomeTemplate(this.firstName, this.url);
  await this.send(html, "Welcome to CourseHub!");
}

async sendPasswordReset() {
  const html = passwordResetTemplate(this.firstName, this.url);
  await this.send(html, "Your password reset token (valid for 10 min)");
}
```

| Method                | Template                | Subject                                          | URL Purpose            |
| --------------------- | ----------------------- | ------------------------------------------------ | ---------------------- |
| `sendWelcome()`       | `welcomeTemplate`       | `"Welcome to CourseHub!"`                        | Link to course catalog |
| `sendPasswordReset()` | `passwordResetTemplate` | `"Your password reset token (valid for 10 min)"` | Link to reset page     |

### Why a Class Instead of a Function?

| Concern                 | `sendEmail` Function (Day 2)            | `Email` Class (Day 3)                          |
| ----------------------- | --------------------------------------- | ---------------------------------------------- |
| **User data**           | Passed via `options.email` each call    | Injected once in `constructor(user, url)`      |
| **Adding new emails**   | Copy-paste options object for each type | Add a new `async sendX()` method               |
| **Transport switching** | Hardcoded single transport              | `newTransport()` method checks `NODE_ENV`      |
| **HTML support**        | Manual `text` field only                | `html` + auto-generated `text`                 |
| **Personalization**     | Manual `${user.name}` each time         | `this.firstName` available in all methods      |
| **Template reuse**      | Inline strings                          | Imported template functions with shared layout |

---

## 📝 HTML Email Templates

### Base Layout Pattern

```javascript
// utils/emailTemplates.js
const baseLayout = (content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
      <h2>CourseHub</h2>
    </div>
    <div style="padding: 20px;">
      ${content}
    </div>
    <div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">
      &copy; ${new Date().getFullYear()} CourseHub Inc. All rights reserved.
    </div>
  </div>
`;
```

```
┌──────────────────────────────────────────────┐
│             baseLayout(content)               │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  HEADER: "CourseHub"                  │   │
│  │  (centered, light gray background)    │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  CONTENT: ${content}                  │   │
│  │  (injected by each template)          │   │
│  │                                       │   │
│  │  welcomeTemplate → greeting + CTA     │   │
│  │  passwordResetTemplate → warning + btn │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  FOOTER: © 2026 CourseHub Inc.        │   │
│  │  (centered, gray, small font)         │   │
│  └───────────────────────────────────────┘   │
│                                               │
└──────────────────────────────────────────────┘
```

### Welcome Template

```javascript
// utils/emailTemplates.js
export const welcomeTemplate = (name, url) =>
  baseLayout(`
  <h3>Welcome to the platform, ${name}!</h3>
  <p>We're thrilled to have you here. To get started, explore our course catalog.</p>
  <a href="${url}" style="display: inline-block; padding: 10px 20px;
     background-color: #007bff; color: #fff; text-decoration: none;
     border-radius: 5px;">Explore Courses</a>
`);
```

| Element        | Content                                               | Style                   |
| -------------- | ----------------------------------------------------- | ----------------------- |
| Greeting       | `Welcome to the platform, ${name}!`                   | `<h3>` heading          |
| Body text      | "We're thrilled to have you here..."                  | `<p>` paragraph         |
| Call-to-Action | "Explore Courses" button → links to login/catalog URL | Blue button (`#007bff`) |

### Password Reset Template

```javascript
// utils/emailTemplates.js
export const passwordResetTemplate = (name, url) =>
  baseLayout(`
  <h3>Hello ${name},</h3>
  <p>We received a request to reset your password. Click the button below
     to set a new one. This link is valid for 10 minutes.</p>
  <a href="${url}" style="display: inline-block; padding: 10px 20px;
     background-color: #dc3545; color: #fff; text-decoration: none;
     border-radius: 5px;">Reset Password</a>
  <p>If you didn't request this, please ignore this email or contact
     support if you have concerns.</p>
`);
```

| Element        | Content                                           | Style                  |
| -------------- | ------------------------------------------------- | ---------------------- |
| Greeting       | `Hello ${name},`                                  | `<h3>` heading         |
| Body text      | "We received a request to reset your password..." | `<p>` paragraph        |
| Expiry notice  | "This link is valid for 10 minutes."              | Inline in body text    |
| Call-to-Action | "Reset Password" button → links to reset URL      | Red button (`#dc3545`) |
| Safety notice  | "If you didn't request this, please ignore..."    | `<p>` paragraph        |

### Why Template Composition?

```
                 baseLayout(content)
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   welcomeTemplate  passwordReset  futureTemplate
   (blue CTA btn)   (red CTA btn)  (easy to add)
```

| Benefit                 | How                                                       |
| ----------------------- | --------------------------------------------------------- |
| **Consistent branding** | Every email gets the same header/footer via `baseLayout`  |
| **DRY principle**       | Brand name, copyright, font family defined once           |
| **Easy extensibility**  | New email types only need to define their `content` block |
| **Inline styles**       | Required for email client compatibility (no external CSS) |

---

## 👤 Registration Flow — Welcome Email

### Controller: Capturing `reqOrigin`

```javascript
// controllers/auth.controller.js — Day 3
export const register = async (req, res) => {
  // Capture the URL origin to build the login link in the email
  const reqOrigin =
    process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;

  const newUser = await authService.registerUser(req.body, reqOrigin);
  sendResponse(res, 201, newUser, "Registration successful");
};
```

```
// Day 2 (no email)                      // Day 3 (with welcome email)
export const register = async (...) => {  export const register = async (...) => {
                                            const reqOrigin = process.env.FRONTEND_URL
                                              || `${req.protocol}://${req.get("host")}`;

  const newUser = await                     const newUser = await
    authService.registerUser(req.body);       authService.registerUser(req.body, reqOrigin);
                                                                          // ▲ NEW: reqOrigin
  sendResponse(...);                        sendResponse(...);
};                                        };
```

| Source                                 | Priority  | Example Value           |
| -------------------------------------- | --------- | ----------------------- |
| `process.env.FRONTEND_URL`             | 1st (env) | `http://127.0.0.1:5173` |
| `${req.protocol}://${req.get("host")}` | Fallback  | `http://localhost:4000` |

> The `reqOrigin` is used to build the **login URL** in the welcome email's "Explore Courses" button. If `FRONTEND_URL` is set, it uses the frontend domain; otherwise, it falls back to the API server's own origin.

### Service: Non-Blocking Welcome Email

```javascript
// services/auth.service.js — Day 3
export const registerUser = async (userData, reqOrigin) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("An account with this email already exists", 400);
  }

  userData.password = await hashPassword(userData.password);
  const newUser = await User.create(userData);

  // Non-blocking HTML Welcome Email
  try {
    const loginUrl = `${reqOrigin}/login`;
    await new Email(newUser, loginUrl).sendWelcome();
  } catch (error) {
    console.error("Welcome email failed to send:", error);
    // ↑ Silently log — registration still succeeds!
  }

  const userResponse = newUser.toObject();
  delete userResponse.password;
  return userResponse;
};
```

```
Registration Flow (Day 3):

  1. Check for existing user
            │
  2. Hash password
            │
  3. User.create(userData)    ← User saved to DB ✅
            │
  4. try {
       new Email(user, loginUrl).sendWelcome()
     } catch {
       console.error(...)     ← Logged, NOT re-thrown!
     }                        ← Registration still succeeds ✅
            │
  5. Return user response
```

### Why Non-Blocking?

```
// Non-blocking (Welcome Email):
try {
  await email.sendWelcome();
} catch (error) {
  console.error("Welcome email failed to send:", error);
  // ↑ Error is CAUGHT and LOGGED — registration continues!
}

// Blocking (Password Reset):
try {
  await email.sendPasswordReset();
} catch (error) {
  await Token.deleteMany({ userId: user._id, type: "reset_password" });
  throw new AppError("There was an error sending the email. Try again later!", 500);
  // ↑ Error is RE-THROWN — user gets 500 response!
}
```

| Email Type     | Strategy     | On Failure                       | Rationale                                                   |
| -------------- | ------------ | -------------------------------- | ----------------------------------------------------------- |
| Welcome Email  | Non-blocking | Log error, registration succeeds | A failed welcome email shouldn't prevent account creation   |
| Password Reset | Blocking     | Clean up token, throw 500 error  | User MUST receive the email — no point telling them "sent!" |

---

## 🔐 Password Reset Flow — HTML Upgrade

### Day 2 vs Day 3 Comparison

```javascript
// Day 2: Plain-text email via sendEmail function
const message = `Forgot your password? Click the link below...
  \n\n${resetURL}\n\n
  If you didn't request a password reset, please ignore this email.`;

try {
  await sendEmail({
    email: user.email,
    subject: "Your password reset link (valid for 10 min)",
    message,
  });
} catch (error) {
  await Token.deleteMany({ userId: user._id, type: "reset_password" });
  throw new AppError("There was an error sending the email...", 500);
}
```

```javascript
// Day 3: HTML email via Email class (old code commented out above)
try {
  await new Email(user, resetURL).sendPasswordReset();
} catch (error) {
  await Token.deleteMany({ userId: user._id, type: "reset_password" });
  throw new AppError("There was an error sending the email...", 500);
}
```

| Aspect              | Day 2 (`sendEmail`)                     | Day 3 (`Email` class)                                   |
| ------------------- | --------------------------------------- | ------------------------------------------------------- |
| **Content**         | Plain-text string with `\n` line breaks | HTML template with styled button                        |
| **Sender**          | `Your App Name <${EMAIL_SUPPORT}>`      | `CourseHub Admin <${EMAIL_FROM}>`                       |
| **Personalization** | None — generic "Forgot your password?"  | Greeting: `Hello ${firstName},`                         |
| **Call-to-Action**  | Raw URL as text                         | Red "Reset Password" button                             |
| **Code complexity** | 5-line options object                   | Single line: `new Email(user, url).sendPasswordReset()` |
| **Error handling**  | Same (token cleanup + re-throw)         | Same (token cleanup + re-throw)                         |

### Why Blocking for Password Reset?

```
Scenario: User clicks "Forgot Password" → expects an email

If email fails and we DON'T tell the user:
  → User sees "Token sent to email!" ← LIE!
  → User checks inbox — nothing there
  → User clicks "Forgot Password" again — token already cleaned up
  → Bad UX, lost trust

If email fails and we DO tell the user (blocking):
  → User sees "There was an error sending the email. Try again later!" ← HONEST!
  → User tries again — new token created, email retried
  → Good UX, user stays in control
```

---

## 📡 API Reference

### Auth Endpoints

| Endpoint                             | Method | Auth        | Rate Limited?            | Description                       |
| ------------------------------------ | ------ | ----------- | ------------------------ | --------------------------------- |
| `/api/v1/auth/register`              | `POST` | ❌          | Global only              | Register + receive welcome email  |
| `/api/v1/auth/login`                 | `POST` | ❌          | **Global + Auth (5/hr)** | Login and receive tokens          |
| `/api/v1/auth/refresh`               | `POST` | ❌ (cookie) | Global only              | Rotate refresh token              |
| `/api/v1/auth/logout`                | `POST` | ✅ Bearer   | Global only              | Invalidate session                |
| `/api/v1/auth/forgot-password`       | `POST` | ❌          | Global only              | Request HTML password reset email |
| `/api/v1/auth/reset-password/:token` | `POST` | ❌ (token)  | Global only              | Reset password with token         |

#### Register (with Welcome Email)

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Developer",
    "email": "alex@example.com",
    "password": "Pass1234",
    "role": "instructor"
  }'
```

**Response (`201 Created`):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "_id": "665b3d...",
    "name": "Alex Developer",
    "email": "alex@example.com",
    "role": "instructor",
    "rating": 5,
    "isActive": true,
    "createdAt": "2026-09-03T...",
    "updatedAt": "2026-09-03T..."
  }
}
```

**Side Effect**: A branded HTML welcome email is sent to `alex@example.com` with a link to the course catalog. If the email fails, the registration still succeeds (non-blocking).

#### Forgot Password (HTML Email)

```bash
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@example.com"}'
```

**Side Effect**: A styled HTML email with a red "Reset Password" button is sent. The link contains a raw token valid for 10 minutes.

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

### Course Endpoints — Advanced Query Examples

```bash
# Default: page 1, 10 items, sorted by newest
curl http://localhost:4000/api/v1/courses

# Text search by title
curl "http://localhost:4000/api/v1/courses?search=node"

# Filter by category with price range
curl "http://localhost:4000/api/v1/courses?category=Web&price[lte]=100"

# Sort by price descending + select specific fields
curl "http://localhost:4000/api/v1/courses?sort=-price&fields=title,price,category"

# Paginate: page 2 with 5 items per page
curl "http://localhost:4000/api/v1/courses?page=2&limit=5"

# Combined: Web courses, search "react", sorted by price, fields selection
curl "http://localhost:4000/api/v1/courses?category=Web&search=react&sort=price&fields=title,price&page=1&limit=5"
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
- [Mailtrap](https://mailtrap.io/) account (free tier for email testing in development)
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

# Email Configuration
EMAIL_FROM=admin@coursehub.com
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_mailtrap_username
EMAIL_PASSWORD=your_mailtrap_password

# Production only (SendGrid)
# SENDGRID_USERNAME=your_sendgrid_username
# SENDGRID_PASSWORD=your_sendgrid_api_key
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test Welcome Email

```bash
# Register a user → check Mailtrap inbox for welcome email
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "Pass1234"}'
```

### 6. Test Password Reset Email

```bash
# Request reset → check Mailtrap inbox for HTML reset email
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 📋 Available Scripts

| Command       | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `npm start`   | Start server with Node.js (`node --env-file=.env server.js`)                   |
| `npm run dev` | Start development server with hot-reload (`nodemon --env-file=.env server.js`) |

---

## 🔐 Environment Variables

| Variable               | Description                                           | Example                                    |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `NODE_ENV`             | Application mode (controls email transport selection) | `development`                              |
| `MONGO_URI`            | MongoDB connection string                             | `mongodb://localhost:27017/authentication` |
| `ACCESS_TOKEN_SECRET`  | Secret for signing access JWTs                        | (long random string)                       |
| `ACCESS_TOKEN_EXPIRY`  | Access token lifetime                                 | `15m`                                      |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh JWTs                       | (different long random string)             |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime                                | `7d`                                       |
| `FRONTEND_URL`         | Frontend URL for CORS origin + email links            | `http://127.0.0.1:5173`                    |
| `EMAIL_FROM`           | ★ Sender email for `Email` class                      | `admin@coursehub.com`                      |
| `EMAIL_HOST`           | SMTP host (Mailtrap for development)                  | `sandbox.smtp.mailtrap.io`                 |
| `EMAIL_PORT`           | SMTP port                                             | `2525`                                     |
| `EMAIL_USERNAME`       | SMTP username (Mailtrap)                              | (from Mailtrap dashboard)                  |
| `EMAIL_PASSWORD`       | SMTP password (Mailtrap)                              | (from Mailtrap dashboard)                  |
| `SENDGRID_USERNAME`    | ★ SendGrid username (production only)                 | (from SendGrid dashboard)                  |
| `SENDGRID_PASSWORD`    | ★ SendGrid API key (production only)                  | (from SendGrid dashboard)                  |

> Variables marked with ★ are new or changed in Day 3.

---

## 🛠 Troubleshooting

### Express 5: `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`

#### Symptom

Any request crashes with a `500 Internal Server Error`:

```json
{
  "status": "error",
  "message": "Cannot set property query of #<IncomingMessage> which has only a getter",
  "stack": "TypeError: ... at express-mongo-sanitize/index.js:113:18"
}
```

#### Cause

Express 5 (`^5.2.1`) redesigned `req.query` as a **getter-only** accessor property on `express.request.prototype`. Legacy middleware (`express-mongo-sanitize` v2.2.0) attempts `req['query'] = target` which fails because the getter has no setter.

#### Solution

Add the `Object.defineProperty` compatibility bridge in `server.js` **immediately before** `mongoSanitize()`:

```javascript
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

### Welcome Email Not Received

| Possible Cause                 | Solution                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| `EMAIL_FROM` not set in `.env` | Add `EMAIL_FROM=admin@coursehub.com` to `.env`             |
| Mailtrap credentials incorrect | Verify `EMAIL_USERNAME` and `EMAIL_PASSWORD` from Mailtrap |
| Wrong `NODE_ENV`               | Ensure `NODE_ENV=development` for Mailtrap transport       |
| SendGrid vars missing (prod)   | Set `SENDGRID_USERNAME` and `SENDGRID_PASSWORD` in prod    |
| Email error silently caught    | Check console for `"Welcome email failed to send:"` log    |

### Password Reset Email Fails with 500

If `POST /api/v1/auth/forgot-password` returns a `500` error with `"There was an error sending the email"`:

1. The `Email` class failed to connect to the SMTP transport
2. The reset token has been **automatically cleaned up** (security measure)
3. Check Mailtrap credentials and `EMAIL_HOST`/`EMAIL_PORT` values
4. The user can safely retry — a new token will be generated

---

## 🔑 Key Concepts Summary

| Concept                           | Description                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| **Class-Based Email System**      | `Email` class with constructor-injected `user` and `url`, replacing procedural `sendEmail` |
| **Environment-Aware Transport**   | `newTransport()` selects Mailtrap (dev) or SendGrid (prod) based on `NODE_ENV`             |
| **Template Composition**          | `baseLayout(content)` wraps all templates for consistent header/footer branding            |
| **Inline CSS in Emails**          | Required for email client compatibility — external stylesheets are blocked by most clients |
| **Auto Plain Text Fallback**      | `html.replace(/<[^>]*>?/gm, "")` generates plain text from HTML for legacy email clients   |
| **Non-Blocking Welcome Email**    | `try/catch` with `console.error` — registration succeeds even if email fails               |
| **Blocking Password Reset Email** | `try/catch` with token cleanup + `throw AppError` — user is told if email failed           |
| **`reqOrigin` Capture**           | Controller captures request origin for building action URLs in emails                      |
| **`FRONTEND_URL` Priority**       | Env variable takes priority over request-derived origin for email action links             |
| **Commented-Out Legacy Code**     | Old `sendEmail` function and its usage remain commented in codebase as reference           |
| **5-Layer Middleware Pipeline**   | Unchanged from Day 1: helmet → cors → rateLimiter → bodyParsers → sanitizers → routes      |
| **Express 5 `req.query` Bridge**  | `Object.defineProperty` compatibility middleware for sanitizer packages                    |
| **Allowlist Filtering**           | Unchanged from Day 2: only `["category","price","rating","instructorId"]` pass through     |
| **Text Search**                   | Unchanged from Day 2: `?search=node` → regex on `title` field                              |
