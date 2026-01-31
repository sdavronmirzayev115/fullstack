import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import "./Home.css";

const BACKEND_URL = "http://localhost:3001";

function Home({ user, onLogout, isAdmin }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    fetchFeed();
    fetchStories();
  }, []);

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fixedPosts = res.data.map((p) => ({
        ...p,
        comments: p.comments || [],
      }));

      setPosts(fixedPosts);
    } catch (err) {
      console.error("Feed error:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/posts/stories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStories(res.data);
    } catch (err) {
      console.error("Stories error:", err);
      setStories([]);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikedPosts((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => {
        setLikedPosts((prev) => ({ ...prev, [postId]: false }));
      }, 800);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: res.data.isLiked,
                likes_count: res.data.isLiked
                  ? p.likes_count + 1
                  : Math.max(p.likes_count - 1, 0),
              }
            : p
        )
      );
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/posts/${postId}/comment`,
        { text: text.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [...p.comments, res.data.comment],
                  comments_count: res.data.comments_count,
                }
              : p
          )
        );

        setCommentText((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      console.error("Comment error:", err);
      alert("Failed to post comment");
    }
  };

  const startEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.text);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText("");
  };

  const handleUpdateComment = async (postId, commentId) => {
    if (!editText || !editText.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${BACKEND_URL}/api/posts/comments/${commentId}`,
        { text: editText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c) =>
                    c.id === commentId ? { ...c, text: editText.trim() } : c
                  ),
                }
              : p
          )
        );

        setEditingComment(null);
        setEditText("");
      }
    } catch (err) {
      console.error("Update comment error:", err);
      alert("Failed to update comment");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(
        `${BACKEND_URL}/api/posts/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.filter((c) => c.id !== commentId),
                  comments_count: Math.max(p.comments_count - 1, 0),
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Delete comment error:", err);
      alert("Failed to delete comment");
    }
  };

  const openStory = (story) => {
    setActiveStory(story);
  };

  const closeStory = () => {
    setActiveStory(null);
  };

  if (loading) {
    return (
      <div className="home-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />

      {stories.length > 0 && (
        <div className="stories-container">
          <div className="stories-section">
            {stories.map((s) => (
              <div
                key={s.id}
                className="story-item"
                onClick={() => openStory(s)}
              >
                <div className="story-border">
                  <img
                    src={
                      s.profile_image
                        ? `${BACKEND_URL}${s.profile_image}`
                        : "/default-avatar.png"
                    }
                    alt={s.username}
                    className="story-image"
                  />
                </div>
                <span className="story-username">{s.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="posts-feed">
        {posts.length === 0 ? (
          <div className="no-posts">
            <h2>No posts yet</h2>
            <p>Follow people to see their posts here</p>
          </div>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="post-card">
              <div className="post-header">
                <div className="post-avatar">
                  <img
                    src={
                      p.profile_image
                        ? `${BACKEND_URL}${p.profile_image}`
                        : "/default-avatar.png"
                    }
                    alt={p.username}
                  />
                </div>
                <div className="post-user-info">
                  <span className="post-username">{p.username}</span>
                </div>
              </div>

              <div className="post-media-container">
                {p.media &&
                  (p.media.endsWith(".mp4") ||
                  p.media.endsWith(".mov") ||
                  p.media.endsWith(".webm") ? (
                    <video
                      src={`${BACKEND_URL}${p.media}`}
                      controls
                      className="post-video"
                    />
                  ) : (
                    <img
                      src={`${BACKEND_URL}${p.media}`}
                      alt={p.title || "Post"}
                      className="post-image"
                    />
                  ))}

                {likedPosts[p.id] && (
                  <div className="like-animation">
                    <div className="heart-burst">❤️</div>
                  </div>
                )}
              </div>

              <div className="post-actions">
                <div className="action-buttons">
                  <button
                    className={`like-btn ${p.is_liked ? "liked" : ""}`}
                    onClick={() => handleLike(p.id)}
                  >
                    <span>{p.is_liked ? "❤️" : "🤍"}</span>
                    <span>{p.likes_count || 0}</span>
                  </button>
                  <button className="comment-btn">
                    <span>💬</span>
                    <span>{p.comments_count || 0}</span>
                  </button>
                </div>
              </div>

              {p.title && (
                <div className="post-caption">
                  <strong>{p.username}</strong> {p.title}
                </div>
              )}

              <div className="comments-section">
                {p.comments.map((c) => (
                  <div key={c.id} className="comment">
                    {editingComment === c.id ? (
                      <div className="edit-comment">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="comment-input"
                        />
                        <button
                          onClick={() => handleUpdateComment(p.id, c.id)}
                          className="save-btn"
                        >
                          Save
                        </button>
                        <button onClick={cancelEdit} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="comment-content">
                          <strong>{c.username}</strong> {c.text}
                        </div>
                        {c.user_id ===
                          parseInt(localStorage.getItem("userId")) && (
                          <div className="comment-actions">
                            <button
                              onClick={() => startEditComment(c)}
                              className="edit-comment-btn"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(p.id, c.id)}
                              className="delete-comment-btn"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="add-comment">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="comment-input"
                  value={commentText[p.id] || ""}
                  onChange={(e) =>
                    setCommentText((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleComment(p.id);
                    }
                  }}
                />
                <button
                  className="post-comment-btn"
                  onClick={() => handleComment(p.id)}
                >
                  Post
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeStory && (
        <div className="story-modal" onClick={closeStory}>
          <div
            className="story-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="story-modal-header">
              <div className="story-modal-user">
                <img
                  src={
                    activeStory.profile_image
                      ? `${BACKEND_URL}${activeStory.profile_image}`
                      : "/default-avatar.png"
                  }
                  alt={activeStory.username}
                />
                <span>{activeStory.username}</span>
              </div>
              <button className="close-story" onClick={closeStory}>
                ✕
              </button>
            </div>
            <div className="story-modal-body">
              <img
                src={
                  activeStory.media
                    ? `${BACKEND_URL}${activeStory.media}`
                    : "/default-avatar.png"
                }
                alt="Story"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
  