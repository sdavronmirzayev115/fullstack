require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");

console.log("=== SERVER STARTING ===");

const app = express();

// Global memory database
global.database = {
  users: [],
  messages: [],
  followers: [],
  posts: [],
  notifications: [],
};

// Demo ma'lumotlar qo'shish
const initializeDatabase = () => {
  // Demo admin user
  const adminPassword = bcrypt.hashSync("20112011", 10);
  global.database.users.push({
    id: 1,
    email: "admin@admin.com",
    username: "admin.com",
    password: adminPassword,
    name: "Admin",
    profile_image: null,
    is_online: false,
    last_seen: new Date(),
    created_at: new Date(),
    is_admin: true,
    bio: null,
  });

  // Demo regular user
  const userPassword = bcrypt.hashSync("password", 10);
  global.database.users.push({
    id: 2,
    email: "user@test.com",
    username: "user",
    password: userPassword,
    name: "Test User",
    profile_image: "https://i.pravatar.cc/150?img=3",
    is_online: false,
    last_seen: new Date(),
    created_at: new Date(),
    is_admin: false,
    bio: "This is a test user",
  });

  // Demo messages
  global.database.messages.push({
    id: 1,
    sender_id: 2,
    receiver_id: 1,
    sender_username: "user",
    receiver_username: "admin.com",
    text: "Salom! Test xabar",
    is_read: false,
    created_at: new Date(),
  });

  // Demo follow relationship
  global.database.followers.push({
    id: 1,
    follower_id: 2,
    following_id: 1,
    created_at: new Date(),
  });

  // Demo posts
  global.database.posts.push({
    id: 1,
    user_id: 1,
    username: "admin.com",
    media: "/uploads/sample.jpg",
    title: "Welcome to Instagram Clone",
    hashtags: "welcome,test",
    likes_count: 5,
    comments_count: 2,
    created_at: new Date(),
  });

  console.log("✅ Database initialized with demo data");
};

initializeDatabase();

const projectRoot = __dirname;
const uploadsDir = path.join(projectRoot, "uploads");
const publicDir = path.join(projectRoot, "public");

console.log("📂 Project root:", projectRoot);
console.log("📁 Uploads directory:", uploadsDir);
console.log("📁 Public directory:", publicDir);

[uploadsDir, publicDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images and videos are allowed!"));
  },
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);

app.options("*", cors());
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use("/public", express.static(publicDir));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token is required",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_key_change_this";
    const decoded = jwt.verify(token, secret);

    req.userId = decoded.userId;
    req.username = decoded.username;
    req.isAdmin = decoded.isAdmin === true;

    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// ========== CONTROLLERS ==========

// Auth Controller
const authController = {
  signup: async (req, res) => {
    try {
      const { email, username, password, name } = req.body;
      const db = global.database;

      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: "Email, username and password are required",
        });
      }

      const existingUser = db.users.find(
        (u) => u.email === email || u.username === username
      );
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User with this email or username already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: db.users.length + 1,
        email,
        username,
        password: hashedPassword,
        name: name || username,
        profile_image: null,
        is_online: true,
        last_seen: new Date(),
        created_at: new Date(),
        is_admin: false,
        bio: null,
      };

      db.users.push(newUser);

      const token = jwt.sign(
        {
          userId: newUser.id,
          username: newUser.username,
          isAdmin: newUser.is_admin,
        },
        process.env.JWT_SECRET || "your_jwt_secret_key_change_this",
        { expiresIn: "30d" }
      );
      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          isAdmin: newUser.is_admin,
        },
        token,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({
        success: false,
        error: "Server error during signup",
      });
    }
  },

  login: async (req, res) => {
    try {
      const { emailOrUsername, password } = req.body;
      const db = global.database;

      if (!emailOrUsername || !password) {
        return res.status(400).json({
          success: false,
          error: "Email/username and password are required",
        });
      }

      const user = db.users.find(
        (u) => u.email === emailOrUsername || u.username === emailOrUsername
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      // Update online status
      user.is_online = true;
      user.last_seen = new Date();

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          isAdmin: user.is_admin,
        },
        process.env.JWT_SECRET || "your_jwt_secret_key_change_this",
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          profileImage: user.profile_image,
          isAdmin: user.is_admin,
          bio: user.bio,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Server error during login",
      });
    }
  },

  adminLogin: async (req, res) => {
    try {
      const { username, password } = req.body;
      const db = global.database;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Username and password are required",
        });
      }

      const user = db.users.find((u) => u.username === username);

      if (!user || !user.is_admin) {
        return res.status(401).json({
          success: false,
          error: "Invalid admin credentials",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      user.is_online = true;
      user.last_seen = new Date();

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          isAdmin: user.is_admin,
        },
        process.env.JWT_SECRET || "your_jwt_secret_key_change_this",
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        message: "Admin login successful",
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin,
        },
        token,
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        error: "Server error during admin login",
      });
    }
  },
};

