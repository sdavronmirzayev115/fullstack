const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { pool } = require("../config/database");

// Online status update
router.put("/online", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query(
      "UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error setting online status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Offline status update
router.put("/offline", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query(
      "UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error setting offline status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get conversations
const { getConversations } = require("../controllers/messageController");
router.get("/conversations", authenticateToken, getConversations);

// Get messages
const { getMessages } = require("../controllers/messageController");
router.get("/:userId", authenticateToken, getMessages);

// Send message
const { sendMessage } = require("../controllers/messageController");
router.post("/send", authenticateToken, sendMessage);

// Search users for messaging
router.get("/search/users", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.userId;

    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;

    const query = `
      SELECT u.id, u.username, u.name, u.profile_image, u.is_online,
        EXISTS (
          SELECT 1 FROM followers f 
          WHERE f.follower_id = $1 AND f.following_id = u.id
        ) as is_following
      FROM users u
      WHERE (u.username ILIKE $2 OR u.name ILIKE $2)
        AND u.id != $1
      ORDER BY is_following DESC, u.username ASC
      LIMIT 20
    `;

    const result = await pool.query(query, [userId, searchTerm]);

    const users = result.rows.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      profileImage: user.profile_image,
      isOnline: user.is_online,
      isFollowing: user.is_following,
    }));

    res.json(users);
  } catch (error) {
    console.error("❌ Error searching users:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mark messages as read
router.put("/read/:userId", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.userId;
    const otherUserId = req.params.userId;

    await pool.query(
      `UPDATE messages SET is_read = true 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [otherUserId, currentUserId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get unread message count
router.get("/unread/count", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const query = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE receiver_id = $1 AND is_read = false
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      count: parseInt(result.rows[0].count),
    });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
