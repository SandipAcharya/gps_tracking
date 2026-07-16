import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Map from '../components/Map';
import api, { BASE_URL } from '../utils/api';
import { LogOut, UserPlus, Play, Square, Users } from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('geo_token');
    
    // Connect to Socket
    socketRef.current = io(BASE_URL, { auth: { token } });
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_org', { 
        organization: user.organization, 
        userProfile: user 
      });
    });

    socketRef.current.on('org_users', (users) => {
      // Deduplicate users (only keep the latest socket for each user)
      const uniqueUsersMap = new window.Map();
      users.forEach(u => {
        const key = u.userId || u.email || u.phone;
        // Prefer entries with location
        if (!uniqueUsersMap.has(key) || (u.lat && u.lng)) {
          uniqueUsersMap.set(key, u);
        }
      });
      setActiveUsers(Array.from(uniqueUsersMap.values()));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user]);

  // Handle Clock In / Out
  const toggleClock = () => {
    if (!isClockedIn) {
      if ('geolocation' in navigator) {
        setIsClockedIn(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            socketRef.current.emit('update_location', { 
              organization: user.organization, 
              lat: latitude, 
              lng: longitude 
            });
          },
          (err) => {
            console.error(err);
            alert('Please allow location access to clock in.');
            setIsClockedIn(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    } else {
      // Clock Out
      setIsClockedIn(false);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      socketRef.current.emit('update_location', { 
        organization: user.organization, 
        lat: null, 
        lng: null 
      });
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const data = await api('/api/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail })
      });
      setInviteMsg('Invite sent successfully!');
      setInviteEmail('');
      setTimeout(() => setInviteMsg(''), 3000);
    } catch (err) {
      setInviteMsg(err.message);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="org-brand">
            <div className="logo-icon navigo small">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                <path d="M12 7.5a3 3 0 00-2 5.24 4.5 4.5 0 014.24-4.24A3 3 0 0012 7.5z" fill="#1e1b4b" />
              </svg>
            </div>
            <span style={{fontWeight: 700, fontSize: '1.1rem'}}>{user.organization}</span>
          </div>
          <button className="icon-btn mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            ✕
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="user-info">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{fontWeight: 600, color: 'var(--text)'}}>{user.name}</div>
              <div style={{fontSize: '0.8rem', color: 'var(--text-3)'}}>{user.role.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {/* Employee Clock In View */}
          {user.role === 'employee' && (
            <div className="clock-in-section">
              <div style={{textAlign: 'center', marginBottom: '1rem', color: 'var(--text-2)', fontSize: '0.9rem'}}>
                Broadcast your location to the admin dashboard.
              </div>
              <button 
                className={`clock-btn ${isClockedIn ? 'clocked-out' : 'clocked-in'}`}
                onClick={toggleClock}
              >
                {isClockedIn ? (
                  <><Square size={20} fill="currentColor"/> STOP TRACKING</>
                ) : (
                  <><Play size={20} fill="currentColor"/> CLOCK IN</>
                )}
              </button>
            </div>
          )}

          {/* Admin Tools */}
          {user.role === 'admin' && (
            <div className="admin-tools">
              <h3 className="section-title"><Users size={16}/> Team Directory</h3>
              <form onSubmit={handleInvite} className="invite-form">
                <input 
                  type="email" 
                  placeholder="Employee Email"
                  className="form-input"
                  style={{padding: '0.5rem 0.8rem', fontSize: '0.85rem'}}
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
                <button type="submit" className="btn-primary small full">Send Invite</button>
                {inviteMsg && <div style={{fontSize:'0.75rem', marginTop: '0.5rem', color: 'var(--primary)'}}>{inviteMsg}</div>}
              </form>
            </div>
          )}
          
          <div className="active-users-list">
            <h3 className="section-title">Active Now ({activeUsers.filter(u => u.lat).length})</h3>
            <div className="users-scroll">
              {activeUsers.map(u => (
                <div key={u.socketId} className="user-item">
                  <div className={`status-dot ${u.lat ? 'active' : 'idle'}`}></div>
                  <div className="user-details">
                    <span className="user-name">{u.name} {u.userId === user.id ? '(You)' : ''}</span>
                    <span className="user-role">{u.role === 'admin' ? 'Command Center' : (u.lat ? 'Tracking active' : 'Offline')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="map-area">
        {!isSidebarOpen && (
          <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰ Menu
          </button>
        )}
        <Map users={activeUsers.filter(u => u.lat && u.lng)} currentUserId={user.id} />
      </main>
    </div>
  );
}
