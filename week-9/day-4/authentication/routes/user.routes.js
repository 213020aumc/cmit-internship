import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import {
  getProfile,
  uploadAvatar,
  updatePassword,
  deleteAccount,
  getAllUsers,
} from "../controllers/user.controller.js";
import { uploadImage } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/profile", getProfile);
router.patch("/update-avatar", uploadImage.single("avatar"), uploadAvatar);
router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

router.get("/", restrictTo("admin"), getAllUsers);

export default router;
