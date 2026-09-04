import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getProfile,
  updatePassword,
  deleteAccount,
} from "../controllers/user.controller.js";

const router = express.Router();

// 1. Protect a single route by injecting the middleware
router.get("/profile", protect, getProfile);

// 2. Protect ALL routes below this line
// Any route defined after router.use(protect) automatically requires a token
router.use(protect);

router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

export default router;
