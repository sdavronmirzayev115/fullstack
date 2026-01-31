const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");

const getConversations = async (req, res) => {
  try {
    console.log("🔄 Getting conversations...");
    const userId = req.userId;
    const conversations = await Message.getConversations(userId);

    console.log(`✅ Sending ${conversations.length} conversations`);
    res.json(conversations);
  } catch (error) {
    console.error("🔥 Error in getConversations controller:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load conversations",
      details: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const otherUserId = req.params.userId;

    console.log(`🔄 Getting messages between ${userId} and ${otherUserId}`);

    const messages = await Message.getMessages(userId, otherUserId);
    await Message.markAsRead(otherUserId, userId);

    console.log(`✅ Sending ${messages.length} messages`);
    res.json(messages);
  } catch (error) {
    console.error("🔥 Error in getMessages controller:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load messages",
      details: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, receiverUsername, text } = req.body;
    const senderId = req.userId;

    console.log(`🔄 Sending message from ${senderId} to ${receiverId}`);

    if (!receiverId || !text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Receiver ID and message text required",
      });
    }

    // Get sender info
    const senderQuery = await require("../config/database").pool.query(
      "SELECT username FROM users WHERE id = $1",
      [senderId]
    );

    if (senderQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sender not found",
      });
    }

    const senderUsername = senderQuery.rows[0].username;

    // Create message
    const message = await Message.create({
      senderId: senderId,
      senderUsername: senderUsername,
      receiverId: receiverId,
      receiverUsername: receiverUsername,
      text: text.trim(),
    });

    console.log(`✅ Message sent: ${message.id}`);

    res.json({
      success: true,
      message: "Message sent",
      messageData: message,
    });
  } catch (error) {
    console.error("🔥 Error in sendMessage controller:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
      details: error.message,
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
};
