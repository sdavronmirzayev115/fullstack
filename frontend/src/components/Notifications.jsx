import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import "./Notifications.css";

function Notifications({ user, onLogout }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3001/api/notifications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📥 Notifications data:", response.data);
      setNotifications(response.data);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:3001/api/notifications/read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
    } catch (error) {
      console.error("❌ Error marking as read:", error);
    }
  };

  const getNotificationText = (notif) => {
    const username = notif.from_username || notif.fromUsername || "Someone";

    switch (notif.type) {
      case "like":
        return `${username} liked your post`;
      case "comment":
        const commentText = notif.text ? `: ${notif.text}` : "";
        return `${username} commented${commentText}`;
      case "follow":
        return `${username} started following you`;
      case "message":
        return `${username} sent you a message`;
      default:
        return `${username} interacted with you`;
    }
  };

  const getNotificationAvatar = (notif) => {
    const profileImage =
      notif.from_profile_image ||
      notif.fromProfileImage ||
      notif.profile_image ||
      (notif.fromUserId && notif.fromUserId.profile_image);

    if (profileImage) {
      return `http://localhost:3001${profileImage}`;
    }
    return "/default-avatar.png";
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "Invalid Date") {
      return "Just now";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Just now";
      }

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
    } catch (error) {
      console.error("Date parsing error:", error);
      return "Just now";
    }
  };

  const handleNotificationClick = (notif) => {
    if (notif.type === "message") {
      navigate("/messages");
    } else if (notif.type === "follow") {
      const username = notif.from_username || notif.fromUsername;
      if (username) {
        navigate(`/profile/${username}`);
      }
    } else if (notif.post_id || notif.postId) {
      const username = notif.from_username || notif.fromUsername;
      if (username) {
        navigate(`/profile/${username}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={false} />
        <div className="notifications-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <Navbar user={user} onLogout={onLogout} isAdmin={false} />

      <div className="notifications-container">
        <div className="notifications-header">
          <h2>Notifications</h2>
          {notifications.filter((n) => !n.is_read && !n.isRead).length > 0 && (
            <button className="btn btn-secondary" onClick={markAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="no-notifications">
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
                <circle cx="48" cy="48" r="48" fill="#FAFAFA" />
                <path
                  d="M48 20C32.536 20 20 32.536 20 48C20 63.464 32.536 76 48 76C63.464 76 76 63.464 76 48C76 32.536 63.464 20 48 20Z"
                  fill="#DBDBDB"
                />
              </svg>
              <h3>No Notifications Yet</h3>
              <p>
                When someone likes or comments on your posts, you'll see it
                here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id || notif._id}
                className={`notification-item ${
                  !(notif.is_read || notif.isRead) ? "unread" : ""
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <img
                  src={getNotificationAvatar(notif)}
                  alt="User"
                  className="notification-avatar"
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                    e.target.onerror = null;
                  }}
                />
                <div className="notification-content">
                  <div className="notification-text">
                    {getNotificationText(notif)}
                  </div>
                  <div className="notification-time">
                    {formatDate(notif.created_at || notif.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
