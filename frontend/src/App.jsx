import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapRoom from './pages/MapRoom';

function App() {
  // Load initial state from localStorage if it exists
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('geo_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [room, setRoom] = useState(() => {
    const savedRoom = localStorage.getItem('geo_room');
    return savedRoom ? JSON.parse(savedRoom) : null;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('geo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('geo_user');
    }
  }, [user]);

  useEffect(() => {
    if (room) {
      localStorage.setItem('geo_room', JSON.stringify(room));
    } else {
      localStorage.removeItem('geo_room');
    }
  }, [room]);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />} 
          />
          <Route 
            path="/dashboard" 
            element={
              !user ? <Navigate to="/" /> : 
              (room ? <Navigate to="/room" /> : <Dashboard user={user} onJoinRoom={setRoom} onLogout={() => { setUser(null); setRoom(null); }} />)
            } 
          />
          <Route 
            path="/room" 
            element={(!user || !room) ? <Navigate to="/dashboard" /> : <MapRoom user={user} room={room} onLeaveRoom={() => setRoom(null)} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
