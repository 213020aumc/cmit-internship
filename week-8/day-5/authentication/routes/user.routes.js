import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import {
  getProfile,
  updatePassword,
  deleteAccount,
  getAllUsers,
} from "../controllers/user.controller.js";

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Self-service routes (Available to any authenticated role: user, instructor, admin)
router.get("/profile", getProfile);
router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

// Admin-only management routes (RBAC)
router.get("/", restrictTo("admin"), getAllUsers);

export default router;
