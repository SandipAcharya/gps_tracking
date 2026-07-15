import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import MapRoom from './pages/MapRoom';
import api from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(() => {
    const saved = localStorage.getItem('geo_room');
    return saved ? JSON.parse(saved) : null;
  });

  // On mount, validate token and restore session
  useEffect(() => {
    const token = localStorage.getItem('geo_token');
    if (!token) { setLoading(false); return; }

    api('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('geo_token');
        localStorage.removeItem('geo_room');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('geo_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('geo_token');
    localStorage.removeItem('geo_room');
    setUser(null);
    setActiveRoom(null);
  };

  const handleJoinRoom = (room) => {
    localStorage.setItem('geo_room', JSON.stringify(room));
    setActiveRoom(room);
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('geo_room');
    setActiveRoom(null);
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
          !user ? <Login onLogin={handleLogin} /> :
          !user.profileComplete ? <Navigate to="/profile" /> :
          <Navigate to="/dashboard" />
        } />

        <Route path="/profile" element={
          !user ? <Navigate to="/" /> :
          user.profileComplete ? <Navigate to="/dashboard" /> :
          <Profile user={user} onComplete={(updated) => setUser(updated)} />
        } />

        <Route path="/dashboard" element={
          !user ? <Navigate to="/" /> :
          !user.profileComplete ? <Navigate to="/profile" /> :
          activeRoom ? <Navigate to="/room" /> :
          <Dashboard user={user} onJoinRoom={handleJoinRoom} onLogout={handleLogout} />
        } />

        <Route path="/room" element={
          !user || !activeRoom ? <Navigate to="/dashboard" /> :
          <MapRoom user={user} room={activeRoom} onLeaveRoom={handleLeaveRoom} />
        } />
      </Routes>
    </Router>
  );
}

export default App;
