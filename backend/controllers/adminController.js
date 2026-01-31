const { pool } = require("../config/database");

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        username,
        email,
        name,
        is_admin,
        created_at,
        COALESCE(
          NULLIF(profile_image, ''),
          NULLIF(profile_image, 'null'),
          'https://i.pravatar.cc/150?img=' || (id % 20 + 1)
        ) as profile_image,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts,
        (SELECT COUNT(*) FROM followers WHERE following_id = users.id) AS followers,
        (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load users",
    });
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    if (parseInt(userId) === req.userId) {
      return res.status(400).json({
        success: false,
        error: "Admin cannot delete own account",
      });
    }

    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);

    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await pool.query("BEGIN");

    await pool.query(
      "DELETE FROM followers WHERE follower_id = $1 OR following_id = $1",
      [userId]
    );
    await pool.query("DELETE FROM posts WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    await pool.query("COMMIT");

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const users = await pool.query("SELECT COUNT(*) FROM users");
    const admins = await pool.query(
      "SELECT COUNT(*) FROM users WHERE is_admin = true"
    );
    const posts = await pool.query("SELECT COUNT(*) FROM posts");

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(users.rows[0].count),
        admins: parseInt(admins.rows[0].count),
        regularUsers:
          parseInt(users.rows[0].count) - parseInt(admins.rows[0].count),
        posts: parseInt(posts.rows[0].count),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to load stats",
    });
  }
};
