import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LogOut, Navigation, Signal, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import Map, { stringToColor } from '../components/Map';

export default function MapRoom({ user, room, onLeaveRoom }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [roomUsers, setRoomUsers] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('geo_token');
    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_room', {
        roomId: room.roomId,
        userProfile: {
          name: user.name,
          designation: user.designation,
          email: user.email,
          phone: user.phone
        }
      });
    });

    socket.on('room_users', (users) => setRoomUsers(users));
    socket.on('disconnect', () => setSocketConnected(false));

    // Geolocation
    if ('geolocation' in navigator) {
      const onSuccess = (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setMyLocation({ lat, lng });
        if (socket.connected) {
          socket.emit('update_location', { roomId: room.roomId, lat, lng });
        }
      };
      const onError = (err) => {
        if (err.code === 1) alert('Location access denied. Please allow location permissions.');
      };
      const opts = { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, opts);
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.disconnect();
    };
  }, []);

  // Flush location once socket connects
  useEffect(() => {
    if (socketConnected && myLocation && socketRef.current) {
      socketRef.current.emit('update_location', { roomId: room.roomId, lat: myLocation.lat, lng: myLocation.lng });
    }
  }, [socketConnected]);

  const locatedCount = roomUsers.filter(u => u.lat && u.lng).length;

  return (
    <div className="map-layout">
      {/* Sidebar */}
      <div className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
        <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(o => !o)}>
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Header */}
        <div className="sidebar-header">
          <div>
            <div className="sidebar-room-badge">{room.company || room.roomId}</div>
            <div className={`sidebar-conn ${socketConnected ? 'online' : 'offline'}`}>
              <Signal size={11} /> {socketConnected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>
          <button className="icon-btn danger" onClick={onLeaveRoom} title="Leave room">
            <LogOut size={18} />
          </button>
        </div>

        {/* Members List */}
        <div className="sidebar-content">
          <div className="sidebar-section-label">
            <MapPin size={13} /> {locatedCount} of {roomUsers.length} located
          </div>

          <div className="member-list">
            {roomUsers.map(u => {
              const isMe = u.email === user.email;
              const color = isMe ? '#6366f1' : stringToColor(u.email);
              const hasLocation = u.lat && u.lng;

              return (
                <div
                  key={u.socketId}
                  className={`member-item ${isMe ? 'me' : ''} ${hasLocation ? 'clickable' : ''}`}
                  onClick={() => {
                    if (hasLocation) {
                      setFocusLocation({ lat: u.lat, lng: u.lng });
                      if (window.innerWidth <= 768) setIsSidebarOpen(false);
                    }
                  }}
                >
                  <div className="member-avatar-wrap">
                    <div className="member-avatar" style={{ background: color }}>
                      {(u.name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={`member-dot ${hasLocation ? 'active' : 'waiting'}`}></div>
                  </div>
                  <div className="member-details">
                    <span className="member-name">{isMe ? `${u.name} (You)` : u.name}</span>
                    <span className="member-desig">{u.designation}</span>
                    <span className={`member-status ${hasLocation ? 'active' : 'waiting'}`}>
                      {hasLocation ? '● Live' : '○ Waiting for GPS'}
                    </span>
                  </div>
                  {hasLocation && <ChevronRight size={14} className="member-arrow" />}
                </div>
              );
            })}

            {roomUsers.length === 0 && (
              <div className="member-empty">No one else has joined yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        {/* HUD */}
        <div className="map-hud">
          <div className="hud-coords">
            <Navigation size={14} />
            {myLocation
              ? `${myLocation.lat.toFixed(5)}, ${myLocation.lng.toFixed(5)}`
              : 'Acquiring GPS...'}
          </div>
        </div>
        <Map
          users={roomUsers}
          currentUserEmail={user.email}
          myLocation={myLocation}
          focusLocation={focusLocation}
        />
      </div>
    </div>
  );
}
