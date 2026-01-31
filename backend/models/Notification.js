const { pool } = require("../config/database");

class Notification {
  static async create({
    userId,
    type,
    fromUserId,
    fromUsername,
    postId = null,
    messageId = null,
    text = "",
  }) {
    const query = `
      INSERT INTO notifications 
        (user_id, type, from_user_id, from_username, post_id, message_id, text)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId,
      type,
      fromUserId,
      fromUsername,
      postId,
      messageId,
      text,
    ]);
    return result.rows[0];
  }

  static async findByUser(userId) {
    const query = `
      SELECT n.*, u.profile_image as from_profile_image
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async markAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1 AND is_read = false
    `;
    await pool.query(query, [userId]);
  }

  static async countUnread(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Notification;
