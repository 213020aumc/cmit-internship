import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getProfile,
  updatePassword,
  deleteAccount,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect);
router.get("/profile", getProfile);
router.put("/update-password", updatePassword);
router.delete("/delete-account", deleteAccount);

export default router;
