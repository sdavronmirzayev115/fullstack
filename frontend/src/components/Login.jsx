import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let response;
      if (formData.email === "admin.com") {
        response = await axios.post(
          "http://localhost:3001/api/auth/admin/login",
          {
            username: formData.email,
            password: formData.password,
          }
        );
        onLogin(
          response.data.token,
          response.data.userId,
          response.data.username,
          true
        );
        navigate("/admin");
      } else {
        response = await axios.post(
          "http://localhost:3001/api/auth/login",
          formData
        );
        onLogin(
          response.data.token,
          response.data.userId,
          response.data.username,
          response.data.isAdmin || false
        );
        navigate("/home");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="instagram-text-logo">Instagram</div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            name="email"
            placeholder="Email or Username"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="input-field"
            required
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary login-btn">
            Log In
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{" "}
            <span className="link" onClick={() => navigate("/signup")}>
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
