import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Navbar.css";

function Navbar({ user, onLogout, isAdmin }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3001/api/notifications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUnreadCount(response.data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate("/home")}>
          Instagram
        </div>

        <div className="navbar-links">
          <button className="navbar-link" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="navbar-link" onClick={() => navigate("/search")}>
            Search
          </button>
          <button
            className="navbar-link"
            onClick={() => navigate("/notifications")}
          >
            Notifications{" "}
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          <button
            className="navbar-link"
            onClick={() => navigate(`/profile/${user?.username}`)}
          >
            Profile
          </button>
          <button className="navbar-link" onClick={() => navigate("/messages")}>
            Messages
          </button>
          {isAdmin && (
            <button
              className="navbar-link admin-link"
              onClick={() => navigate("/admin")}
            >
              Admin
            </button>
          )}
          <button className="navbar-link" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
