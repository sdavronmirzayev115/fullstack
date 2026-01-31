const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const getRandomAvatar = require("../utils/getRandomAvatar");

const signup = async (req, res) => {
  try {
    const { email, fullName, username, birthday, password } = req.body;

    if (!email || !fullName || !username || !birthday || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let formattedDate;
    if (birthday.includes(".")) {
      const [day, month, year] = birthday.split(".");
      formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
    } else {
      formattedDate = birthday;
    }

    const emailCheck = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)",
      [email]
    );
    if (emailCheck.rows.length) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const usernameCheck = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(username)=LOWER($1)",
      [username]
    );
    if (usernameCheck.rows.length) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar = getRandomAvatar();

    const result = await pool.query(
      `INSERT INTO users 
       (email, name, username, date, password, profile_image)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, username, email, profile_image`,
      [
        email,
        fullName,
        username.toLowerCase(),
        formattedDate,
        hashedPassword,
        avatar,
      ]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      profileImage: user.profile_image,
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

const login = async (req, res) => {
  try {
    console.log("🔍 LOGIN REQUEST:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("❌ User not found");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    console.log("👤 User found:", {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      type_of_is_admin: typeof user.is_admin,
    });

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log("❌ Invalid password");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isAdmin =
      user.is_admin === true ||
      user.is_admin === "true" ||
      user.is_admin === 1 ||
      user.is_admin === "1";

    console.log("✅ Admin status:", {
      raw: user.is_admin,
      boolean: isAdmin,
      type: typeof user.is_admin,
    });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: isAdmin,
      },
      process.env.JWT_SECRET || "your_secret_key",
      {
        expiresIn: "7d",
      }
    );

    console.log("✅ Login successful for:", user.username, "Admin:", isAdmin);

    res.json({
      token,
      userId: user.id,
      username: user.username,
      isAdmin: isAdmin,
      profileImage: user.profile_image,
    });
    jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};
const adminLogin = async (req, res) => {
  try {
    console.log("🔍 ADMIN LOGIN REQUEST:", req.body);

    const { username, password } = req.body;

    if (username === "admin.com" && password === "20112011") {
      const userResult = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        ["admin.com"]
      );

      let admin;

      if (userResult.rows.length === 0) {
        console.log("👑 Creating admin user...");

        const hashedPassword = await bcrypt.hash("20112011", 10);

        const adminResult = await pool.query(
          `INSERT INTO users 
            (email, name, username, password, is_admin) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, username, email, is_admin`,
          ["admin@admin.com", "Admin", "admin.com", hashedPassword, true]
        );

        admin = adminResult.rows[0];
        console.log("✅ Admin user created:", admin);
      } else {
        admin = userResult.rows[0];

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
          return res.status(400).json({ error: "Invalid credentials" });
        }

        console.log("✅ Admin user exists:", {
          id: admin.id,
          username: admin.username,
          is_admin: admin.is_admin,
          type: typeof admin.is_admin,
        });

        if (admin.is_admin !== true && admin.is_admin !== "true") {
          console.log("🔄 Updating admin status to true...");
          await pool.query("UPDATE users SET is_admin = true WHERE id = $1", [
            admin.id,
          ]);
          admin.is_admin = true;
        }
      }

      const token = jwt.sign(
        {
          userId: admin.id,
          username: admin.username,
          isAdmin: true,
        },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "7d" }
      );

      console.log("🎫 Admin token generated");

      return res.json({
        success: true,
        token,
        userId: admin.id,
        username: admin.username,
        email: admin.email,
        isAdmin: true,
        profileImage: admin.profile_image,
      });
    }

    console.log("❌ Invalid admin credentials");
    res.status(400).json({
      success: false,
      error: "Invalid admin credentials",
    });
  } catch (error) {
    console.error("🔥 ADMIN LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Server error during admin login",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const validatePassword = (password) => {
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
};

const validateEmailOrPhone = (input) => {
  if (input.includes("@")) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input) ? null : "Invalid email format";
  } else if (input.includes("+998")) {
    const phoneRegex = /^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
    return phoneRegex.test(input) ? null : "Invalid phone format";
  }
  return "Please enter a valid email or phone number";
};

module.exports = {
  signup,
  login,
  adminLogin,
  validatePassword,
  validateEmailOrPhone,
};
