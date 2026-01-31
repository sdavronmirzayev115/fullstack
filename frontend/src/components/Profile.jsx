import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar";
import "./Profile.css";

function Profile({ user, onLogout, isAdmin }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postHashtags, setPostHashtags] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/api/profile/${username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📥 Profile data:", response.data);
      if (response.data.success) {
        setProfileData({
          ...response.data.user,
          ...response.data.stats,
        });
        setIsFollowing(response.data.isFollowing || false);
      }
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching profile:", error);

      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        onLogout();
        navigate("/login");
        return;
      }

      toast.error("Error loading profile");
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/api/posts/user/${username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("📥 Posts fetched:", response.data.length);
      setPosts(response.data);
    } catch (error) {
      console.error("❌ Error fetching posts:", error);
      setPosts([]);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "null" || imagePath === "undefined") {
      return "/default-avatar.png";
    }

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    if (!imagePath.startsWith("/")) {
      return `http://localhost:3001/uploads/${imagePath}`;
    }

    return `http://localhost:3001${imagePath}`;
  };

  const handlePostSubmit = async () => {
    if (!postMedia) {
      toast.error("Please select an image or video");
      return;
    }

    setPostLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("media", postMedia);
      formData.append("title", postTitle || "");
      formData.append("hashtags", postHashtags || "");

      console.log("📤 Submitting post...");

      const response = await axios.post(
        "http://localhost:3001/api/posts/create",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Post created:", response.data);
      toast.success("Post created successfully!");

      setShowPostModal(false);
      setPostTitle("");
      setPostHashtags("");
      setPostMedia(null);

      await fetchPosts();
      await fetchProfile();
    } catch (error) {
      console.error("❌ Error creating post:", error);
      toast.error(error.response?.data?.error || "Error creating post");
    } finally {
      setPostLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      // Note: You need to add this endpoint to your server
      await axios.delete(`http://localhost:3001/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Post deleted successfully");
      fetchPosts();
      fetchProfile();
    } catch (error) {
      console.error("❌ Error deleting post:", error);
      toast.error("Error deleting post");
    }
  };

  const handleFollow = async () => {
    if (followLoading) return;

    setFollowLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:3001/api/profile/follow/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newFollowState = response.data.isFollowing;
      setIsFollowing(newFollowState);

      setProfileData((prev) => ({
        ...prev,
        followers: newFollowState ? prev.followers + 1 : prev.followers - 1,
      }));

      if (newFollowState) {
        toast.success(`You are now following ${username}`);
      } else {
        toast.info(`You unfollowed ${username}`);
      }
    } catch (error) {
      console.error("❌ Error following:", error);
      toast.error("Error updating follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:3001/api/profile/delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Account deleted successfully");
      localStorage.clear();
      onLogout();
      navigate("/login");
    } catch (error) {
      console.error("❌ Error deleting account:", error);
      toast.error("Error deleting account");
    }
  };

  const handleImageError = (e, type = "profile") => {
    console.error(`❌ ${type} image load error`);
    e.target.src = "/default-avatar.png";
    e.target.onerror = null;
  };

  if (loading) {
    return (
      <div className="profile-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="error-container">
          <h3>User not found</h3>
          <button className="btn btn-primary" onClick={() => navigate("/home")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.username === username;

  return (
    <div className="profile-page">
      <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />

      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-image-section">
            <div className="profile-image-wrapper">
              <img
                src={getImageUrl(profileData.profileImage)}
                alt={profileData.username}
                className="profile-image"
                onError={(e) => handleImageError(e, "profile")}
              />
              {isOwnProfile && (
                <button
                  className="delete-account-btn"
                  onClick={handleDeleteAccount}
                  title="Delete Account"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-username-row">
              <h1 className="profile-username">{profileData.username}</h1>
              {isOwnProfile ? (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/messages")}
                  >
                    Messages
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPostModal(true)}
                  >
                    + Post
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`btn ${
                      isFollowing ? "btn-secondary" : "btn-primary"
                    }`}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? "⏳"
                      : isFollowing
                      ? "Following"
                      : "Follow"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/messages")}
                  >
                    Message
                  </button>
                </>
              )}
            </div>

            <div className="profile-stats">
              <span>
                <strong>{profileData.posts || 0}</strong> posts
              </span>
              <span>
                <strong>{profileData.followers || 0}</strong> followers
              </span>
              <span>
                <strong>{profileData.following || 0}</strong> following
              </span>
            </div>

            <div className="profile-name">{profileData.name}</div>
            {profileData.bio && (
              <div className="profile-bio">{profileData.bio}</div>
            )}
          </div>
        </div>

        <div className="profile-posts-grid">
          {posts.length === 0 ? (
            <div className="no-posts">
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
                <circle cx="48" cy="48" r="48" fill="#FAFAFA" />
                <path
                  d="M48 28C36.954 28 28 36.954 28 48C28 59.046 36.954 68 48 68C59.046 68 68 59.046 68 48C68 36.954 59.046 28 48 28Z"
                  fill="#DBDBDB"
                />
              </svg>
              <h3>No Posts Yet</h3>
              {isOwnProfile && <p>Share your first photo or video</p>}
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="post-grid-item">
                {post.media &&
                  (post.media.toLowerCase().endsWith(".mp4") ||
                  post.media.toLowerCase().endsWith(".mov") ||
                  post.media.toLowerCase().endsWith(".webm") ||
                  post.media.toLowerCase().endsWith(".avi") ? (
                    <video src={getImageUrl(post.media)} controls />
                  ) : (
                    <img
                      src={getImageUrl(post.media)}
                      alt={post.title || "Post"}
                      onError={(e) => handleImageError(e, "post")}
                    />
                  ))}
                <div className="post-overlay">
                  <div className="post-stats">
                    <span>❤️ {post.likes_count || 0}</span>
                    <span>💬 {post.comments_count || 0}</span>
                  </div>
                  {post.title && (
                    <div className="post-overlay-title">{post.title}</div>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    className="delete-post-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Post</h2>
            <div className="file-upload-section">
              <label htmlFor="post-file" className="file-upload-label">
                {postMedia ? (
                  <div className="file-preview">
                    {postMedia.type?.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(postMedia)}
                        alt="Preview"
                        className="preview-img"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(postMedia)}
                        controls
                        className="preview-video"
                      />
                    )}
                    <span className="file-name">{postMedia.name}</span>
                  </div>
                ) : (
                  <div className="file-upload-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Choose Image or Video</span>
                  </div>
                )}
              </label>
              <input
                id="post-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setPostMedia(e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>
            <input
              type="text"
              placeholder="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="modal-input"
            />
            <input
              type="text"
              placeholder="Hashtags (comma separated)"
              value={postHashtags}
              onChange={(e) => setPostHashtags(e.target.value)}
              className="modal-input"
            />
            <div className="modal-buttons">
              <button
                className="btn btn-primary"
                onClick={handlePostSubmit}
                disabled={!postMedia || postLoading}
              >
                {postLoading ? "Posting..." : "Post"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPostModal(false);
                  setPostMedia(null);
                  setPostTitle("");
                  setPostHashtags("");
                }}
                disabled={postLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
