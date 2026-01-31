import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import "./Search.css";

function Search({ user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery.length > 0) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/api/profile/search/users?q=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setResults(response.data);
    } catch (error) {
      console.error("Error searching:", error);
    }
  };

  return (
    <div className="search-page">
      <Navbar user={user} onLogout={onLogout} isAdmin={false} />

      <div className="search-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="search-results">
          {results.map((user) => (
            <div
              key={user._id}
              className="search-result-item"
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              <img
                src={
                  user.profileImage
                    ? `http://localhost:3001${user.profileImage}`
                    : "/default-avatar.png"
                }
                alt={user.username}
                className="result-avatar"
              />
              <div className="result-info">
                <div className="result-username">{user.username}</div>
                <div className="result-name">{user.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Search;