// Profile Controller
const profileController = {
  setupProfile: async (req, res) => {
    try {
      const userId = req.userId;
      const { name, bio } = req.body;
      let profileImage = null;

      if (req.file) {
        profileImage = `/uploads/${req.file.filename}`;
      }

      const db = global.database;
      const userIndex = db.users.findIndex((u) => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Update user
      db.users[userIndex] = {
        ...db.users[userIndex],
        name: name || db.users[userIndex].name,
        bio: bio || db.users[userIndex].bio,
        profile_image: profileImage || db.users[userIndex].profile_image,
      };

      res.json({
        success: true,
        message: "Profile setup successful",
        user: {
          id: db.users[userIndex].id,
          username: db.users[userIndex].username,
          name: db.users[userIndex].name,
          profileImage: db.users[userIndex].profile_image,
          bio: db.users[userIndex].bio,
        },
      });
    } catch (error) {
      console.error("Profile setup error:", error);
      res.status(500).json({
        success: false,
        error: "Server error during profile setup",
      });
    }
  },

  getProfile: async (req, res) => {
    try {
      const { username } = req.params;
      const db = global.database;

      const user = db.users.find((u) => u.username === username);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Count posts
      const postsCount = db.posts.filter((p) => p.user_id === user.id).length;

      // Count followers
      const followersCount = db.followers.filter(
        (f) => f.following_id === user.id
      ).length;

      // Count following
      const followingCount = db.followers.filter(
        (f) => f.follower_id === user.id
      ).length;

      // Check if current user follows this user
      const currentUserId = req.userId;
      const isFollowing = db.followers.some(
        (f) => f.follower_id === currentUserId && f.following_id === user.id
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          profileImage: user.profile_image,
          bio: user.bio,
          isOnline: user.is_online,
          lastSeen: user.last_seen,
          createdAt: user.created_at,
          isAdmin: user.is_admin,
        },
        stats: {
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        },
        isFollowing,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching profile",
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = req.userId;
      const { name, bio } = req.body;
      let profileImage = null;

      if (req.file) {
        profileImage = `/uploads/${req.file.filename}`;
      }

      const db = global.database;
      const userIndex = db.users.findIndex((u) => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Update user
      const updatedUser = {
        ...db.users[userIndex],
        name: name || db.users[userIndex].name,
        bio: bio || db.users[userIndex].bio,
      };

      if (profileImage) {
        updatedUser.profile_image = profileImage;
      }

      db.users[userIndex] = updatedUser;

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          profileImage: updatedUser.profile_image,
          bio: updatedUser.bio,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        error: "Server error updating profile",
      });
    }
  },

  followUser: async (req, res) => {
    try {
      const currentUserId = req.userId;
      const { username } = req.params;
      const db = global.database;

      const userToFollow = db.users.find((u) => u.username === username);
      if (!userToFollow) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (currentUserId === userToFollow.id) {
        return res.status(400).json({
          success: false,
          error: "You cannot follow yourself",
        });
      }

      const existingFollow = db.followers.find(
        (f) =>
          f.follower_id === currentUserId && f.following_id === userToFollow.id
      );

      if (existingFollow) {
        // Unfollow
        db.followers = db.followers.filter((f) => f.id !== existingFollow.id);
        return res.json({
          success: true,
          isFollowing: false,
          message: "Unfollowed successfully",
        });
      } else {
        // Follow
        const newFollow = {
          id: db.followers.length + 1,
          follower_id: currentUserId,
          following_id: userToFollow.id,
          created_at: new Date(),
        };
        db.followers.push(newFollow);

        // Add notification
        const notification = {
          id: db.notifications.length + 1,
          user_id: userToFollow.id,
          from_user_id: currentUserId,
          from_username: db.users.find((u) => u.id === currentUserId).username,
          type: "follow",
          message: "started following you",
          is_read: false,
          created_at: new Date(),
        };
        db.notifications.push(notification);

        return res.json({
          success: true,
          isFollowing: true,
          message: "Followed successfully",
        });
      }
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({
        success: false,
        error: "Server error following user",
      });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { q } = req.query;
      const currentUserId = req.userId;
      const db = global.database;

      if (!q || q.trim() === "") {
        return res.json([]);
      }

      const searchTerm = q.toLowerCase().trim();
      const users = db.users.filter(
        (user) =>
          user.id !== currentUserId &&
          (user.username.toLowerCase().includes(searchTerm) ||
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm))
      );

      const results = users.map((user) => {
        const isFollowing = db.followers.some(
          (f) => f.follower_id === currentUserId && f.following_id === user.id
        );

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          profileImage: user.profile_image,
          isOnline: user.is_online,
          isFollowing,
        };
      });

      res.json(results);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({
        success: false,
        error: "Server error searching users",
      });
    }
  },

  deleteOwnAccount: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      // Remove user
      db.users = db.users.filter((u) => u.id !== userId);

      // Remove user's posts
      db.posts = db.posts.filter((p) => p.user_id !== userId);

      // Remove user's messages
      db.messages = db.messages.filter(
        (m) => m.sender_id !== userId && m.receiver_id !== userId
      );

      // Remove follow relationships
      db.followers = db.followers.filter(
        (f) => f.follower_id !== userId && f.following_id !== userId
      );

      // Remove notifications
      db.notifications = db.notifications.filter(
        (n) => n.user_id !== userId && n.from_user_id !== userId
      );

      res.json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({
        success: false,
        error: "Server error deleting account",
      });
    }
  },
};

