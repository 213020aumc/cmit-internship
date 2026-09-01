import express from "express";
import { createUser } from "../controllers/user.controller.js";

const router = express.Router();

// Minimal route just to get users into the database
router.post("/", createUser);

export default router;
