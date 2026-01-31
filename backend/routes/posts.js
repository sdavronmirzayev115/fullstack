const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authenticateToken = require("../middleware/auth");
const { createPost } = require("../controllers/postController");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ STORAGE
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

// ✅ MULTER (FAFAQAT SHU BITTASI)
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 🔥 500MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos allowed"));
    }
  },
});

// ✅ ERROR HANDLER
const uploadHandler = (req, res, next) => {
  upload.single("media")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large. Max 500MB allowed",
        });
      }
      return res.status(400).json({ error: err.message });
    }

    if (err) {
      return res.status(400).json({ error: err.message });
    }

    next();
  });
};

router.post("/create", authenticateToken, uploadHandler, createPost);

module.exports = router;
