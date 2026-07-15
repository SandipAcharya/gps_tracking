import React, { useState } from 'react';
import { MapPin, Lock, LogIn, LogOut, PlusCircle } from 'lucide-react';

const Dashboard = ({ user, onJoinRoom, onLogout }) => {
  const [activeTab, setActiveTab] = useState('join'); // 'join' or 'create'
  const [formData, setFormData] = useState({
    roomId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.roomId || !formData.password) {
      return setError('Please fill in both Room ID and Password');
    }

    setLoading(true);
    const endpoint = activeTab === 'create' ? '/api/room/create' : '/api/room/join';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: formData.roomId,
          password: formData.password,
          isAdmin: user.isAdmin,
          email: user.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${activeTab} room`);
      }

      onJoinRoom({ roomId: formData.roomId });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
          <LogOut size={16} /> Logout ({user.name})
        </button>
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="flex justify-center mb-4">
            <div style={{ background: 'var(--accent)', padding: '1rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
              <MapPin size={32} color="white" />
            </div>
          </div>
          <h1>{user.isAdmin ? 'Room Dashboard' : 'Join a Room'}</h1>
          <p>Welcome, {user.name} ({user.designation})</p>
        </div>

        {user.isAdmin && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => { setActiveTab('join'); setError(''); }}
              style={{ flex: 1, padding: '0.5rem', background: activeTab === 'join' ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Join Room
            </button>
            <button 
              onClick={() => { setActiveTab('create'); setError(''); }}
              style={{ flex: 1, padding: '0.5rem', background: activeTab === 'create' ? 'var(--accent)' : 'rgba(0,0,0,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Create New Room
            </button>
          </div>
        )}

        {error && <div className="error-message"><Lock size={16} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>{activeTab === 'create' ? 'New Room ID' : 'Room ID'}</label>
            <input 
              type="text" name="roomId" className="input-field" 
              placeholder="e.g. team-alpha-123" 
              value={formData.roomId} onChange={handleChange}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label>{activeTab === 'create' ? 'Set Room Password' : 'Room Password'}</label>
            <input 
              type="password" name="password" className="input-field" 
              placeholder="Enter password" 
              value={formData.password} onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connecting...' : (
              <>
                {activeTab === 'create' ? <PlusCircle size={20} /> : <LogIn size={20} />}
                {activeTab === 'create' ? 'Create & Enter Room' : 'Access Tracking Room'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
