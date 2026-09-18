# File Uploads — Multer Memory Storage, Cloudinary CDN & Avatar Management

Building on Day 3's HTML email system, Day 4 introduces a **complete file upload pipeline** — from accepting multipart/form-data requests with **Multer's memory storage** to uploading image buffers directly to **Cloudinary CDN** via `upload_stream`. The `User` model gains an `avatar` subdocument (`url` + `publicId`), a new `PATCH /update-avatar` endpoint handles the upload flow with automatic old-avatar cleanup, and the course routes are restructured with **per-route `protect` and `restrictTo` guards** replacing the blanket `router.use(protect)` pattern from Day 3 — enabling fine-grained public/protected/admin access control on individual aggregation endpoints.

---

## Table of Contents

- [What Changed from Day 3](#-what-changed-from-day-3)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
  - [Directory Structure](#directory-structure)
  - [Middleware Pipeline](#middleware-pipeline)
- [File Upload Pipeline — Multer to Cloudinary](#-file-upload-pipeline--multer-to-cloudinary)
  - [Why Memory Storage Instead of Disk?](#why-memory-storage-instead-of-disk)
  - [upload.middleware.js — Multer Configuration](#uploadmiddlewarejs--multer-configuration)
  - [File Type Validation — fileFilter](#file-type-validation--filefilter)
  - [Size Limit — 5MB Defense](#size-limit--5mb-defense)
- [Cloudinary Integration — Cloud Image Storage](#-cloudinary-integration--cloud-image-storage)
  - [Why Cloudinary?](#why-cloudinary)
  - [cloudinary.js — Configuration & Helpers](#cloudinaryjs--configuration--helpers)
  - [uploadToCloudinary — The upload_stream Pattern](#uploadtocloudinary--the-upload_stream-pattern)
  - [deleteFromCloudinary — Cleanup Helper](#deletefromcloudinary--cleanup-helper)
  - [Why upload_stream Instead of upload?](#why-upload_stream-instead-of-upload)
- [Avatar Management — User Model & Service](#-avatar-management--user-model--service)
  - [User Model — Avatar Subdocument](#user-model--avatar-subdocument)
  - [updateAvatar Service — The Complete Flow](#updateavatar-service--the-complete-flow)
  - [Why validateBeforeSave: false?](#why-validatebeforesave-false)
  - [Route & Controller Wiring](#route--controller-wiring)
- [Per-Route RBAC — Course Endpoint Restructuring](#-per-route-rbac--course-endpoint-restructuring)
  - [Day 3 vs Day 4 Course Routes Comparison](#day-3-vs-day-4-course-routes-comparison)
  - [Public Aggregation Endpoints](#public-aggregation-endpoints)
  - [Protected Aggregation Endpoints](#protected-aggregation-endpoints)
  - [RBAC-Gated CRUD Endpoints](#rbac-gated-crud-endpoints)
  - [New DELETE Endpoint](#new-delete-endpoint)
  - [Why Per-Route Instead of router.use?](#why-per-route-instead-of-routeruse)
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

## 🔄 What Changed from Day 3

| Area              | Day 3                                                            | Day 4                                                                                                 |
| ----------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **File Uploads**  | ❌ Not available                                                 | ✅ `upload.middleware.js` — Multer memory storage with image-only filter and 5MB limit                |
| **Cloud Storage** | ❌ Not available                                                 | ✅ `cloudinary.js` — `uploadToCloudinary` (buffer → CDN) + `deleteFromCloudinary`                     |
| **User Model**    | No avatar field                                                  | ✅ `avatar: { url, publicId }` subdocument with Cloudinary default URL                                |
| **User Routes**   | `GET /profile`, `PUT /update-password`, `DELETE /delete-account` | ✅ + `PATCH /update-avatar` with `uploadImage.single("avatar")` Multer middleware                     |
| **User Service**  | `changePassword`, `deactivateUser`, `fetchAllUsers`              | ✅ + `updateAvatar(userId, file)` — delete-old → upload-new → save-to-MongoDB                         |
| **Course Routes** | Blanket `router.use(protect)` — all aggregation routes protected | ✅ Per-route `protect` + `restrictTo` — public stats vs admin-only stats                              |
| **Course CRUD**   | `GET /`, `POST /`, `PUT /:id`                                    | ✅ + `DELETE /:id` (admin-only) — complete CRUD                                                       |
| **Dependencies**  | No file upload or cloud storage packages                         | ✅ + `multer ^2.4.0`, `cloudinary ^2.11.0`                                                            |
| **ENV Variables** | Email-related only                                               | ✅ + `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER_NAME` |

---

## ✨ Key Features

- **Multer Memory Storage** — files are held in RAM as `Buffer` objects, never touching disk
- **Image-Only Validation** — `fileFilter` rejects non-image MIME types with a descriptive `AppError`
- **5MB Size Limit** — Multer's `limits.fileSize` prevents oversized payloads before they reach Cloudinary
- **Cloudinary upload_stream** — streams memory buffers directly to CDN without temp files
- **Automatic Old Avatar Cleanup** — deletes the previous Cloudinary asset before uploading a new one
- **Avatar Subdocument** — stores both `url` (for display) and `publicId` (for deletion) in MongoDB
- **Per-Route RBAC** — fine-grained access control on individual course endpoints
- **Admin-Only Course Deletion** — new `DELETE /:id` endpoint with `restrictTo("admin")`
- **Public vs Protected Aggregation** — category stats and top-web are public; instructor details and revenue are admin-only

---

## 🛠 Tech Stack

| Package                  | Version   | Purpose                                              |
| ------------------------ | --------- | ---------------------------------------------------- |
| `express`                | `^5.2.1`  | Web framework (Express 5)                            |
| `mongoose`               | `^9.9.4`  | MongoDB ODM                                          |
| `multer`                 | `^2.4.0`  | Multipart/form-data file upload middleware **(NEW)** |
| `cloudinary`             | `^2.11.0` | Cloud image storage and CDN delivery **(NEW)**       |
| `bcryptjs`               | `^3.0.3`  | Password hashing                                     |
| `jsonwebtoken`           | `^9.0.3`  | JWT access and refresh tokens                        |
| `cookie-parser`          | `^1.4.7`  | Parse cookies from incoming requests                 |
| `helmet`                 | `^8.3.0`  | Security HTTP headers                                |
| `cors`                   | `^2.8.6`  | Cross-Origin Resource Sharing                        |
| `express-rate-limit`     | `^8.7.0`  | Rate limiting (global + auth-specific)               |
| `express-mongo-sanitize` | `^2.2.0`  | NoSQL injection prevention                           |
| `sanitize-html`          | `^2.17.7` | XSS sanitization                                     |
| `joi`                    | `^18.2.5` | Request body validation                              |
| `nodemailer`             | `^9.1.1`  | Email transport (Mailtrap/SendGrid)                  |
| `nodemon`                | `^3.1.14` | Dev auto-restart                                     |

---

## 🏗 Architecture

### Directory Structure

```
week-9/day-4/authentication/
├── controllers/
│   ├── auth.controller.js        # Register, Login, Refresh, Logout, Forgot/Reset Password
│   ├── course.controller.js      # CRUD + Aggregation endpoints
│   └── user.controller.js        # Profile, Avatar Upload, Password, Deactivation
├── middleware/
│   ├── auth.middleware.js         # protect (JWT verify) + restrictTo (RBAC)
│   ├── globalErrorHandler.js     # Dev/Prod error formatting
│   ├── logger.middleware.js      # Request logging
│   ├── rateLimiter.middleware.js  # Global (100/15min) + Auth (5/hour) limiters
│   ├── upload.middleware.js      # 🆕 Multer memory storage configuration
│   ├── validate.middleware.js    # Joi schema validation
│   └── xss.middleware.js         # sanitize-html XSS cleaner
├── models/
│   ├── course.model.js           # Course schema (title, price, category, instructorId)
│   ├── instructor.model.js       # Instructor schema (name, email, rating)
│   ├── token.model.js            # Token schema (refresh + reset_password, TTL index)
│   └── user.model.js             # 🔄 User schema + avatar subdocument (url, publicId)
├── routes/
│   ├── auth.routes.js            # /api/v1/auth/* — public auth endpoints
│   ├── course.routes.js          # 🔄 /api/v1/courses/* — per-route RBAC
│   └── user.routes.js            # 🔄 /api/v1/users/* — + PATCH /update-avatar
├── services/
│   ├── auth.service.js           # Registration, login, token rotation, password reset
│   ├── course.service.js         # CRUD + aggregation + advanced query builder
│   └── user.service.js           # 🔄 + updateAvatar (Multer → Cloudinary → MongoDB)
├── utils/
│   ├── appError.js               # Custom operational error class
│   ├── cloudinary.js             # 🆕 Cloudinary config + uploadToCloudinary + deleteFromCloudinary
│   ├── cookie.js                 # Refresh token cookie helpers
│   ├── email.js                  # Email class (environment-aware transport)
│   ├── emailTemplates.js         # HTML email templates (welcome, password reset)
│   ├── password.js               # bcrypt hash + compare helpers
│   ├── responseHandler.js        # Standardized JSON response
│   └── token.js                  # JWT signing + session creation + crypto helpers
├── validations/
│   ├── auth.validation.js        # Register, Login, Forgot/Reset password schemas
│   └── course.validation.js      # Create + Update course schemas
├── .env                          # Environment variables (gitignored)
├── package.json
└── server.js                     # Express 5 app entry point
```

> 🆕 = New in Day 4 &nbsp;&nbsp; 🔄 = Modified from Day 3

### Middleware Pipeline

The middleware pipeline remains the same as Day 1 — security-first ordering with the Express 5 `req.query` compatibility bridge:

```
Request → helmet → cors → globalLimiter → express.json → cookieParser → requestLogger
        → req.query bridge → mongoSanitize → xssClean → Routes → globalErrorHandler
```

---

## 📤 File Upload Pipeline — Multer to Cloudinary

### Why Memory Storage Instead of Disk?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TWO APPROACHES TO FILE UPLOADS                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Disk Storage (multer.diskStorage):                                     │
│  ┌──────┐    ┌──────────┐     ┌───────────┐     ┌────────────┐          │
│  │Client│───▶│Server RAM│───▶│Server Disk│───▶ │ Cloudinary │         │
│  └──────┘    └──────────┘     └───────────┘     └────────────┘          │
│                                    │                                    │
│                              Must clean up                              │
│                              temp files!                                │
│                                                                         │
│  Memory Storage (multer.memoryStorage):                                 │
│  ┌──────┐    ┌──────────┐     ┌───────────┐                             │
│  │Client│──▶ │Server RAM│───▶│ Cloudinary│                             │
│  └──────┘    └──────────┘     └───────────┘                             │
│                    │                                                    │
│              Buffer is garbage                                          │
│              collected automatically                                    │
│                                                                         │
│  ✅ Memory storage skips the disk write entirely.                      │
│  The file lives in RAM as a Buffer, gets streamed to Cloudinary,        │
│  and is automatically garbage collected when the request ends.          │
└─────────────────────────────────────────────────────────────────────────┘
```

Memory storage is ideal when:

- You're **not keeping files locally** — they go straight to a cloud provider
- Files are **small** (avatars, thumbnails) — the 5MB limit keeps RAM usage safe
- You want **zero temp file cleanup** — no orphaned files if the process crashes

### upload.middleware.js — Multer Configuration

```javascript
import multer from "multer";
import { AppError } from "../utils/appError.js";

// Hold the file in RAM instead of saving it to the server's hard drive
const storage = multer.memoryStorage();

// Validate file type
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});
```

### File Type Validation — fileFilter

| MIME Type Received | `file.mimetype.startsWith("image/")` | Result            |
| ------------------ | ------------------------------------ | ----------------- |
| `image/jpeg`       | ✅ `true`                            | File accepted     |
| `image/png`        | ✅ `true`                            | File accepted     |
| `image/webp`       | ✅ `true`                            | File accepted     |
| `application/pdf`  | ❌ `false`                           | Rejected with 400 |
| `text/html`        | ❌ `false`                           | Rejected with 400 |

The `fileFilter` runs **before** the file body is fully consumed. If rejected, Multer stops reading the stream and the error propagates to the global error handler.

### Size Limit — 5MB Defense

```javascript
limits: {
  fileSize: 5 * 1024 * 1024;
} // 5,242,880 bytes
```

If a file exceeds 5MB, Multer throws a `MulterError` with code `LIMIT_FILE_SIZE` **before** the entire file is buffered — protecting server RAM from oversized payloads.

---

## ☁️ Cloudinary Integration — Cloud Image Storage

### Why Cloudinary?

| Concern                  | Self-Hosted (Local Disk)        | Cloudinary CDN                                 |
| ------------------------ | ------------------------------- | ---------------------------------------------- |
| **Storage**              | Limited to server disk          | Unlimited cloud storage                        |
| **Delivery Speed**       | Single server location          | Global CDN edge network                        |
| **Image Transformation** | Must install `sharp` or similar | On-the-fly resize, crop, format via URL params |
| **Cleanup**              | Manual file deletion            | API-based deletion by `publicId`               |
| **Scalability**          | Disk fills up, must manage      | Cloud scales automatically                     |
| **Cost at Small Scale**  | Free (your disk)                | Free tier: 25 credits/month                    |

### cloudinary.js — Configuration & Helpers

```javascript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

The `cloudinary.config()` call reads credentials from environment variables and sets them globally. All subsequent API calls use these credentials automatically.

### uploadToCloudinary — The upload_stream Pattern

```javascript
export const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    // We use upload_stream because the file is in a memory buffer, not on disk
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    // Pipe the buffer into the stream
    uploadStream.end(fileBuffer);
  });
};
```

**Step-by-step breakdown:**

```
┌────────────────────────────────────────────────────────────────────┐
│                    upload_stream FLOW                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Create a writable stream to Cloudinary's upload API            │
│     cloudinary.uploader.upload_stream({ folder }, callback)        │
│                                                                    │
│  2. Write the file buffer into that stream                         │
│     uploadStream.end(fileBuffer)                                   │
│                                                                    │
│  3. Cloudinary receives the bytes and stores the image             │
│                                                                    │
│  4. The callback fires with the result:                            │
│     {                                                              │
│       public_id: "coursehub/avatars/abc123xyz",                    │
│       secure_url: "https://res.cloudinary.com/.../abc123xyz.jpg",  │
│       format: "jpg",                                               │
│       bytes: 45231,                                                │
│       ...                                                          │
│     }                                                              │
│                                                                    │
│  5. We resolve the Promise with this result                        │
└────────────────────────────────────────────────────────────────────┘
```

### deleteFromCloudinary — Cleanup Helper

```javascript
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
```

The `publicId` is stored in MongoDB alongside the `url`. When a user uploads a new avatar, the old one is deleted from Cloudinary **before** the new one is uploaded — preventing orphaned assets that consume storage credits.

### Why upload_stream Instead of upload?

| Method                       | Input Required           | Use Case                                            |
| ---------------------------- | ------------------------ | --------------------------------------------------- |
| `cloudinary.uploader.upload` | File path on disk or URL | When the file is saved to disk first                |
| `upload_stream`              | Writable stream (buffer) | When the file is in memory (Multer `memoryStorage`) |

Since Multer's memory storage gives us a `Buffer` at `req.file.buffer`, `upload_stream` is the only correct choice — there is no file path to pass to `upload`.

---

## 🖼 Avatar Management — User Model & Service

### User Model — Avatar Subdocument

**Day 3 User Model** (no avatar):

```javascript
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["user", "instructor", "admin"],
      default: "user",
    },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
```

**Day 4 User Model** (with avatar):

```javascript
const userSchema = new mongoose.Schema({
  // ... same fields as Day 3 ...

  avatar: {
    url: {
      type: String,
      default:
        "https://res.cloudinary.com/dpz69zrr2/image/upload/v.../default_ymylyl.jpg",
    },
    publicId: { type: String },
  },

  // ... isActive, timestamps ...
});
```

The `avatar` is a **subdocument** (not a separate collection) because:

- Every user has exactly one avatar — 1:1 relationship
- No need to query avatars independently
- Reduces join/populate overhead

| Field      | Type     | Purpose                                                |
| ---------- | -------- | ------------------------------------------------------ |
| `url`      | `String` | The Cloudinary CDN URL for display in the UI           |
| `publicId` | `String` | The Cloudinary asset ID needed for `destroy()` cleanup |

### updateAvatar Service — The Complete Flow

```javascript
export const updateAvatar = async (userId, file) => {
  if (!file) throw new AppError("Please provide an image file.", 400);

  const user = await User.findById(userId);

  // 1. If the user already has an avatar, delete it from Cloudinary
  if (user.avatar?.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  // 2. Upload the new image buffer to Cloudinary
  const result = await uploadToCloudinary(
    file.buffer,
    `${process.env.CLOUDINARY_FOLDER_NAME}/avatars`,
  );

  // 3. Save the new URL and publicId to MongoDB
  user.avatar = {
    url: result.secure_url,
    publicId: result.public_id,
  };

  // Skip validation just in case other required fields are missing in this context
  await user.save({ validateBeforeSave: false });

  return user.avatar;
};
```

**Visual flow:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AVATAR UPDATE PIPELINE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client (Postman/Form)                                               │
│    │                                                                 │
│    │  PATCH /api/v1/users/update-avatar                              │
│    │  Content-Type: multipart/form-data                              │
│    │  Body: avatar=<image file>                                      │
│    ▼                                                                 │
│  Multer Middleware (uploadImage.single("avatar"))                    │
│    │  ✓ Validates: Is it an image? (MIME check)                      │
│    │  ✓ Validates: Is it under 5MB? (size check)                     │
│    │  ✓ Stores file in req.file.buffer (RAM)                         │
│    ▼                                                                 │
│  user.controller.js → uploadAvatar(req, res)                         │
│    │  Passes req.user.id and req.file to service                     │
│    ▼                                                                 │
│  user.service.js → updateAvatar(userId, file)                        │
│    │                                                                 │
│    ├──▶ Step 1: Does user have existing avatar publicId?             │
│    │           YES → deleteFromCloudinary(publicId) 🗑️               │
│    │           NO  → skip                                            │
│    │                                                                 │
│    ├──▶ Step 2: uploadToCloudinary(file.buffer, "coursehub/avatars") │
│    │           Returns: { secure_url, public_id, ... }               │
│    │                                                                 │
│    ├──▶ Step 3: user.avatar = { url, publicId }                      │
│    │           user.save({ validateBeforeSave: false })              │
│    │                                                                 │
│    └──▶ Return: { url, publicId }                                    │
│                                                                      │
│  Response: { success: true, data: { url, publicId } }                │
└──────────────────────────────────────────────────────────────────────┘
```

### Why validateBeforeSave: false?

When updating **only** the avatar, other required fields like `password` are excluded by `select: false` in the schema. Mongoose would normally re-validate all fields on `.save()`, failing because `password` is `undefined` in the loaded document. `validateBeforeSave: false` tells Mongoose to skip schema validation and save only the modified paths.

### Route & Controller Wiring

**user.routes.js** — the new route:

```javascript
import { uploadImage } from "../middleware/upload.middleware.js";

router.patch("/update-avatar", uploadImage.single("avatar"), uploadAvatar);
```

| Piece                          | Role                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `uploadImage.single("avatar")` | Multer middleware — expects a single file field named `avatar` |
| `uploadAvatar`                 | Controller — calls `userService.updateAvatar`                  |
| `PATCH` method                 | Partial resource update (only the avatar, not the full user)   |

---

## 🔐 Per-Route RBAC — Course Endpoint Restructuring

### Day 3 vs Day 4 Course Routes Comparison

**Day 3** — blanket protection (all stats routes required login):

```javascript
// All aggregation routes were behind router.use(protect)
router.use(protect);

router.get("/stats/categories",        controller.getCategoryStats);
router.get("/stats/top-web",           controller.getTopWeb);
router.get("/stats/instructor-counts", controller.getInstructorCounts);
router.get("/stats/instructor-details",controller.getInstructorDetails);
router.get("/stats/revenue",           controller.getRevenue);

router.get("/", controller.getAllCourses);
router.post("/", restrictTo("instructor", "admin"), ...);
router.put("/:id", restrictTo("instructor", "admin"), ...);
```

**Day 4** — per-route granularity:

```javascript
// Public — no authentication required
router.get("/stats/categories", controller.getCategoryStats);
router.get("/stats/top-web",    controller.getTopWeb);

// Protected — requires login + specific role
router.get("/stats/instructor-counts",  protect, restrictTo("instructor", "admin"), ...);
router.get("/stats/instructor-details", protect, restrictTo("admin"), ...);
router.get("/stats/revenue",            protect, restrictTo("admin"), ...);

// Public listing
router.get("/", controller.getAllCourses);

// RBAC-gated CRUD
router.post("/",     protect, restrictTo("instructor", "admin"), ...);
router.put("/:id",   protect, restrictTo("instructor", "admin"), ...);
router.delete("/:id", protect, restrictTo("admin"), ...);  // 🆕 Day 4
```

### Public Aggregation Endpoints

| Endpoint                | Access | Reasoning                                     |
| ----------------------- | ------ | --------------------------------------------- |
| `GET /stats/categories` | Public | Average prices by category — marketing data   |
| `GET /stats/top-web`    | Public | Top 3 web courses — discovery/recommendations |

### Protected Aggregation Endpoints

| Endpoint                        | Access                  | Reasoning                                |
| ------------------------------- | ----------------------- | ---------------------------------------- |
| `GET /stats/instructor-counts`  | `instructor` or `admin` | Instructors see their own course counts  |
| `GET /stats/instructor-details` | `admin` only            | Contains emails — sensitive PII          |
| `GET /stats/revenue`            | `admin` only            | Revenue figures — business-critical data |

### RBAC-Gated CRUD Endpoints

| Endpoint      | Access                  | Reasoning                              |
| ------------- | ----------------------- | -------------------------------------- |
| `GET /`       | Public                  | Course catalog browsing                |
| `POST /`      | `instructor` or `admin` | Only instructors/admins create courses |
| `PUT /:id`    | `instructor` or `admin` | Only instructors/admins update courses |
| `DELETE /:id` | `admin` only **(NEW)**  | Destructive action — admin-only        |

### New DELETE Endpoint

```javascript
router.delete("/:id", protect, restrictTo("admin"), controller.deleteCourse);
```

The `deleteCourse` controller:

```javascript
export const deleteCourse = async (req, res) => {
  const course = await courseService.remove(req.params.id);
  if (!course) throw new AppError("Course not found", 404);
  sendResponse(res, 200, null, "Course deleted successfully");
};
```

### Why Per-Route Instead of router.use?

```
┌──────────────────────────────────────────────────────────────────┐
│              router.use(protect) vs Per-Route Guards             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  router.use(protect):                                            │
│  ┌───────────────────────────────────────┐                       │
│  │  EVERY route below this line          │                       │
│  │  requires authentication.             │                       │
│  │                                       │                       │
│  │  Problem: Public stats like           │                       │
│  │  /stats/categories become locked      │                       │
│  │  behind login unnecessarily.          │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  Per-Route Guards:                                               │
│  ┌───────────────────────────────────────┐                       │
│  │  Each route declares its own          │                       │
│  │  access level explicitly.             │                       │
│  │                                       │                       │
│  │  ✅ Public routes stay public         │                       │
│  │  ✅ Protected routes are explicit     │                       │
│  │  ✅ RBAC roles are visible inline     │                       │
│  │  ✅ Route ordering doesn't matter     │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  Per-route is more verbose but eliminates the                    │
│  "where does protect start?" ambiguity.                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 API Reference

### Auth Endpoints

| Method | Endpoint                             | Auth   | Validation             | Description                                   |
| ------ | ------------------------------------ | ------ | ---------------------- | --------------------------------------------- |
| POST   | `/api/v1/auth/register`              | Public | `registerSchema`       | Create account + welcome email                |
| POST   | `/api/v1/auth/login`                 | Public | `loginSchema`          | Login + access/refresh tokens + `authLimiter` |
| POST   | `/api/v1/auth/refresh`               | Cookie | —                      | Rotate refresh token pair                     |
| POST   | `/api/v1/auth/logout`                | Bearer | —                      | Revoke refresh token + clear cookie           |
| POST   | `/api/v1/auth/forgot-password`       | Public | `forgotPasswordSchema` | Generate reset token + send email             |
| POST   | `/api/v1/auth/reset-password/:token` | Public | `resetPasswordSchema`  | Validate token + set new password             |

### User Endpoints

| Method | Endpoint                        | Auth               | Middleware                        | Description                         |
| ------ | ------------------------------- | ------------------ | --------------------------------- | ----------------------------------- |
| GET    | `/api/v1/users/profile`         | Bearer (`protect`) | —                                 | Get current user profile            |
| PATCH  | `/api/v1/users/update-avatar`   | Bearer (`protect`) | `uploadImage.single("avatar")` 🆕 | Upload/replace avatar image         |
| PUT    | `/api/v1/users/update-password` | Bearer (`protect`) | —                                 | Change password + re-issue tokens   |
| DELETE | `/api/v1/users/delete-account`  | Bearer (`protect`) | —                                 | Soft-delete (set `isActive: false`) |
| GET    | `/api/v1/users/`                | Bearer + `admin`   | —                                 | List all active users (admin only)  |

**Avatar Upload Request (Postman):**

```
PATCH /api/v1/users/update-avatar
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body (form-data):
  Key: avatar   Value: <select image file>
```

**Avatar Upload Response:**

```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "url": "https://res.cloudinary.com/dpz69zrr2/image/upload/v.../coursehub/avatars/abc123.jpg",
    "publicId": "coursehub/avatars/abc123"
  }
}
```

### Course Endpoints — CRUD

| Method | Endpoint              | Auth                                        | Validation           | Description          |
| ------ | --------------------- | ------------------------------------------- | -------------------- | -------------------- |
| GET    | `/api/v1/courses`     | Public                                      | —                    | List with pagination |
| POST   | `/api/v1/courses`     | Bearer + `restrictTo("instructor","admin")` | `createCourseSchema` | Create course        |
| PUT    | `/api/v1/courses/:id` | Bearer + `restrictTo("instructor","admin")` | `updateCourseSchema` | Update course        |
| DELETE | `/api/v1/courses/:id` | Bearer + `restrictTo("admin")` 🆕           | —                    | Delete course        |

### Course Endpoints — Advanced Query Examples

```bash
# Filter by category
GET /api/v1/courses?category=Web

# Price range filter
GET /api/v1/courses?price[gte]=50&price[lte]=200

# Search by title
GET /api/v1/courses?search=node

# Sort by price descending, then title ascending
GET /api/v1/courses?sort=-price,title

# Select specific fields
GET /api/v1/courses?fields=title,price,category

# Pagination
GET /api/v1/courses?page=2&limit=5

# Combined query
GET /api/v1/courses?category=Web&price[gte]=50&sort=-price&fields=title,price&page=1&limit=10
```

### Course Endpoints — Aggregation Analytics

| Method | Endpoint                                   | Auth                             | Description                          |
| ------ | ------------------------------------------ | -------------------------------- | ------------------------------------ |
| GET    | `/api/v1/courses/stats/categories`         | Public                           | Average price by category            |
| GET    | `/api/v1/courses/stats/top-web`            | Public                           | Top 3 web courses by price           |
| GET    | `/api/v1/courses/stats/instructor-counts`  | Bearer + `instructor` or `admin` | Course count per instructor          |
| GET    | `/api/v1/courses/stats/instructor-details` | Bearer + `admin` only            | Instructor name, email, course count |
| GET    | `/api/v1/courses/stats/revenue`            | Bearer + `admin` only            | Total revenue potential              |

---

## 📌 Prerequisites

- **Node.js** ≥ 24.x (for `--env-file` flag support)
- **MongoDB** — Atlas cluster or local instance
- **Cloudinary Account** — [Sign up free](https://cloudinary.com/) for cloud image storage
- **Mailtrap Account** — for development email testing
- **Postman** — for API testing (multipart/form-data uploads)

---

## 🚀 Getting Started

```bash
# 1. Navigate to the project directory
cd week-9/day-4/authentication

# 2. Install dependencies
npm install

# 3. Create the .env file with required variables (see Environment Variables section)

# 4. Start the development server
npm run dev
```

---

## 📜 Available Scripts

| Command       | Description                                    |
| ------------- | ---------------------------------------------- |
| `npm run dev` | Start with `nodemon --env-file=.env server.js` |
| `npm start`   | Start with `node --env-file=.env server.js`    |

---

## 🔒 Environment Variables

```env
# Server
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/authentication

# JWT Tokens
ACCESS_TOKEN_SECRET=<your-access-token-secret>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=<your-refresh-token-secret>
REFRESH_TOKEN_EXPIRY=7d

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://127.0.0.1:5173

# Email — Development (Mailtrap)
EMAIL_FROM=admin@coursehub.com
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=<mailtrap-username>
EMAIL_PASSWORD=<mailtrap-password>

# Cloudinary — Cloud Image Storage (NEW in Day 4)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_FOLDER_NAME=coursehub
```

| Variable                 | Required | Description                                           |
| ------------------------ | -------- | ----------------------------------------------------- |
| `CLOUDINARY_CLOUD_NAME`  | ✅       | Your Cloudinary account's cloud name                  |
| `CLOUDINARY_API_KEY`     | ✅       | API key from Cloudinary dashboard                     |
| `CLOUDINARY_API_SECRET`  | ✅       | API secret from Cloudinary dashboard                  |
| `CLOUDINARY_FOLDER_NAME` | ✅       | Root folder in Cloudinary for organized asset storage |

> ⚠️ **Important:** If `CLOUDINARY_CLOUD_NAME` is empty or invalid, Cloudinary returns `"cloud_name is disabled"` with HTTP 401. Always verify your `.env` values match your Cloudinary dashboard.

---

## 🐛 Troubleshooting

### "cloud_name is disabled" (HTTP 401)

```json
{
  "message": "cloud_name is disabled",
  "http_code": 401
}
```

**Cause:** The `CLOUDINARY_CLOUD_NAME` environment variable is empty, misspelled, or the Cloudinary account is deactivated.

**Fix:**

1. Log into [Cloudinary Dashboard](https://console.cloudinary.com/)
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the dashboard
3. Paste them into your `.env` file
4. Restart the server

### "Must supply cloud_name"

**Cause:** The `.env` file is not being loaded. The `CLOUDINARY_CLOUD_NAME` variable is `undefined`.

**Fix:** Ensure you're starting the server with `npm run dev` (which uses `--env-file=.env`), not `node server.js` directly.

### "Not an image! Please upload only images." (400)

**Cause:** The uploaded file's MIME type doesn't start with `image/`.

**Fix:** Upload a valid image file (JPEG, PNG, WebP, GIF).

### "File too large" (Multer)

**Cause:** The uploaded file exceeds the 5MB limit set in `upload.middleware.js`.

**Fix:** Compress or resize the image before uploading.

### Express 5 — req.query Getter-Only Breaking Change

In Express 5, `req.query` is a **getter-only** property on the `express.request` prototype. Libraries like `express-mongo-sanitize` v2.2.0 crash when trying to reassign `req.query`. The compatibility bridge in `server.js` fixes this:

```javascript
app.use((req, _, next) => {
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

This middleware **must** be placed after body parsers and before `mongoSanitize()`.

---

## 📖 Key Concepts Summary

| Concept                       | Explanation                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Multer Memory Storage**     | Files are stored in RAM as `Buffer` objects, never written to disk                                   |
| **fileFilter**                | Multer callback that accepts or rejects files based on MIME type before buffering                    |
| **limits.fileSize**           | Maximum file size in bytes — Multer aborts the upload if exceeded                                    |
| **upload.single("avatar")**   | Multer middleware that processes exactly one file from the `avatar` form field                       |
| **req.file.buffer**           | The in-memory `Buffer` containing the uploaded file's binary data                                    |
| **upload_stream**             | Cloudinary method that accepts a writable stream — used when file data is in memory                  |
| **public_id**                 | Cloudinary's unique identifier for an asset — needed for `destroy()` deletion                        |
| **secure_url**                | The HTTPS CDN URL where the uploaded image is publicly accessible                                    |
| **Subdocument**               | A nested schema within a parent document — `avatar: { url, publicId }` inside `User`                 |
| **validateBeforeSave: false** | Tells Mongoose to skip schema validation on `.save()` — used when only modifying partial data        |
| **Per-Route RBAC**            | Applying `protect` and `restrictTo` on individual routes instead of `router.use(protect)`            |
| **restrictTo(...roles)**      | Closure-based middleware that checks `req.user.role` against the allowed roles array                 |
| **CLOUDINARY_FOLDER_NAME**    | Environment variable controlling the root folder structure in Cloudinary (e.g., `coursehub/avatars`) |