// Post Controller
const postController = {
  createPost: async (req, res) => {
    try {
      const userId = req.userId;
      const { title, hashtags } = req.body;
      const db = global.database;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Media file is required",
        });
      }

      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const newPost = {
        id: db.posts.length + 1,
        user_id: userId,
        username: user.username,
        media: `/uploads/${req.file.filename}`,
        title: title || "",
        hashtags: hashtags || "",
        likes_count: 0,
        comments_count: 0,
        created_at: new Date(),
      };

      db.posts.push(newPost);

      // Add notifications to followers
      const followers = db.followers.filter((f) => f.following_id === userId);
      followers.forEach((follower) => {
        const notification = {
          id: db.notifications.length + 1,
          user_id: follower.follower_id,
          from_user_id: userId,
          from_username: user.username,
          type: "post",
          message: "posted a new photo",
          post_id: newPost.id,
          is_read: false,
          created_at: new Date(),
        };
        db.notifications.push(notification);
      });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: newPost,
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({
        success: false,
        error: "Server error creating post",
      });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const { username } = req.params;
      const db = global.database;

      const user = db.users.find((u) => u.username === username);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const posts = db.posts
        .filter((p) => p.user_id === user.id)
        .map((post) => {
          // Check if current user liked this post
          const isLiked = post.likes && post.likes.includes(req.userId);

          return {
            ...post,
            is_liked: isLiked || false,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json(posts);
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching posts",
      });
    }
  },

  getFeed: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      // Get users that current user follows
      const following = db.followers
        .filter((f) => f.follower_id === userId)
        .map((f) => f.following_id);

      // Include current user's posts as well
      const feedUserIds = [...following, userId];

      const posts = db.posts
        .filter((p) => feedUserIds.includes(p.user_id))
        .map((post) => {
          // Check if current user liked this post
          const isLiked = post.likes && post.likes.includes(userId);

          return {
            ...post,
            is_liked: isLiked || false,
            user: db.users.find((u) => u.id === post.user_id),
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json(posts);
    } catch (error) {
      console.error("Get feed error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching feed",
      });
    }
  },

  getReels: async (req, res) => {
    try {
      const db = global.database;

      const videoExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
      const reels = db.posts
        .filter((post) => {
          const ext = path.extname(post.media || "").toLowerCase();
          return videoExtensions.includes(ext);
        })
        .map((post) => ({
          ...post,
          user: db.users.find((u) => u.id === post.user_id),
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json(reels);
    } catch (error) {
      console.error("Get reels error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching reels",
      });
    }
  },

  getStories: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      // Get following users
      const following = db.followers
        .filter((f) => f.follower_id === userId)
        .map((f) => f.following_id);

      // For demo, create stories from recent posts
      const stories = [...following, userId]
        .map((userId) => {
          const user = db.users.find((u) => u.id === userId);
          if (!user) return null;

          const userPosts = db.posts
            .filter((p) => p.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          if (userPosts.length === 0) return null;

          const latestPost = userPosts[0];
          return {
            id: `story_${userId}`,
            user_id: userId,
            username: user.username,
            profile_image: user.profile_image,
            media: latestPost.media,
            created_at: latestPost.created_at,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          };
        })
        .filter(Boolean);

      res.json(stories);
    } catch (error) {
      console.error("Get stories error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching stories",
      });
    }
  },

  likePost: async (req, res) => {
    try {
      const userId = req.userId;
      const { postId } = req.params;
      const db = global.database;

      const post = db.posts.find((p) => p.id === parseInt(postId));
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Initialize likes array if not exists
      if (!post.likes) {
        post.likes = [];
      }

      const userIndex = post.likes.indexOf(userId);
      let isLiked = false;

      if (userIndex === -1) {
        // Like the post
        post.likes.push(userId);
        post.likes_count = (post.likes_count || 0) + 1;
        isLiked = true;

        // Add notification if not own post
        if (post.user_id !== userId) {
          const notification = {
            id: db.notifications.length + 1,
            user_id: post.user_id,
            from_user_id: userId,
            from_username: db.users.find((u) => u.id === userId).username,
            type: "like",
            message: "liked your post",
            post_id: post.id,
            is_read: false,
            created_at: new Date(),
          };
          db.notifications.push(notification);
        }
      } else {
        // Unlike the post
        post.likes.splice(userIndex, 1);
        post.likes_count = Math.max(0, post.likes_count - 1);
        isLiked = false;
      }

      res.json({
        success: true,
        isLiked,
        likesCount: post.likes_count,
      });
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({
        success: false,
        error: "Server error liking post",
      });
    }
  },

  addComment: async (req, res) => {
    try {
      const userId = req.userId;
      const { postId } = req.params;
      const { text } = req.body;
      const db = global.database;

      if (!text || text.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Comment text is required",
        });
      }

      const post = db.posts.find((p) => p.id === parseInt(postId));
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Initialize comments array if not exists
      if (!post.comments) {
        post.comments = [];
      }

      const newComment = {
        id: post.comments.length + 1,
        post_id: parseInt(postId),
        user_id: userId,
        username: user.username,
        profile_image: user.profile_image,
        text: text.trim(),
        created_at: new Date(),
      };

      post.comments.push(newComment);
      post.comments_count = (post.comments_count || 0) + 1;

      // Add notification if not own post
      if (post.user_id !== userId) {
        const notification = {
          id: db.notifications.length + 1,
          user_id: post.user_id,
          from_user_id: userId,
          from_username: user.username,
          type: "comment",
          message: "commented on your post",
          post_id: post.id,
          is_read: false,
          created_at: new Date(),
        };
        db.notifications.push(notification);
      }

      res.json({
        success: true,
        comment: newComment,
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        error: "Server error adding comment",
      });
    }
  },

  updateComment: async (req, res) => {
    try {
      const userId = req.userId;
      const { commentId } = req.params;
      const { text } = req.body;
      const db = global.database;

      if (!text || text.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Comment text is required",
        });
      }

      // Find post containing this comment
      const post = db.posts.find(
        (p) =>
          p.comments && p.comments.some((c) => c.id === parseInt(commentId))
      );

      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      const commentIndex = post.comments.findIndex(
        (c) => c.id === parseInt(commentId)
      );
      if (commentIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check ownership
      if (post.comments[commentIndex].user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "You are not authorized to update this comment",
        });
      }

      // Update comment
      post.comments[commentIndex].text = text.trim();
      post.comments[commentIndex].updated_at = new Date();

      res.json({
        success: true,
        comment: post.comments[commentIndex],
      });
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({
        success: false,
        error: "Server error updating comment",
      });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const userId = req.userId;
      const { commentId } = req.params;
      const db = global.database;

      // Find post containing this comment
      const post = db.posts.find(
        (p) =>
          p.comments && p.comments.some((c) => c.id === parseInt(commentId))
      );

      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      const commentIndex = post.comments.findIndex(
        (c) => c.id === parseInt(commentId)
      );
      if (commentIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check ownership
      if (post.comments[commentIndex].user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "You are not authorized to delete this comment",
        });
      }

      // Remove comment
      post.comments.splice(commentIndex, 1);
      post.comments_count = Math.max(0, post.comments_count - 1);

      res.json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({
        success: false,
        error: "Server error deleting comment",
      });
    }
  },
};

