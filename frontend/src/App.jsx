import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import api from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate token and restore session
  useEffect(() => {
    const token = localStorage.getItem('geo_token');
    if (!token) { setLoading(false); return; }

    api('/api/auth/me')
      .then(data => setUser(data.user))
      .catch((err) => {
        // Only wipe token if the server explicitly says it's invalid (401/403).
        // If it's a network error (e.g. Render server is waking up), keep the token!
        if (err.message.includes('Invalid') || err.message.includes('Unauthorized')) {
          localStorage.removeItem('geo_token');
        } else {
          console.warn('Backend might be asleep, or network error:', err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('geo_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('geo_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">
          <div className="splash-pulse"></div>
          <span>GeoTracker</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          !user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />
        } />

        <Route path="/register" element={
          !user ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" />
        } />

        <Route path="/dashboard" element={
          !user ? <Navigate to="/" /> :
          <Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} />
        } />

        <Route path="/profile/:id" element={
          !user ? <Navigate to="/" /> :
          <Profile currentUser={user} />
        } />
      </Routes>
    </Router>
  );
}

export default App;
