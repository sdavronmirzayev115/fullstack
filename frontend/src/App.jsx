import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Landing from "./components/Landing";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import ProfileSetup from "./components/ProfileSetup";
import Profile from "./components/Profile";
import Messages from "./components/Messages";
import Home from "./components/Home";
import Search from "./components/Search";
import Notifications from "./components/Notifications";
import AdminPanel from "./components/AdminPanel";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const admin = localStorage.getItem("isAdmin") === "true";

    if (token && userId && username) {
      setIsAuthenticated(true);
      setUser({ id: userId, username });
      setIsAdmin(admin);
    }
  }, []);

  const handleLogin = (token, userId, username, admin = false) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);
    localStorage.setItem("isAdmin", admin.toString());
    setIsAuthenticated(true);
    setUser({ id: userId, username });
    setIsAdmin(admin);

    toast.success(`Welcome ${username}!`, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("isAdmin");
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);

    toast.info("Logged out successfully", {
      position: "top-right",
      autoClose: 2000,
    });

    window.location.href = "/login";
  };

  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/"
            element={!isAuthenticated ? <Landing /> : <Navigate to="/home" />}
          />
          <Route
            path="/signup"
            element={
              !isAuthenticated ? (
                <SignUp onLogin={handleLogin} />
              ) : (
                <Navigate to="/home" />
              )
            }
          />
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/home" />
              )
            }
          />
          <Route
            path="/setup"
            element={
              isAuthenticated ? <ProfileSetup /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/home"
            element={
              isAuthenticated ? (
                <Home user={user} onLogout={handleLogout} isAdmin={isAdmin} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/search"
            element={
              isAuthenticated ? (
                <Search user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/notifications"
            element={
              isAuthenticated ? (
                <Notifications user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/profile/:username"
            element={
              isAuthenticated ? (
                <Profile
                  user={user}
                  onLogout={handleLogout}
                  isAdmin={isAdmin}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/messages"
            element={
              isAuthenticated ? (
                <Messages user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated && isAdmin ? (
                <AdminPanel
                  user={user}
                  onLogout={handleLogout}
                  isAdmin={isAdmin}
                />
              ) : (
                <Navigate to="/home" />
              )
            }
          />
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;
