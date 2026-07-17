import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Map from '../components/Map';
import api, { BASE_URL } from '../utils/api';
import { getUserColor } from '../utils/colors';
import { LogOut, Play, Square, Building2, Key } from 'lucide-react';

export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Org Selection State
  const [orgForm, setOrgForm] = useState({ name: '', password: '' });
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');
  const [focusLocation, setFocusLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!user.activeOrganization) return;
    
    // Request notification permissions for Geofence alerts
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const token = localStorage.getItem('geo_token');
    
    // Fetch destinations
    api(`/api/destinations/${user.activeOrganization}`)
      .then(data => setDestinations(data))
      .catch(err => console.error('Failed to load destinations', err));

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

    socketRef.current.on('geofence_arrival', ({ employeeName, destinationName, timestamp }) => {
      const msg = `${employeeName} arrived at ${destinationName}`;
      // Show native browser notification if allowed
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Geofence Alert", { body: msg, icon: '/favicon.ico' });
      }
      // Also show a simple alert for fallback (in a real app, use toast here)
      console.log('GEOFENCE ALERT:', msg);
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
          <button
            className="icon-btn"
            title="Close sidebar"
            style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'1.2rem',padding:'0.25rem 0.5rem',borderRadius:'6px'}}
            onClick={() => setIsSidebarOpen(false)}
          >✕</button>
        </div>

        <div className="sidebar-user-card">
          <div className="user-info">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight: 600, color: 'var(--text)'}}>{user.name}</div>
              <div style={{fontSize: '0.8rem', color: 'var(--text-3)'}}>{user.designation || user.role}</div>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {user.role === 'employee' && (
            <div className="clock-in-section" style={{marginBottom: '2rem'}}>
              {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? (
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
              ) : (
                <div style={{padding: '12px', background: '#fef3c7', color: '#b45309', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center'}}>
                  <span style={{fontWeight: 600}}>Desktop View</span><br/>
                  Tracking is only available on the mobile app.
                </div>
              )}
            </div>
          )}
          
          <div className="active-users-list">
            <h3 className="section-title">Active Fleet ({activeUsers.filter(u => u.lat).length}/{activeUsers.length})</h3>
            <div className="users-scroll">
              {activeUsers.map(u => (
                <div 
                  key={u.socketId} 
                  className="user-item" 
                  style={{cursor: u.lat ? 'pointer' : 'default', padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px'}}
                  onClick={() => { if (u.lat && u.lng) setFocusLocation({ lat: u.lat, lng: u.lng }); }}
                >
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`} 
                      alt={u.name}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${getUserColor(u.role, u.name)}` }}
                    />
                    <div style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: 12, height: 12, borderRadius: '50%', border: '2px solid white',
                      background: u.lat ? '#10b981' : '#9ca3af',
                      boxShadow: u.lat ? `0 0 6px #10b981` : 'none',
                    }}></div>
                  </div>
                  <div className="user-details" style={{flex:1}}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                      <Link to={`/profile/${u.userId}`} className="user-name" style={{fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none'}}>
                        {u.name}
                      </Link>
                      {u.role === 'admin' && (
                        <span style={{fontSize:'0.6rem',background:'#ede9fe',color:'#7c3aed',padding:'2px 6px',borderRadius:'4px',fontWeight:700,letterSpacing:'0.03em'}}>ADMIN</span>
                      )}
                    </div>
                    <span className="user-role" style={{fontSize: '0.8rem', color: '#6b7280'}}>{u.lat ? u.designation || u.role : 'Offline'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={16} /> Log Out
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => {
                if (window.confirm('Switch to a different workspace? Your current session will end.'))
                  onUpdateUser({...user, activeOrganization: null, role: 'none'});
              }}
              style={{background:'none',border:'none',color:'var(--text-3)',fontSize:'0.78rem',cursor:'pointer',marginTop:'0.75rem',textDecoration:'underline'}}
            >
              Switch Workspace
            </button>
          )}
        </div>
      </aside>

      <main className="map-area">
        {!isSidebarOpen && (
          <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰ Menu
          </button>
        )}
        <div className="map-container" style={{ position: 'relative' }}>
          <Map 
            users={activeUsers} 
            currentUserEmail={user.email} 
            myLocation={activeUsers.find(u => u.email === user.email)}
            focusLocation={focusLocation}
            destinations={destinations}
            userRole={user.role}
            orgName={user.activeOrganization}
            onDestinationAdded={(newDest) => setDestinations(prev => [...prev, newDest])}
          />
        </div>
      </main>
    </div>
  );
}