// Message Controller
const messageController = {
  getConversations: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      // Get unique users that current user has messaged with
      const conversationUsers = new Set();
      const conversations = [];

      db.messages.forEach((message) => {
        if (message.sender_id === userId) {
          conversationUsers.add(message.receiver_id);
        } else if (message.receiver_id === userId) {
          conversationUsers.add(message.sender_id);
        }
      });

      for (const otherUserId of conversationUsers) {
        const otherUser = db.users.find((u) => u.id === otherUserId);
        if (!otherUser) continue;

        // Get last message
        const lastMessage = db.messages
          .filter(
            (m) =>
              (m.sender_id === userId && m.receiver_id === otherUserId) ||
              (m.sender_id === otherUserId && m.receiver_id === userId)
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        // Count unread messages
        const unreadCount = db.messages.filter(
          (m) =>
            m.sender_id === otherUserId &&
            m.receiver_id === userId &&
            !m.is_read
        ).length;

        conversations.push({
          userId: otherUser.id,
          username: otherUser.username,
          name: otherUser.name,
          profileImage: otherUser.profile_image,
          isOnline: otherUser.is_online,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                created_at: lastMessage.created_at,
                is_read: lastMessage.is_read,
                is_sender: lastMessage.sender_id === userId,
              }
            : null,
          unreadCount,
          lastSeen: otherUser.last_seen,
        });
      }

      // Sort by last message time
      conversations.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return (
          new Date(b.lastMessage.created_at) -
          new Date(a.lastMessage.created_at)
        );
      });

      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching conversations",
      });
    }
  },

  getMessages: async (req, res) => {
    try {
      const currentUserId = req.userId;
      const { userId: otherUserId } = req.params;
      const db = global.database;

      const messages = db.messages
        .filter(
          (m) =>
            (m.sender_id === currentUserId &&
              m.receiver_id === parseInt(otherUserId)) ||
            (m.sender_id === parseInt(otherUserId) &&
              m.receiver_id === currentUserId)
        )
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      // Mark messages as read
      messages.forEach((message) => {
        if (
          message.sender_id === parseInt(otherUserId) &&
          message.receiver_id === currentUserId
        ) {
          message.is_read = true;
        }
      });

      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching messages",
      });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const currentUserId = req.userId;
      const { receiverId, text } = req.body;
      const db = global.database;

      if (!receiverId || !text || text.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Receiver ID and message text are required",
        });
      }

      const sender = db.users.find((u) => u.id === currentUserId);
      const receiver = db.users.find((u) => u.id === parseInt(receiverId));

      if (!receiver) {
        return res.status(404).json({
          success: false,
          error: "Receiver not found",
        });
      }

      const newMessage = {
        id: db.messages.length + 1,
        sender_id: currentUserId,
        receiver_id: parseInt(receiverId),
        sender_username: sender.username,
        receiver_username: receiver.username,
        text: text.trim(),
        is_read: false,
        created_at: new Date(),
      };

      db.messages.push(newMessage);

      res.json({
        success: true,
        message: newMessage,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        error: "Server error sending message",
      });
    }
  },
};

