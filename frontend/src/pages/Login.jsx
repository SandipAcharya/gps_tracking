import React, { useState } from 'react';
import api from '../utils/api';

const STEPS = { IDENTIFY: 1, OTP: 2 };

export default function Login({ onLogin }) {
  const [step, setStep] = useState(STEPS.IDENTIFY);
  const [identifier, setIdentifier] = useState('');
  const [isEmail, setIsEmail] = useState(true);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleIdentifierChange = (val) => {
    setIdentifier(val);
    setIsEmail(!val.startsWith('+') && !/^\d/.test(val));
    setError('');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return setError('Please enter your email or phone number.');
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      setDevOtp(data.devOtp || '');
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) return setError('Please enter the complete 6-digit code.');
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), otp: otpString })
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity="0.3"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="logo-name">GeoTracker</h1>
            <p className="logo-tagline">Real-time team location</p>
          </div>
        </div>

        {step === STEPS.IDENTIFY && (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="form-header">
              <h2>Welcome back</h2>
              <p>Enter your email or phone to continue</p>
            </div>

            <div className="input-group">
              <label>Email or Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="email@company.com or +977 98XXXXXXXX"
                value={identifier}
                onChange={e => handleIdentifierChange(e.target.value)}
                autoFocus
              />
              <span className="input-hint">
                {identifier && (isEmail ? '📧 We\'ll send a code to this email' : '📱 We\'ll send a code to this number')}
              </span>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-header">
              <h2>Check your {isEmail ? 'email' : 'phone'}</h2>
              <p>
                We sent a 6-digit code to <strong>{identifier}</strong>
              </p>
              {devOtp && (
                <div className="dev-badge">
                  🛠 Dev Mode · OTP: <strong>{devOtp}</strong>
                </div>
              )}
            </div>

            <div className="otp-grid" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setStep(STEPS.IDENTIFY); setError(''); setOtp(['','','','','','']); }}
            >
              ← Change {isEmail ? 'email' : 'number'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
