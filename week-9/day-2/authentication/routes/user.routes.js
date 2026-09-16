import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import {
  getProfile,
  updatePassword,
  deleteAccount,
  getAllUsers,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect);

router.get("/profile", getProfile);
router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

router.get("/", restrictTo("admin"), getAllUsers);

export default router;