// Notification Controller
const notificationController = {
  getNotifications: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      const notifications = db.notifications
        .filter((n) => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((notification) => ({
          ...notification,
          from_user: db.users.find((u) => u.id === notification.from_user_id),
        }));

      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching notifications",
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const userId = req.userId;
      const db = global.database;

      db.notifications.forEach((notification) => {
        if (notification.user_id === userId) {
          notification.is_read = true;
        }
      });

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Mark notifications as read error:", error);
      res.status(500).json({
        success: false,
        error: "Server error marking notifications",
      });
    }
  },
};

// Admin Controller
const adminController = {
  getAllUsers: async (req, res) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Admin access required",
        });
      }

      const db = global.database;
      const users = db.users.map((user) => {
        const postsCount = db.posts.filter((p) => p.user_id === user.id).length;
        const followersCount = db.followers.filter(
          (f) => f.following_id === user.id
        ).length;
        const followingCount = db.followers.filter(
          (f) => f.follower_id === user.id
        ).length;

        return {
          ...user,
          password: undefined, // Don't send password
          postsCount,
          followersCount,
          followingCount,
        };
      });

      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching users",
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Admin access required",
        });
      }

      const { userId } = req.params;
      const db = global.database;

      // Remove user
      db.users = db.users.filter((u) => u.id !== parseInt(userId));

      // Remove user's posts
      db.posts = db.posts.filter((p) => p.user_id !== parseInt(userId));

      // Remove user's messages
      db.messages = db.messages.filter(
        (m) =>
          m.sender_id !== parseInt(userId) && m.receiver_id !== parseInt(userId)
      );

      // Remove follow relationships
      db.followers = db.followers.filter(
        (f) =>
          f.follower_id !== parseInt(userId) &&
          f.following_id !== parseInt(userId)
      );

      // Remove notifications
      db.notifications = db.notifications.filter(
        (n) =>
          n.user_id !== parseInt(userId) && n.from_user_id !== parseInt(userId)
      );

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Server error deleting user",
      });
    }
  },

  getStats: async (req, res) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Admin access required",
        });
      }

      const db = global.database;

      const stats = {
        totalUsers: db.users.length,
        totalPosts: db.posts.length,
        totalMessages: db.messages.length,
        totalFollowers: db.followers.length,
        totalNotifications: db.notifications.length,
        activeUsers: db.users.filter((u) => u.is_online).length,
        newUsersToday: db.users.filter((u) => {
          const today = new Date();
          const userDate = new Date(u.created_at);
          return userDate.toDateString() === today.toDateString();
        }).length,
        newPostsToday: db.posts.filter((p) => {
          const today = new Date();
          const postDate = new Date(p.created_at);
          return postDate.toDateString() === today.toDateString();
        }).length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        success: false,
        error: "Server error fetching stats",
      });
    }
  },
};

