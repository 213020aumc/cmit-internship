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
