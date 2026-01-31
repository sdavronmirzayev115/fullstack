import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SignUp.css";

function SignUp({ onLogin }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    username: "",
    birthday: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "email") {
      let val = value;

      if (!val.includes("@")) {
        const digits = val.replace(/\D/g, "");

        if (digits.length > 0) {
          let phoneDigits = digits.startsWith("998")
            ? digits.substring(3)
            : digits;

          let formatted = "+998";
          if (phoneDigits.length > 0)
            formatted += " " + phoneDigits.substring(0, 2);
          if (phoneDigits.length > 2)
            formatted += " " + phoneDigits.substring(2, 5);
          if (phoneDigits.length > 5)
            formatted += " " + phoneDigits.substring(5, 7);
          if (phoneDigits.length > 7)
            formatted += " " + phoneDigits.substring(7, 9);

          val = formatted;
        }
      }

      setFormData({ ...formData, email: val });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.email ||
      !formData.fullName ||
      !formData.username ||
      !formData.birthday ||
      !formData.password
    ) {
      setError("All fields are required");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3001/api/auth/signup",
        formData
      );

      onLogin(
        response.data.token,
        response.data.userId,
        response.data.username
      );

      navigate("/setup");
    } catch (err) {
      setError(err.response?.data?.error || "Sign up failed");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <div className="signup-header">
          <div className="instagram-text-logo">Instagram</div>
          <p className="signup-subtitle">
            Sign up to see photos and videos from your friends.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <input
            type="text"
            name="email"
            placeholder="Email or Phone number"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
          />

          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            className="input-field"
          />

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="input-field"
          />

          <input
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            className="input-field"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="input-field"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary signup-btn">
            Sign Up
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Have an account?{" "}
            <span className="link" onClick={() => navigate("/login")}>
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
