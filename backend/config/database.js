// config/database.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "instagram_clone",
  password: process.env.DB_PASSWORD || "password", // O'zingizning parolingiz
  port: process.env.DB_PORT || 5432,
});

// Connection test
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected at:", res.rows[0].now);
  }
});

module.exports = { pool };
