import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Building2, User, Mail, Lock, Phone, Briefcase } from 'lucide-react';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', designation: '', department: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [step, setStep] = useState('form');

  // Clear form on mount to prevent browser back-button caching (security)
  useEffect(() => {
    setForm({ name: '', email: '', phone: '', password: '', designation: '', department: '' });
  }, []);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'form') {
      if (!form.name || !form.email || !form.phone || !form.password || !form.designation || !form.department) {
        return setError('Please fill in all required fields.');
      }
      setLoading(true);
      setError('');
      try {
        const res = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setStep('otp');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.otp) return setError('Please enter the OTP.');
      setLoading(true);
      setError('');
      try {
        const data = await api('/api/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, otp: form.otp })
        });
        onLogin(data.token, data.user);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
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
            <p className="logo-tagline" style={{letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.7rem'}}>Create Your Profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          {step === 'form' ? (
            <>
              <div className="form-header">
                <h2>Sign Up</h2>
                <p>Register your personal profile. You will join your company workspace next.</p>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Full Name <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <User className="input-icon" size={18} />
                    <input type="text" className="form-input with-icon" placeholder="Sandip Acharya" value={form.name} onChange={e => handleChange('name', e.target.value)} autoFocus />
                  </div>
                </div>
                <div className="input-group">
                  <label>Email Address <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input type="email" className="form-input with-icon" placeholder="me@company.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <Phone className="input-icon" size={18} />
                    <input type="tel" className="form-input with-icon" placeholder="+977 98XXXXXXXX" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Password <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input type="password" name="new-password" autoComplete="new-password" className="form-input with-icon" placeholder="••••••••" value={form.password} onChange={e => handleChange('password', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Designation <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <Briefcase className="input-icon" size={18} />
                    <input type="text" className="form-input with-icon" placeholder="Field Agent" value={form.designation} onChange={e => handleChange('designation', e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Department <span className="required">*</span></label>
                  <div className="input-icon-wrapper">
                    <Building2 className="input-icon" size={18} />
                    <select className="form-input with-icon" value={form.department} onChange={e => handleChange('department', e.target.value)}>
                      <option value="" disabled>Select Department</option>
                      <option value="IT & Engineering">IT & Engineering</option>
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Delivery & Logistics">Delivery & Logistics</option>
                      <option value="Customer Service">Customer Service</option>
                      <option value="Finance & Admin">Finance & Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-header">
                <h2>Verify Email</h2>
                <p>We've sent a 6-digit OTP to <strong>{form.email}</strong>. Please enter it below.</p>
                <p style={{fontSize: '0.85rem', color: '#ea580c', marginTop: '0.5rem', fontWeight: 500}}>⚠️ Check your Spam/Junk folder explicitly if you don't see it in your inbox.</p>
              </div>
              <div className="input-group" style={{alignItems: 'center'}}>
                <input type="text" className="form-input" style={{textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: 700}} placeholder="000000" maxLength={6} value={form.otp || ''} onChange={e => handleChange('otp', e.target.value)} autoFocus />
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading} style={{marginTop: '1rem'}}>
            {loading ? <span className="btn-spinner"></span> : (step === 'form' ? 'Create Profile' : 'Verify & Continue')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{color: 'var(--text-secondary)'}}>Already have an account? </span>
            <Link to="/" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '500'}}>Log In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
