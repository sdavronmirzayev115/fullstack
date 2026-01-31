const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token yo‘q
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  // "Bearer TOKEN"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT ERROR:", err);
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // 🔥 ENG MUHIM JOY
    req.userId = decoded.userId; // ← POSTLAR SHU BILAN ISHLAYDI
    req.username = decoded.username;
    req.isAdmin = decoded.isAdmin;

    next();
  });
};

module.exports = authenticateToken;
