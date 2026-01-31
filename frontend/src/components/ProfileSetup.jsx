import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./ProfileSetup.css";

function ProfileSetup() {
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      if (bio) {
        formData.append("bio", bio);
      }

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      console.log("📤 Submitting profile setup...");

      const response = await axios.post(
        "http://localhost:3001/api/profile/setup",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Profile setup successful:", response.data);
      toast.success("Profile setup complete!");

      const username = localStorage.getItem("username");
      navigate(`/profile/${username}`);
    } catch (error) {
      console.error("❌ Profile setup error:", error);
      toast.error(error.response?.data?.error || "Error setting up profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    const username = localStorage.getItem("username");
    navigate(`/profile/${username}`);
  };

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-box">
        <h2>Set Up Your Profile</h2>
        <p className="setup-subtitle">
          Add a photo and bio to complete your profile
        </p>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="profile-image-upload">
            <label htmlFor="profile-image" className="image-upload-label">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="profile-preview"
                />
              ) : (
                <div className="profile-placeholder">
                  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
                    <circle cx="48" cy="48" r="48" fill="#FAFAFA" />
                    <circle cx="48" cy="38" r="12" fill="#262626" />
                    <path
                      d="M48 54C36 54 26 59 26 70v6h44v-6c0-11-10-16-22-16z"
                      fill="#262626"
                    />
                  </svg>
                  <span>Add Profile Photo</span>
                </div>
              )}
            </label>
            <input
              id="profile-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </div>

          <textarea
            placeholder="Write a bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bio-input"
            maxLength={500}
            rows={4}
          />

          <div className="setup-buttons">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Setting up..." : "Complete Setup"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;