// ========== ROUTES ==========

// Auth routes
app.post("/api/auth/signup", authController.signup);
app.post("/api/auth/login", authController.login);
app.post("/api/auth/admin/login", authController.adminLogin);

// Profile routes
app.post(
  "/api/profile/setup",
  authenticateToken,
  upload.single("profileImage"),
  profileController.setupProfile
);
app.get(
  "/api/profile/:username",
  authenticateToken,
  profileController.getProfile
);
app.put(
  "/api/profile/update",
  authenticateToken,
  upload.single("profileImage"),
  profileController.updateProfile
);
app.post(
  "/api/profile/follow/:username",
  authenticateToken,
  profileController.followUser
);
app.get(
  "/api/profile/search/users",
  authenticateToken,
  profileController.searchUsers
);
app.delete(
  "/api/profile/delete-account",
  authenticateToken,
  profileController.deleteOwnAccount
);

// Post routes
app.get("/api/posts/feed", authenticateToken, postController.getFeed);
app.get("/api/posts/reels", authenticateToken, postController.getReels);
app.get("/api/posts/stories", authenticateToken, postController.getStories);
app.get(
  "/api/posts/user/:username",
  authenticateToken,
  postController.getUserPosts
);
app.post(
  "/api/posts/create",
  authenticateToken,
  upload.single("media"),
  postController.createPost
);
app.post("/api/posts/:postId/like", authenticateToken, postController.likePost);
app.post(
  "/api/posts/:postId/comment",
  authenticateToken,
  postController.addComment
);
app.put(
  "/api/posts/comments/:commentId",
  authenticateToken,
  postController.updateComment
);
app.delete(
  "/api/posts/comments/:commentId",
  authenticateToken,
  postController.deleteComment
);

