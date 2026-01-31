import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-header">
        <button className="btn-login" onClick={() => navigate("/login")}>
          ℒℴℊ ℐ𝓃
        </button>
        <button className="btn-signup" onClick={() => navigate("/signup")}>
          𝒮𝒾ℊ𝓃 𝒰𝓅
        </button>
      </div>
      <div className="landing-content">
        <div className="instagram-logo">
          <img
            src="/instagram-logo.png"
            alt="Instagram"
            className="logo-image"
          />
        </div>
      </div>
    </div>
  );
}

export default Landing;
