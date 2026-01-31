const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/auth");
const profileController = require("../controllers/profileController");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.post(
  "/setup",
  authenticateToken,
  upload.single("profileImage"),
  profileController.setupProfile
);
router.get("/:username", profileController.getProfile);
router.put(
  "/update",
  authenticateToken,
  upload.single("profileImage"),
  profileController.updateProfile
);
router.post(
  "/follow/:username",
  authenticateToken,
  profileController.followUser
);
router.get("/search/users", authenticateToken, profileController.searchUsers);
router.delete(
  "/delete-account",
  authenticateToken,
  profileController.deleteOwnAccount
);

module.exports = router;
