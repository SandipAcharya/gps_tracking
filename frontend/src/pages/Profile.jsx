import React, { useState } from 'react';
import api from '../utils/api';

export default function Profile({ user, onComplete }) {
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    designation: user.designation || '',
    office: user.office || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.designation || !form.office) {
      return setError('Please fill in all required fields.');
    }
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card wide">
        <div className="auth-logo">
          <div className="logo-icon navigo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              <path d="M12 7.5a3 3 0 00-2 5.24 4.5 4.5 0 014.24-4.24A3 3 0 0012 7.5z" fill="#1e1b4b" />
            </svg>
          </div>
          <div>
            <h1 className="logo-name" style={{letterSpacing: '1px'}}>NAVIGO PRO</h1>
            <p className="logo-tagline" style={{letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.7rem'}}>Set up your profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-header">
            <h2>Complete your profile</h2>
            <p>This information is visible to your teammates on the map</p>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="Sandip Acharya"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input
                className="form-input"
                placeholder="+977 98XXXXXXXX"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Designation <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="Full Stack Developer"
                value={form.designation}
                onChange={e => handleChange('designation', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Office / Branch <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="Kafal, Kathmandu"
                value={form.office}
                onChange={e => handleChange('office', e.target.value)}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : 'Save & Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
