import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { User, Lock, Phone } from 'lucide-react';

export default function Setup({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invite link.');
    }
  }, [token]);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      return setError('Please fill in all required fields.');
    }
    setLoading(true);
    setError('');
    
    try {
      const data = await api('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          token,
          name: form.name,
          phone: form.phone,
          password: form.password
        })
      });
      onLogin(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-bg">
        <div className="auth-card">
          <div className="form-error">Invalid Invite Link. Please ask your administrator to resend the invite.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon navigo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              <path d="M12 7.5a3 3 0 00-2 5.24 4.5 4.5 0 014.24-4.24A3 3 0 0012 7.5z" fill="#1e1b4b" />
            </svg>
          </div>
          <div>
            <h1 className="logo-name" style={{letterSpacing: '1px'}}>NAVIGO PRO</h1>
            <p className="logo-tagline" style={{letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.7rem'}}>Welcome Aboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-header">
            <h2>Complete Setup</h2>
            <p>You've been invited to join the team. Set up your profile and password to continue.</p>
          </div>

          <div className="input-group">
            <label>Full Name <span className="required">*</span></label>
            <div className="input-icon-wrapper">
              <User className="input-icon" size={18} />
              <input
                type="text"
                className="form-input with-icon"
                placeholder="John Doe"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Phone Number <span className="required">*</span></label>
            <div className="input-icon-wrapper">
              <Phone className="input-icon" size={18} />
              <input
                type="tel"
                className="form-input with-icon"
                placeholder="+977 98XXXXXXXX"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Create Password <span className="required">*</span></label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="form-input with-icon"
                placeholder="••••••••"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading} style={{marginTop: '1rem'}}>
            {loading ? <span className="btn-spinner"></span> : 'Join Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
