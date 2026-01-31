import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "./Navbar";
import "./AdminPanel.css";

function AdminPanel({ user, onLogout, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        "http://localhost:3001/api/admin/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        setUsers(response.data.users || []);
        toast.success(`Loaded ${response.data.users?.length || 0} users`, {
          position: "top-right",
          autoClose: 2000,
        });
      } else {
        setError(response.data.error || "Failed to load users");
        toast.error(response.data.error || "Failed to load users");
      }

      setLoading(false);
    } catch (error) {
      let errorMessage = "Failed to access admin panel";

      if (error.response?.status === 403) {
        errorMessage = "Admin access denied. You don't have admin privileges.";
      } else if (error.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
        setTimeout(() => {
          onLogout();
        }, 2000);
      } else if (error.code === "ECONNREFUSED") {
        errorMessage =
          "Cannot connect to server. Make sure backend is running on port 3001.";
      }

      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const getProfileImageUrl = (userItem) => {
    if (!userItem.profile_image || userItem.profile_image === "null") {
      return "/default-avatar.png";
    }

    if (userItem.profile_image.startsWith("http")) {
      return userItem.profile_image;
    }

    return `http://localhost:3001${userItem.profile_image}`;
  };

  const openImageUpload = (userItem) => {
    setSelectedUser(userItem);
    setShowImageUpload(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("profileImage", file);
      formData.append("userId", selectedUser.id);

      const response = await axios.post(
        "http://localhost:3001/api/admin/update-profile-image",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success(`Profile image updated for ${selectedUser.username}`);
        setShowImageUpload(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(response.data.error || "Failed to update image");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmDeleteUser = (userId, username) => {
    setUserToDelete({ userId, username });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const { userId, username } = userToDelete;
    const toastId = toast.loading(`Deleting user "${username}"...`, {
      position: "top-right",
    });

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `http://localhost:3001/api/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.update(toastId, {
          render: `User "${username}" deleted successfully`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
          closeButton: true,
        });
        fetchUsers();
      } else {
        toast.update(toastId, {
          render: response.data.error || "Error deleting user",
          type: "error",
          isLoading: false,
          autoClose: 3000,
          closeButton: true,
        });
      }
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.error || "Error deleting user",
        type: "error",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });
    } finally {
      setShowConfirmModal(false);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setUserToDelete(null);
    toast.info("Deletion cancelled", {
      position: "top-right",
      autoClose: 1500,
    });
  };

  if (loading) {
    return (
      <div className="admin-panel-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="admin-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-page">
        <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />
        <div className="admin-container">
          <h1 className="admin-title">Admin Panel</h1>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Access Denied</h3>
            <p>{error}</p>
            <div className="debug-actions">
              <button className="btn btn-primary" onClick={fetchUsers}>
                Try Again
              </button>
              <button className="btn btn-danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-page">
      <Navbar user={user} onLogout={onLogout} isAdmin={isAdmin} />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Panel</h1>
            <p className="admin-subtitle">
              Total Users: {users.length} | Admins:{" "}
              {users.filter((u) => u.is_admin).length} | Regular Users:{" "}
              {users.filter((u) => !u.is_admin).length}
            </p>
            <small>Logged in as: {user?.username} (Admin)</small>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={fetchUsers}
              title="Refresh user list"
            >
              Refresh
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="no-users">
            <p>No users found in database</p>
            <button className="btn btn-primary" onClick={fetchUsers}>
              Check Again
            </button>
          </div>
        ) : (
          <div className="users-table">
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Posts</th>
                    <th>Followers</th>
                    <th>Following</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr
                      key={userItem.id}
                      className={userItem.is_admin ? "admin-row" : ""}
                    >
                      <td>{userItem.id}</td>
                      <td>
                        <div className="user-cell">
                          <img
                            src={getProfileImageUrl(userItem)}
                            alt={userItem.username}
                            className="table-avatar"
                            onClick={() => openImageUpload(userItem)}
                            style={{ cursor: "pointer" }}
                            title="Click to change profile image"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                          <div className="user-info">
                            <strong>{userItem.username}</strong>
                            {userItem.bio && (
                              <small title={userItem.bio}>
                                {userItem.bio.length > 30
                                  ? `${userItem.bio.substring(0, 30)}...`
                                  : userItem.bio}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{userItem.email}</td>
                      <td>{userItem.name || "—"}</td>
                      <td className="text-center">
                        {userItem.post_count || 0}
                      </td>
                      <td className="text-center">
                        {userItem.follower_count || 0}
                      </td>
                      <td className="text-center">
                        {userItem.following_count || 0}
                      </td>
                      <td className="text-center">
                        {userItem.is_admin ? (
                          <span
                            className="badge admin-badge"
                            title="Administrator"
                          >
                            ADMIN
                          </span>
                        ) : (
                          <span
                            className="badge user-badge"
                            title="Regular User"
                          >
                            USER
                          </span>
                        )}
                      </td>
                      <td>
                        {userItem.created_at
                          ? new Date(userItem.created_at).toLocaleDateString()
                          : "—"}
                        <br />
                        <small>
                          {userItem.created_at
                            ? new Date(userItem.created_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : ""}
                        </small>
                      </td>
                      <td className="text-center">
                        <button
                          className={`action-btn ${
                            userItem.id ===
                            parseInt(localStorage.getItem("userId"))
                              ? "btn-warning"
                              : userItem.is_admin
                              ? "btn-secondary"
                              : "btn-delete"
                          }`}
                          onClick={() => {
                            if (
                              userItem.id ===
                              parseInt(localStorage.getItem("userId"))
                            ) {
                              toast.warning("You cannot delete yourself!", {
                                position: "top-right",
                                autoClose: 2000,
                              });
                            } else if (userItem.is_admin) {
                              toast.warning("Cannot delete admin users!", {
                                position: "top-right",
                                autoClose: 2000,
                              });
                            } else {
                              confirmDeleteUser(userItem.id, userItem.username);
                            }
                          }}
                          disabled={
                            userItem.id ===
                              parseInt(localStorage.getItem("userId")) ||
                            userItem.is_admin
                          }
                          title={
                            userItem.id ===
                            parseInt(localStorage.getItem("userId"))
                              ? "Cannot delete yourself"
                              : userItem.is_admin
                              ? "Cannot delete admin users"
                              : `Delete ${userItem.username}`
                          }
                        >
                          {userItem.id ===
                          parseInt(localStorage.getItem("userId"))
                            ? "You"
                            : userItem.is_admin
                            ? "Admin"
                            : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showImageUpload && selectedUser && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h3>Update Profile Image</h3>
              <button
                className="close-btn"
                onClick={() => setShowImageUpload(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Update profile image for{" "}
                <strong>{selectedUser.username}</strong>
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                style={{ margin: "20px 0" }}
              />
              {uploadingImage && <p>Uploading...</p>}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowImageUpload(false)}
                disabled={uploadingImage}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && userToDelete && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={cancelDelete}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>
                Are you sure you want to delete user{" "}
                <strong>"{userToDelete.username}"</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone. All user data including posts,
                followers, and messages will be permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-delete" onClick={handleDeleteUser}>
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
