const Notification = require("../models/Notification");
const { pool } = require("../config/database");

const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const query = `
      SELECT 
        n.*,
        u.profile_image as from_profile_image,
        u.username as sender_username
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);

    const notifications = result.rows.map((notif) => ({
      id: notif.id,
      userId: notif.user_id,
      type: notif.type,
      fromUserId: notif.from_user_id,
      fromUsername: notif.from_username || notif.sender_username,
      fromProfileImage: notif.from_profile_image,
      postId: notif.post_id,
      messageId: notif.message_id,
      text: notif.text,
      isRead: notif.is_read,
      createdAt: notif.created_at,
    }));

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