// Message routes
app.put("/api/messages/online", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = global.database;

    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.is_online = true;
      user.last_seen = new Date();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/messages/offline", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = global.database;

    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.is_online = false;
      user.last_seen = new Date();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(
  "/api/messages/conversations",
  authenticateToken,
  messageController.getConversations
);
app.get(
  "/api/messages/:userId",
  authenticateToken,
  messageController.getMessages
);
app.post(
  "/api/messages/send",
  authenticateToken,
  messageController.sendMessage
);
app.get("/api/messages/search/users", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.userId;
    const db = global.database;

    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const searchTerm = q.trim().toLowerCase();

    const users = db.users
      .filter(
        (user) =>
          user.id !== userId &&
          ((user.username &&
            user.username.toLowerCase().includes(searchTerm)) ||
            (user.name && user.name.toLowerCase().includes(searchTerm)))
      )
      .map((user) => {
        const isFollowing = db.followers.some(
          (f) => f.follower_id === userId && f.following_id === user.id
        );

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          profileImage: user.profile_image,
          isOnline: user.is_online,
          isFollowing: isFollowing,
        };
      })
      .sort((a, b) => b.isFollowing - a.isFollowing);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/messages/read/:userId", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.userId;
    const otherUserId = parseInt(req.params.userId);
    const db = global.database;

    db.messages.forEach((msg) => {
      if (msg.sender_id === otherUserId && msg.receiver_id === currentUserId) {
        msg.is_read = true;
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notification routes
app.get(
  "/api/notifications",
  authenticateToken,
  notificationController.getNotifications
);
app.put(
  "/api/notifications/read",
  authenticateToken,
  notificationController.markAsRead
);

// Admin routes
app.get("/api/admin/users", authenticateToken, adminController.getAllUsers);
app.delete(
  "/api/admin/users/:userId",
  authenticateToken,
  adminController.deleteUser
);
app.get("/api/admin/stats", authenticateToken, adminController.getStats);

// Test routes
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    users: global.database.users.length,
    messages: global.database.messages.length,
    posts: global.database.posts.length,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log("✅ Memory database ready!");
  console.log("👤 Test user: user / password");
  console.log("👑 Admin user: admin.com / 20112011");
});
