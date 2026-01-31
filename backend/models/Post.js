const { pool } = require("../config/database");

class Post {
  static async create({
    userId,
    username,
    profileImage,
    media,
    title,
    hashtags = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const postQuery = `
        INSERT INTO posts (user_id, username, profile_image, media, title)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const postResult = await client.query(postQuery, [
        userId,
        username,
        profileImage,
        media,
        title,
      ]);
      const post = postResult.rows[0];

      if (hashtags.length > 0) {
        for (const hashtag of hashtags) {
          const hashtagQuery = `
            INSERT INTO post_hashtags (post_id, hashtag)
            VALUES ($1, $2)
          `;
          await client.query(hashtagQuery, [post.id, hashtag]);
        }
      }

      await client.query("COMMIT");
      return post;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByUser(username) {
    const query = `
      SELECT p.*, 
        ARRAY_AGG(ph.hashtag) FILTER (WHERE ph.hashtag IS NOT NULL) as hashtags,
        COALESCE(pl.like_count, 0) as likes_count,
        COALESCE(c.comments_count, 0) as comments_count
      FROM posts p
      LEFT JOIN post_hashtags ph ON p.id = ph.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as like_count 
        FROM post_likes 
        GROUP BY post_id
      ) pl ON p.id = pl.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as comments_count 
        FROM comments 
        GROUP BY post_id
      ) c ON p.id = c.post_id
      WHERE p.username = $1
      GROUP BY p.id, pl.like_count, c.comments_count
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT p.*, 
        ARRAY_AGG(ph.hashtag) FILTER (WHERE ph.hashtag IS NOT NULL) as hashtags
      FROM posts p
      LEFT JOIN post_hashtags ph ON p.id = ph.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const query = "DELETE FROM posts WHERE id = $1 AND user_id = $2";
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  static async like(postId, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const checkQuery =
        "SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2";
      const checkResult = await client.query(checkQuery, [postId, userId]);

      if (checkResult.rows.length > 0) {
        const deleteQuery =
          "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2";
        await client.query(deleteQuery, [postId, userId]);
        await client.query("COMMIT");
        return { isLiked: false };
      } else {
        const insertQuery =
          "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)";
        await client.query(insertQuery, [postId, userId]);
        await client.query("COMMIT");
        return { isLiked: true };
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async addComment(postId, userId, username, text) {
    const query = `
      INSERT INTO comments (post_id, user_id, username, text)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [postId, userId, username, text]);
    return result.rows[0];
  }

  static async getComments(postId) {
    const query =
      "SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC";
    const result = await pool.query(query, [postId]);
    return result.rows;
  }

  static async getFeed(userId) {
    const query = `
      SELECT p.*, 
        ARRAY_AGG(ph.hashtag) FILTER (WHERE ph.hashtag IS NOT NULL) as hashtags,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
        COALESCE(pl.like_count, 0) as likes_count,
        COALESCE(c.comments_count, 0) as comments_count
      FROM posts p
      LEFT JOIN post_hashtags ph ON p.id = ph.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as like_count 
        FROM post_likes 
        GROUP BY post_id
      ) pl ON p.id = pl.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as comments_count 
        FROM comments 
        GROUP BY post_id
      ) c ON p.id = c.post_id
      WHERE p.user_id = $1 OR p.user_id IN (
        SELECT following_id FROM followers WHERE follower_id = $1
      )
      GROUP BY p.id, pl.like_count, c.comments_count
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getStories(userId) {
    const query = `
      SELECT DISTINCT ON (u.id) 
        u.id, u.username, u.profile_image,
        s.media, s.name, s.created_at
      FROM users u
      JOIN stories s ON u.id = s.user_id
      WHERE (u.id = $1 OR u.id IN (
        SELECT following_id FROM followers WHERE follower_id = $1
      )) AND s.expires_at > NOW()
      ORDER BY u.id, s.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = Post;
