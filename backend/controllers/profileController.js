const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");

// Setup Profile
const setupProfile = async (req, res) => {
  try {
    console.log("📝 Profile setup request");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const { bio } = req.body;
    const userId = req.userId;
    let profileImage = null;

    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
      console.log("📸 Profile image:", profileImage);
    }

    const result = await pool.query(
      `UPDATE users
       SET bio = COALESCE($1, bio), 
           profile_image = COALESCE($2, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, bio, profile_image`,
      [bio?.substring(0, 500), profileImage, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    console.log("✅ Profile updated:", user);

    res.json({
      message: "Profile updated",
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        profileImage: user.profile_image,
      },
    });
  } catch (error) {
    console.error("❌ Setup profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.userId;

    console.log(`📊 Getting profile for: ${username}`);

    const userQuery = await pool.query(
      `SELECT id, username, name, bio, profile_image, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userQuery.rows[0];

    const followersQuery = await pool.query(
      `SELECT COUNT(*) as count FROM followers WHERE following_id = $1`,
      [user.id]
    );

    const followingQuery = await pool.query(
      `SELECT COUNT(*) as count FROM followers WHERE follower_id = $1`,
      [user.id]
    );

    const postsQuery = await pool.query(
      `SELECT COUNT(*) as count FROM posts WHERE user_id = $1`,
      [user.id]
    );

    let isFollowing = false;
    if (currentUserId) {
      const followCheck = await pool.query(
        `SELECT 1 FROM followers 
         WHERE follower_id = $1 AND following_id = $2`,
        [currentUserId, user.id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    const profileData = {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      profileImage: user.profile_image,
      profile_image: user.profile_image, // Add both for compatibility
      followers: parseInt(followersQuery.rows[0].count),
      following: parseInt(followingQuery.rows[0].count),
      posts: parseInt(postsQuery.rows[0].count),
      isFollowing: isFollowing,
      createdAt: user.created_at,
    };

    console.log("✅ Profile data:", profileData);
    res.json(profileData);
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { bio, name } = req.body;
    const userId = req.userId;
    let profileImage;

    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE users
       SET bio = COALESCE($1, bio),
           name = COALESCE($2, name),
           profile_image = COALESCE($3, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, name, bio, profile_image`,
      [bio?.substring(0, 500), name, profileImage, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      message: "Profile updated",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        profileImage: user.profile_image,
      },
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Follow User
const followUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const followerId = req.userId;
    const { username } = req.params;

    console.log("📍 Follow request:", { followerId, username });

    await client.query("BEGIN");

    const userQuery = await client.query(
      `SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );

    if (userQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const followingId = userQuery.rows[0].id;

    if (followerId === followingId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const checkQuery = await client.query(
      `SELECT * FROM followers
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    let isFollowing;

    if (checkQuery.rows.length > 0) {
      console.log("👎 Unfollowing...");

      await client.query(
        `DELETE FROM followers
         WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );

      isFollowing = false;
      console.log("✅ Unfollowed successfully");
    } else {
      console.log("👍 Following...");

      await client.query(
        `INSERT INTO followers (follower_id, following_id)
         VALUES ($1, $2)`,
        [followerId, followingId]
      );

      isFollowing = true;
      console.log("✅ Followed successfully");

      try {
        const followerQuery = await client.query(
          "SELECT username FROM users WHERE id = $1",
          [followerId]
        );

        if (followerQuery.rows[0]) {
          await client.query(
            `INSERT INTO notifications 
             (user_id, type, from_user_id, from_username)
             VALUES ($1, 'follow', $2, $3)`,
            [followingId, followerId, followerQuery.rows[0].username]
          );
          console.log("📬 Notification created");
        }
      } catch (notifError) {
        console.log(
          "⚠️ Notification error (non-critical):",
          notifError.message
        );
      }
    }

    await client.query("COMMIT");

    console.log("✅ Follow action completed:", { isFollowing });
    res.json({ isFollowing: isFollowing });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("🔥 Follow user error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Search Users
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;

    const result = await pool.query(
      `SELECT id, username, name, profile_image,
              (SELECT COUNT(*) FROM followers WHERE following_id = users.id) as follower_count
       FROM users
       WHERE username ILIKE $1 OR name ILIKE $1
       ORDER BY 
          CASE 
              WHEN username ILIKE $1 THEN 1
              WHEN name ILIKE $1 THEN 2
              ELSE 3
          END,
          follower_count DESC
       LIMIT 20`,
      [searchTerm]
    );

    const users = result.rows.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      profileImage: user.profile_image,
      followerCount: user.follower_count,
    }));

    res.json(users);
  } catch (error) {
    console.error("❌ Search users error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete Own Account
const deleteOwnAccount = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.userId;

    await client.query("BEGIN");

    const userQuery = await client.query(
      "SELECT profile_image FROM users WHERE id = $1",
      [userId]
    );

    if (userQuery.rows[0]?.profile_image) {
      const imagePath = path.join(
        __dirname,
        "..",
        userQuery.rows[0].profile_image
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await client.query(
      "DELETE FROM followers WHERE follower_id = $1 OR following_id = $1",
      [userId]
    );

    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Delete account error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get All Users (Admin)
const getAllUsers = async (req, res) => {
  try {
    console.log("📊 Getting all users for admin...");

    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.username,
        u.profile_image,
        u.bio,
        u.is_admin,
        u.created_at,
        COALESCE(p.post_count, 0) as post_count,
        COALESCE(f1.follower_count, 0) as follower_count,
        COALESCE(f2.following_count, 0) as following_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as post_count 
        FROM posts 
        GROUP BY user_id
      ) p ON u.id = p.user_id
      LEFT JOIN (
        SELECT following_id, COUNT(*) as follower_count 
        FROM followers 
        GROUP BY following_id
      ) f1 ON u.id = f1.following_id
      LEFT JOIN (
        SELECT follower_id, COUNT(*) as following_count 
        FROM followers 
        GROUP BY follower_id
      ) f2 ON u.id = f2.follower_id
      WHERE u.is_admin = false OR u.is_admin IS NULL
      ORDER BY u.created_at DESC
    `);

    console.log("✅ Found users:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("🔥 Get all users error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete User (Admin)
const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const adminId = req.userId;

    console.log("🗑️ Admin deleting user:", { adminId, userId });

    await client.query("BEGIN");

    const adminCheck = await client.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [adminId]
    );

    if (!adminCheck.rows[0]?.is_admin) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Admin access required" });
    }

    const userQuery = await client.query(
      "SELECT profile_image, username FROM users WHERE id = $1",
      [userId]
    );

    if (userQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const userToDelete = userQuery.rows[0];

    if (userToDelete.profile_image) {
      const imagePath = path.join(__dirname, "..", userToDelete.profile_image);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error("Error deleting profile image:", err);
        }
      }
    }

    await client.query(
      "DELETE FROM followers WHERE follower_id = $1 OR following_id = $1",
      [userId]
    );

    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");

    console.log("✅ User deleted:", userToDelete.username);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("🔥 Delete user error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  setupProfile,
  getProfile,
  updateProfile,
  followUser,
  searchUsers,
  deleteOwnAccount,
  getAllUsers,
  deleteUser,
};
