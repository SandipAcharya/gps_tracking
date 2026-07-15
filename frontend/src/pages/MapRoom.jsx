import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Users, MapPin, Navigation, Signal, ChevronLeft, ChevronRight } from 'lucide-react';
import Map, { stringToColor } from '../components/Map';

const MapRoom = ({ user, room, onLeaveRoom }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Connect to socket via Vite proxy
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_room', { roomId: room.roomId, user: user });
    });

    socket.on('update_users', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Start tracking location
    if ('geolocation' in navigator) {
      const handleSuccess = (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setMyLocation(loc);
        
        if (socket.connected) {
          socket.emit('update_location', { roomId: room.roomId, lat: latitude, lng: longitude });
        }
      };

      const handleError = (error) => {
        console.error("Error getting location:", error);
        if (error.code === 1) {
          alert("Location access denied. Please allow location permissions in your browser to be tracked.");
        } else if (error.code === 3) {
          console.warn("GPS timeout. Trying to fetch coarse location.");
        } else if (error.code === 2) {
          console.warn("Location unavailable. The device cannot determine your position.");
        }
      };

      // Jumpstart location with a single quick fetch
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: false, maximumAge: 60000, timeout: 10000
      });

      // Then continuously watch
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      socket.disconnect();
    };
  }, [user]);

  // Update location manually if socket wasn't ready during initial fetch
  useEffect(() => {
    if (socketConnected && myLocation && socketRef.current) {
      socketRef.current.emit('update_location', { 
        roomId: room.roomId, 
        lat: myLocation.lat, 
        lng: myLocation.lng 
      });
    }
  }, [socketConnected, myLocation, room.roomId]);

  const activeUsersCount = users.filter(u => u.lat && u.lng).length;

  return (
    <div className="map-layout">
      {/* Sidebar */}
      <div className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
        
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>

        <div className="sidebar-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Room: {room.roomId}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Signal size={12} color={socketConnected ? '#10b981' : '#ef4444'} />
              {socketConnected ? 'Connected' : 'Reconnecting...'}
            </div>
          </div>
          <button 
            onClick={onLeaveRoom}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
            title="Leave Room"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Users size={16} />
            <span>Active Members ({activeUsersCount})</span>
          </div>

          <div className="user-list">
            {users.map((u) => {
              const isMe = u.email === user.email;
              const avatarColor = isMe ? 'var(--accent)' : stringToColor(u.email);
              
              return (
                <div 
                  key={u.socketId} 
                  className="user-item"
                  onClick={() => {
                    if (u.lat && u.lng) {
                      setFocusLocation({ lat: u.lat, lng: u.lng });
                      if (window.innerWidth <= 768) setIsSidebarOpen(false);
                    }
                  }}
                  style={{ cursor: (u.lat && u.lng) ? 'pointer' : 'default' }}
                >
                  <div className="user-avatar" style={{ backgroundColor: avatarColor, color: 'white' }}>
                    {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h3>{isMe ? 'You' : u.name}</h3>
                    {u.designation && <p style={{ fontSize: '0.7rem', color: 'gray', margin: 0 }}>{u.designation}</p>}
                    <p>
                      <span className="status-indicator" style={{ background: (u.lat && u.lng) ? '#10b981' : '#f59e0b' }}></span>
                      {(u.lat && u.lng) ? 'Location Active' : 'Waiting for GPS...'}
                    </p>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No one else is here yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="map-container">
        <div className="map-overlay">
          <div className="hud-panel glass-panel">
            <Navigation size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {myLocation ? `${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Locating...'}
            </span>
          </div>
        </div>
        <Map users={users} currentUserEmail={user.email} myLocation={myLocation} focusLocation={focusLocation} />
      </div>
    </div>
  );
};

export default MapRoom;
