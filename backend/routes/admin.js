const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const { pool } = require("../config/database");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!result.rows[0].is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Admin check failed" });
  }
};

router.get(
  "/users",
  authenticateToken,
  requireAdmin,
  adminController.getAllUsers
);
router.delete(
  "/users/:userId",
  authenticateToken,
  requireAdmin,
  adminController.deleteUser
);
router.get("/stats", authenticateToken, requireAdmin, adminController.getStats);

router.post(
  "/update-profile-image",
  authenticateToken,
  requireAdmin,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Image file required",
        });
      }

      const profileImage = `/uploads/${req.file.filename}`;

      const userCheck = await pool.query(
        "SELECT profile_image FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const oldImage = userCheck.rows[0].profile_image;
      if (
        oldImage &&
        !oldImage.startsWith("http") &&
        oldImage !== "/default-avatar.png"
      ) {
        const oldImagePath = path.join(__dirname, "..", oldImage);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }
      }

      await pool.query("UPDATE users SET profile_image = $1 WHERE id = $2", [
        profileImage,
        userId,
      ]);

      res.json({
        success: true,
        profileImage: profileImage,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
