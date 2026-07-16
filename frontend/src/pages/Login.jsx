import React, { useState } from 'react';
import api from '../utils/api';
import { Mail, Lock, Phone } from 'lucide-react';

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmail, setIsEmail] = useState(true);

  const handleIdentifierChange = (val) => {
    setIdentifier(val);
    setIsEmail(!val.startsWith('+') && !/^\d/.test(val));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError('Please enter your email/phone and password.');
    setLoading(true);
    setError('');
    
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon navigo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
              <path d="M12 7.5a3 3 0 00-2 5.24 4.5 4.5 0 014.24-4.24A3 3 0 0012 7.5z" fill="#1e1b4b" />
            </svg>
          </div>
          <div>
            <h1 className="logo-name" style={{letterSpacing: '1px'}}>NAVIGO PRO</h1>
            <p className="logo-tagline" style={{letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.7rem'}}>Move Sharp</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Log in to access your organization workspace</p>
          </div>

          <div className="input-group">
            <label>Email or Phone Number</label>
            <div className="input-icon-wrapper">
              {isEmail ? <Mail className="input-icon" size={18} /> : <Phone className="input-icon" size={18} />}
              <input
                type="text"
                className="form-input with-icon"
                placeholder="email@company.com or +977 98XXXXXXXX"
                value={identifier}
                onChange={e => handleIdentifierChange(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Password</label>
              <a href="#" className="forgot-password" onClick={(e) => {
                e.preventDefault();
                alert('Forgot Password flow will send a secure reset link to your registered email.');
              }}>Forgot password?</a>
            </div>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="form-input with-icon"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : 'Log In to Workspace'}
          </button>
          
          <div className="bio-login-hint">
             Fingerprint & FaceID login will be enabled in the mobile app release.
          </div>
        </form>
      </div>
    </div>
  );
}
