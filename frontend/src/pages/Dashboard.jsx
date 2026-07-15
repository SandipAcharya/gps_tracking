import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Lock, Building2, Users, ChevronRight, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard({ user, onJoinRoom, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [passwordInput, setPasswordInput] = useState({});
  const [errors, setErrors] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ roomId: '', password: '', company: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    api('/api/rooms')
      .then(data => setRooms(data.rooms))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (roomId) => {
    const pwd = passwordInput[roomId] || '';
    if (!pwd) return setErrors(e => ({ ...e, [roomId]: 'Enter the room password.' }));
    setErrors(e => ({ ...e, [roomId]: '' }));
    try {
      const data = await api('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomId, password: pwd })
      });
      onJoinRoom({ roomId: data.roomId, company: data.company });
    } catch (err) {
      setErrors(e => ({ ...e, [roomId]: err.message }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.roomId || !createForm.password) return setCreateError('Room ID and password are required.');
    setCreateLoading(true);
    setCreateError('');
    try {
      await api('/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      const data = await api('/api/rooms');
      setRooms(data.rooms);
      setShowCreate(false);
      setCreateForm({ roomId: '', password: '', company: '' });
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const initials = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="dashboard-bg">
      {/* Top Nav */}
      <nav className="dash-nav">
        <div className="dash-nav-logo">
          <div className="logo-icon small">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="2.5" fill="white"/>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <span>GeoTracker</span>
        </div>

        <div className="dash-nav-right">
          {isAdmin && (
            <button className="btn-primary small" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Room
            </button>
          )}
          <div className="user-pill">
            <div className="user-pill-avatar">{initials}</div>
            <div className="user-pill-info">
              <span className="user-pill-name">{user.name}</span>
              <span className="user-pill-role">{isAdmin ? '👑 Admin' : user.designation}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onLogout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-header">
          <h1>Tracking Rooms</h1>
          <p>Select a room to start live tracking with your team</p>
        </div>

        {loading ? (
          <div className="dash-loading">
            <Loader2 size={32} className="spin" />
            <span>Loading rooms...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="dash-empty">
            <Building2 size={48} opacity={0.3} />
            <h3>No rooms yet</h3>
            {isAdmin
              ? <p>Create the first room for your team to join.</p>
              : <p>Ask your admin to create a room and share the password with you.</p>
            }
            {isAdmin && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Create First Room
              </button>
            )}
          </div>
        ) : (
          <div className="room-grid">
            {rooms.map(room => (
              <div
                key={room.roomId}
                className={`room-card ${joiningRoomId === room.roomId ? 'active' : ''}`}
                onClick={() => setJoiningRoomId(joiningRoomId === room.roomId ? null : room.roomId)}
              >
                <div className="room-card-top">
                  <div className="room-icon">
                    <Building2 size={22} />
                  </div>
                  <div className="room-info">
                    <h3>{room.company || room.roomId}</h3>
                    <span className="room-id">#{room.roomId}</span>
                  </div>
                  <ChevronRight size={18} className={`room-chevron ${joiningRoomId === room.roomId ? 'rotated' : ''}`} />
                </div>

                {joiningRoomId === room.roomId && (
                  <div className="room-password-form" onClick={e => e.stopPropagation()}>
                    <div className="input-group">
                      <div className="password-input-wrap">
                        <Lock size={16} className="input-icon" />
                        <input
                          className="form-input with-icon"
                          type="password"
                          placeholder="Enter room password"
                          value={passwordInput[room.roomId] || ''}
                          onChange={e => setPasswordInput(p => ({ ...p, [room.roomId]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleJoin(room.roomId)}
                          autoFocus
                        />
                      </div>
                      {errors[room.roomId] && <div className="form-error small">{errors[room.roomId]}</div>}
                    </div>
                    <button className="btn-primary full" onClick={() => handleJoin(room.roomId)}>
                      <Users size={16} /> Join Room
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button className="icon-btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="auth-form">
              <div className="input-group">
                <label>Company Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Kafal Care"
                  value={createForm.company}
                  onChange={e => setCreateForm(f => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label>Room ID <span className="required">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. kafal-care-2025"
                  value={createForm.roomId}
                  onChange={e => setCreateForm(f => ({ ...f, roomId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                />
                <span className="input-hint">Lowercase, no spaces. Share this with employees.</span>
              </div>
              <div className="input-group">
                <label>Room Password <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Strong password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              {createError && <div className="form-error">{createError}</div>}
              <button type="submit" className="btn-primary" disabled={createLoading}>
                {createLoading ? <span className="btn-spinner"></span> : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
