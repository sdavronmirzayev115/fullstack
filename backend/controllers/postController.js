const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");

const createPost = async (req, res) => {
  try {
    console.log("USER ID:", req.userId);
    console.log("FILE:", req.file);
    console.log("BODY:", req.body);

    const userId = req.userId;
    const { caption } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Media file required" });
    }

    // username olish
    const userResult = await pool.query(
      "SELECT username FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResult.rows[0].username;

    // post yaratish
    const postResult = await pool.query(
      `INSERT INTO posts (user_id, username, caption, media)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, username, caption || "", req.file.filename]
    );

    res.status(201).json({
      success: true,
      post: postResult.rows[0],
    });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const query = `
      SELECT p.id, p.user_id, p.media, p.title, p.created_at, p.likes_count, p.comments_count,
             u.username, u.profile_image,
             EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id 
                     AND pl.user_id = (SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1)) as is_liked,
             ARRAY_AGG(DISTINCT ph.hashtag) FILTER (WHERE ph.hashtag IS NOT NULL) as hashtags
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN post_hashtags ph ON p.id = ph.post_id
      WHERE LOWER(u.username) = LOWER($1)
      GROUP BY p.id, u.username, u.profile_image
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [username]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getFeed = async (req, res) => {
  try {
    const userId = req.userId;
    const followingResult = await pool.query(
      "SELECT following_id FROM followers WHERE follower_id = $1",
      [userId]
    );
    const followingIds = followingResult.rows.map((row) => row.following_id);
    followingIds.push(userId);

    const query = `
      SELECT p.id, p.user_id, p.media, p.title, p.likes_count, p.comments_count, p.created_at,
             u.username, u.profile_image,
             EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as is_liked,
             ARRAY_AGG(DISTINCT ph.hashtag) FILTER (WHERE ph.hashtag IS NOT NULL) as hashtags
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN post_hashtags ph ON p.id = ph.post_id
      WHERE p.user_id = ANY($2)
      GROUP BY p.id, u.username, u.profile_image
      ORDER BY p.created_at DESC LIMIT 50
    `;
    const result = await pool.query(query, [userId, followingIds]);

    for (let post of result.rows) {
      const comments = await pool.query(
        `SELECT c.id, c.post_id, c.username, c.text, c.created_at,
                u.id as user_id, u.profile_image
         FROM comments c 
         LEFT JOIN users u ON c.username = u.username 
         WHERE c.post_id = $1 
         ORDER BY c.created_at ASC`,
        [post.id]
      );
      post.comments = comments.rows;
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReels = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.user_id, p.media, p.title, p.likes_count, p.comments_count, p.created_at,
             u.username, u.profile_image
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.media IS NOT NULL AND
            (LOWER(p.media) LIKE '%.mp4%' OR LOWER(p.media) LIKE '%.mov%' OR 
             LOWER(p.media) LIKE '%.webm%' OR LOWER(p.media) LIKE '%.avi%')
      ORDER BY p.created_at DESC LIMIT 20
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStories = async (req, res) => {
  try {
    const userId = req.userId;
    const query = `
      SELECT s.id, s.user_id, s.media, s.name, s.created_at, s.expires_at,
             u.username, u.profile_image
      FROM stories s
      INNER JOIN users u ON s.user_id = u.id
      WHERE (s.user_id = $1 OR s.user_id IN (SELECT following_id FROM followers WHERE follower_id = $1)) 
            AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const likePost = async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId } = req.params;
    const userId = req.userId;

    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );

    if (existing.rows.length > 0) {
      await client.query(
        "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId]
      );
      await client.query(
        "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1",
        [postId]
      );
      await client.query("COMMIT");
      res.json({ isLiked: false });
    } else {
      await client.query(
        "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
        [postId, userId]
      );
      await client.query(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
        [postId]
      );
      await client.query("COMMIT");
      res.json({ isLiked: true });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text required" });
    }

    const userResult = await pool.query(
      "SELECT username, profile_image FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResult.rows[0].username;
    const profile_image = userResult.rows[0].profile_image;

    const commentResult = await pool.query(
      `INSERT INTO comments (post_id, username, text, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, post_id, username, text, created_at`,
      [postId, username, text.trim()]
    );

    await pool.query(
      "UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1",
      [postId]
    );

    const comment = {
      ...commentResult.rows[0],
      user_id: userId,
      profile_image: profile_image,
    };

    res.json({ success: true, comment: comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: error.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text required" });
    }

    const userResult = await pool.query(
      "SELECT username FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResult.rows[0].username;

    const checkOwner = await pool.query(
      "SELECT username FROM comments WHERE id = $1",
      [commentId]
    );
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (checkOwner.rows[0].username !== username) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this comment" });
    }

    const result = await pool.query(
      "UPDATE comments SET text = $1 WHERE id = $2 RETURNING *",
      [text.trim(), commentId]
    );
    res.json({ success: true, comment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteComment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT username FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const username = userResult.rows[0].username;

    const checkOwner = await client.query(
      "SELECT username, post_id FROM comments WHERE id = $1",
      [commentId]
    );
    if (checkOwner.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Comment not found" });
    }

    if (checkOwner.rows[0].username !== username) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    const postId = checkOwner.rows[0].post_id;

    await client.query("DELETE FROM comments WHERE id = $1", [commentId]);
    await client.query(
      "UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1",
      [postId]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  createPost,
  getUserPosts,
  getFeed,
  getReels,
  getStories,
  likePost,
  addComment,
  updateComment,
  deleteComment,
};
