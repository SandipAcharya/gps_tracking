import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Map from '../components/Map';
import api, { BASE_URL } from '../utils/api';
import { LogOut, Play, Square, Users, Building2, Key } from 'lucide-react';

export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Org Selection State
  const [orgForm, setOrgForm] = useState({ name: '', password: '' });
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!user.activeOrganization) return;

    const token = localStorage.getItem('geo_token');
    
    // Connect to Socket
    socketRef.current = io(BASE_URL, { auth: { token } });
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_org', { 
        organization: user.activeOrganization, 
        userProfile: user 
      });
    });

    socketRef.current.on('org_users', (users) => {
      const uniqueUsersMap = new window.Map();
      users.forEach(u => {
        const key = u.userId || u.email || u.phone;
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
  }, [user.activeOrganization]);

  const handleJoinOrCreateOrg = async (action) => {
    if (!orgForm.name || !orgForm.password) return setOrgError('Please enter Workspace Name and Password');
    setOrgLoading(true);
    setOrgError('');
    try {
      const endpoint = action === 'create' ? '/api/auth/org/create' : '/api/auth/org/join';
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(orgForm)
      });
      onUpdateUser(data.user);
    } catch (err) {
      setOrgError(err.message);
    } finally {
      setOrgLoading(false);
    }
  };

  const toggleClock = () => {
    if (!isClockedIn) {
      if ('geolocation' in navigator) {
        setIsClockedIn(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            socketRef.current.emit('update_location', { 
              organization: user.activeOrganization, 
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
      setIsClockedIn(false);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      socketRef.current.emit('update_location', { 
        organization: user.activeOrganization, 
        lat: null, 
        lng: null 
      });
    }
  };

  if (!user.activeOrganization) {
    return (
      <div className="auth-bg">
        <div className="auth-card wide">
          <div className="form-header" style={{textAlign: 'center', marginBottom: '2rem'}}>
            <h2>Welcome, {user.name}</h2>
            <p>Join an existing company workspace or create a new one.</p>
          </div>
          
          <div className="input-group" style={{marginBottom: '1rem'}}>
            <label>Workspace Name</label>
            <div className="input-icon-wrapper">
              <Building2 className="input-icon" size={18} />
              <input
                type="text"
                className="form-input with-icon"
                placeholder="E.g., Kafal Care"
                value={orgForm.name}
                onChange={e => setOrgForm(f => ({...f, name: e.target.value}))}
              />
            </div>
          </div>
          
          <div className="input-group" style={{marginBottom: '1.5rem'}}>
            <label>Workspace Shared Password</label>
            <div className="input-icon-wrapper">
              <Key className="input-icon" size={18} />
              <input
                type="password"
                className="form-input with-icon"
                placeholder="••••••••"
                value={orgForm.password}
                onChange={e => setOrgForm(f => ({...f, password: e.target.value}))}
              />
            </div>
          </div>

          {orgError && <div className="form-error">{orgError}</div>}
          
          <div className="form-row">
            <button onClick={() => handleJoinOrCreateOrg('join')} className="btn-primary" disabled={orgLoading}>
              Join Workspace
            </button>
            <button onClick={() => handleJoinOrCreateOrg('create')} className="btn-primary" disabled={orgLoading} style={{background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--border)'}}>
              Create New Workspace
            </button>
          </div>
          <button onClick={onLogout} className="logout-btn" style={{marginTop: '2rem'}}>Log Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="org-brand">
            <div className="logo-icon navigo small">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                <path d="M12 7.5a3 3 0 00-2 5.24 4.5 4.5 0 014.24-4.24A3 3 0 0012 7.5z" fill="#1e1b4b" />
              </svg>
            </div>
            <span style={{fontWeight: 700, fontSize: '1.1rem'}}>{user.activeOrganization}</span>
          </div>
          <button className="icon-btn mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>✕</button>
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
          <div className="clock-in-section" style={{marginBottom: '2rem'}}>
            <button 
              className={`clock-btn ${isClockedIn ? 'clocked-out' : 'clocked-in'}`}
              onClick={toggleClock}
            >
              {isClockedIn ? (
                <><Square size={20} fill="currentColor"/> STOP TRACKING</>
              ) : (
                <><Play size={20} fill="currentColor"/> CLOCK IN TO SHIFT</>
              )}
            </button>
          </div>
          
          <div className="active-users-list">
            <h3 className="section-title">Active Fleet ({activeUsers.filter(u => u.lat).length})</h3>
            <div className="users-scroll">
              {activeUsers.map(u => (
                <div key={u.socketId} className="user-item">
                  <div className={`status-dot ${u.lat ? 'active' : 'idle'}`}></div>
                  <div className="user-details">
                    <span className="user-name">{u.name} {u.userId === user.id ? '(You)' : ''}</span>
                    <span className="user-role">{u.designation || 'Employee'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => {
            // Unset active organization locally just logs them back to the workspace selector
            if (window.confirm("Leave this workspace?")) {
               onUpdateUser({...user, activeOrganization: null, role: 'none'});
            }
          }} className="logout-btn" style={{marginBottom: '0.5rem'}}>
            Leave Workspace
          </button>
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

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
