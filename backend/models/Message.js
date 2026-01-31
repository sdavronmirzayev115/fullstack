const { pool } = require("../config/database");

class Message {
  static async create({
    senderId,
    senderUsername,
    receiverId,
    receiverUsername,
    text,
  }) {
    const query = `
      INSERT INTO messages (sender_id, sender_username, receiver_id, receiver_username, text)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      senderId,
      senderUsername,
      receiverId,
      receiverUsername,
      text,
    ]);
    return result.rows[0];
  }

  static async getConversations(userId) {
    try {
      console.log("📨 Getting conversations for user:", userId);

      // Soddalashtirilgan so'rov - faqat followers bilan
      const query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.profile_image,
          u.is_online,
          u.last_seen,
          (
            SELECT text 
            FROM messages m 
            WHERE (m.sender_id = $1 AND m.receiver_id = u.id) 
               OR (m.receiver_id = $1 AND m.sender_id = u.id)
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT created_at 
            FROM messages m2 
            WHERE (m2.sender_id = $1 AND m2.receiver_id = u.id) 
               OR (m2.receiver_id = $1 AND m2.sender_id = u.id)
            ORDER BY m2.created_at DESC 
            LIMIT 1
          ) as last_message_time,
          (
            SELECT COUNT(*) 
            FROM messages m3 
            WHERE m3.sender_id = u.id 
              AND m3.receiver_id = $1 
              AND m3.is_read = false
          ) as unread_count
        FROM users u
        WHERE u.id IN (
          -- Faqat o'zaro follow qilganlar
          SELECT following_id FROM followers WHERE follower_id = $1
          UNION
          SELECT follower_id FROM followers WHERE following_id = $1
        )
        AND u.id != $1
        ORDER BY last_message_time DESC NULLS LAST
      `;

      const result = await pool.query(query, [userId]);
      console.log(`✅ Found ${result.rows.length} conversations`);

      return result.rows;
    } catch (error) {
      console.error("❌ Error in getConversations:", error);
      throw error;
    }
  }

  static async getMessages(userId, otherUserId) {
    try {
      console.log(`📩 Getting messages between ${userId} and ${otherUserId}`);

      const query = `
        SELECT m.*, 
          s.username as sender_username,
          s.profile_image as sender_profile_image,
          r.username as receiver_username
        FROM messages m
        LEFT JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.receiver_id = r.id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.created_at ASC
      `;

      const result = await pool.query(query, [userId, otherUserId]);
      console.log(`✅ Found ${result.rows.length} messages`);

      return result.rows;
    } catch (error) {
      console.error("❌ Error in getMessages:", error);
      throw error;
    }
  }

  static async markAsRead(senderId, receiverId) {
    try {
      const query = `
        UPDATE messages 
        SET is_read = true 
        WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false
      `;

      const result = await pool.query(query, [senderId, receiverId]);
      console.log(`✅ Marked messages as read: ${result.rowCount} updated`);

      return result.rowCount;
    } catch (error) {
      console.error("❌ Error in markAsRead:", error);
      throw error;
    }
  }

  static async findUnreadCount(receiverId, senderId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false
    `;
    const result = await pool.query(query, [senderId, receiverId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Message;
