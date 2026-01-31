const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getNotifications,
  markAsRead
} = require('../controllers/notificationController');

router.get('/', authenticateToken, getNotifications);
router.put('/read', authenticateToken, markAsRead);

module.exports = router;
