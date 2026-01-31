const { pool } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async create({
    email,
    name,
    username,
    date,
    password,
    isAdmin = false,
  }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, name, username, date, password, is_admin)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [email, name, username, date, hashedPassword, isAdmin];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE LOWER(email) = LOWER($1)";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = "SELECT * FROM users WHERE LOWER(username) = LOWER($1)";
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = "SELECT * FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateProfile(id, { profileImage, bio, name }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (profileImage !== undefined) {
      updates.push(`profile_image = $${paramCount}`);
      values.push(profileImage);
      paramCount++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio.substring(0, 500));
      paramCount++;
    }

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(", ")} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getFollowers(userId) {
    const query = `
      SELECT u.* FROM users u
      JOIN followers f ON f.follower_id = u.id
      WHERE f.following_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getFollowing(userId) {
    const query = `
      SELECT u.* FROM users u
      JOIN followers f ON f.following_id = u.id
      WHERE f.follower_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async search(queryText) {
    const query = `
      SELECT id, username, name, profile_image 
      FROM users 
      WHERE username ILIKE $1 OR name ILIKE $1
      LIMIT 20
    `;
    const result = await pool.query(query, [`%${queryText}%`]);
    return result.rows;
  }

  static async getAll() {
    const query =
      "SELECT id, email, name, username, profile_image, bio, created_at FROM users ORDER BY created_at DESC";
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = "DELETE FROM users WHERE id = $1";
    await pool.query(query, [id]);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
