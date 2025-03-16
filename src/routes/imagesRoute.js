import express from "express";
import multer from "multer";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

const upload = multer({
  dest: "./uploads",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File should be an image file"));
    }
    cb(null, true);
  },
});

router
  .route("/")
  // 이미지 파일 업로드 API
  .post(
    (req, res, next) => {
      upload.array("files", 10)(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    },
    asyncHandler(async (req, res) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "File error" });
      }

      const urls = req.files.map(
        (file) => `http://localhost:${process.env.PORT}/images/${file.filename}`
      );

      res.json({ urls });
    })
  );

export default router;
