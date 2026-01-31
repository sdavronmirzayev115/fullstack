import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import "./Messages.css";

const BACKEND_URL = "http://localhost:3001";

function Messages({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Set online status
  useEffect(() => {
    const setOnlineStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        await axios.put(
          `${BACKEND_URL}/api/messages/online`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error) {
        console.error("Error setting online status:", error);
      }
    };

    setOnlineStatus();

    return () => {
      const setOfflineStatus = async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.put(
            `${BACKEND_URL}/api/messages/offline`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch (error) {
          console.error("Error setting offline status:", error);
        }
      };
      setOfflineStatus();
    };
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      console.log("🔄 Fetching conversations...");
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/api/messages/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Conversations response:", response.data);

      if (response.data.success === false) {
        setError(response.data.error || "Failed to load conversations");
        setConversations([]);
      } else {
        // Transform data
        const transformedConversations = Array.isArray(response.data)
          ? response.data.map((conv) => ({
              userId: conv.user_id || conv.userId,
              username: conv.username,
              profileImage: conv.profile_image || conv.profileImage,
              isOnline: conv.is_online || conv.isOnline,
              lastSeen: conv.last_seen || conv.lastSeen,
              unreadCount: conv.unread_count || conv.unreadCount || 0,
              lastMessage:
                conv.last_message || conv.lastMessage || "No messages yet",
              lastMessageTime: conv.last_message_time || conv.lastMessageTime,
            }))
          : [];

        setConversations(transformedConversations);
        setError(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching conversations:", error);
      setError("Failed to load conversations. Please try again.");
      setConversations([]);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();

    // Refresh every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();

      // Mark as read
      markMessagesAsRead(selectedUser.userId);

      // Poll for new messages
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/api/messages/${selectedUser.userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Transform data
      const transformedMessages = Array.isArray(response.data)
        ? response.data.map((msg) => ({
            id: msg.id,
            senderId: msg.sender_id || msg.senderId,
            receiverId: msg.receiver_id || msg.receiverId,
            senderUsername: msg.sender_username || msg.senderUsername,
            receiverUsername: msg.receiver_username || msg.receiverUsername,
            text: msg.text,
            isRead: msg.is_read || msg.isRead,
            createdAt: msg.created_at || msg.createdAt,
            senderProfileImage:
              msg.sender_profile_image || msg.senderProfileImage,
          }))
        : [];

      setMessages(transformedMessages);
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/messages/read/${userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) {
      alert("Please enter a message");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/api/messages/send`,
        {
          receiverId: selectedUser.userId,
          receiverUsername: selectedUser.username,
          text: newMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Add message to local state
        const newMsg = {
          id: response.data.messageData.id,
          senderId:
            response.data.messageData.sender_id ||
            response.data.messageData.senderId,
          receiverId:
            response.data.messageData.receiver_id ||
            response.data.messageData.receiverId,
          senderUsername:
            response.data.messageData.sender_username ||
            response.data.messageData.senderUsername,
          receiverUsername:
            response.data.messageData.receiver_username ||
            response.data.messageData.receiverUsername,
          text: response.data.messageData.text,
          isRead: true,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMsg]);
        setNewMessage("");

        // Update conversations
        fetchConversations();
      } else {
        alert(response.data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert(
        error.response?.data?.error ||
          "Failed to send message. Please try again."
      );
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch (e) {
      return "";
    }
  };

  const formatMessageTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="messages-page">
        <Navbar user={user} onLogout={onLogout} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <Navbar user={user} onLogout={onLogout} />

      <div className="messages-container">
        {/* Left sidebar */}
        <div className="conversations-sidebar">
          <div className="conversations-header">
            <h2>Messages</h2>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchConversations} className="btn btn-primary">
                Retry
              </button>
            </div>
          )}

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No conversations yet</h3>
                  <p>Follow users to start messaging</p>
                </div>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className={`conversation-item ${
                    selectedUser?.userId === conv.userId ? "active" : ""
                  }`}
                  onClick={() => setSelectedUser(conv)}
                >
                  <div className="conversation-avatar-container">
                    <img
                      src={
                        conv.profileImage
                          ? `${BACKEND_URL}${conv.profileImage}`
                          : "/default-avatar.png"
                      }
                      alt={conv.username}
                      className="conversation-avatar"
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                      }}
                    />
                    {conv.isOnline && <div className="online-indicator"></div>}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-username">
                        {conv.username}
                      </span>
                      {conv.lastMessageTime && (
                        <span className="conversation-time">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="conversation-preview">
                      {conv.lastMessage}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="unread-badge">{conv.unreadCount}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right side - Chat Area */}
        <div className="chat-area">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <img
                    src={
                      selectedUser.profileImage
                        ? `${BACKEND_URL}${selectedUser.profileImage}`
                        : "/default-avatar.png"
                    }
                    alt={selectedUser.username}
                    className="chat-user-avatar"
                    onError={(e) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                  <div className="chat-user-details">
                    <h3>{selectedUser.username}</h3>
                    <div className="chat-user-status">
                      {selectedUser.isOnline ? (
                        <span className="online-text">Online</span>
                      ) : (
                        <span className="offline-text">
                          Last seen {formatTime(selectedUser.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <div className="empty-chat">
                      <div className="empty-chat-icon">💬</div>
                      <h3>Start a conversation</h3>
                      <p>Send your first message to {selectedUser.username}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === user.id;

                    return (
                      <div
                        key={msg.id || index}
                        className={`message ${
                          isCurrentUser ? "sent" : "received"
                        }`}
                      >
                        {!isCurrentUser && (
                          <img
                            src={
                              selectedUser.profileImage
                                ? `${BACKEND_URL}${selectedUser.profileImage}`
                                : "/default-avatar.png"
                            }
                            alt={selectedUser.username}
                            className="message-avatar"
                            onError={(e) => {
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                        )}
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-time">
                            {formatMessageTime(msg.createdAt)}
                            {isCurrentUser && (
                              <span className="message-status">
                                {msg.isRead ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-area">
                <div className="message-input-container">
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <button
                    className="btn btn-primary send-btn"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="welcome-message">
                <div className="welcome-icon">✉️</div>
                <h2>Your Messages</h2>
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;
