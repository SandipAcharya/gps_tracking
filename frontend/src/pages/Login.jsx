import React, { useState } from 'react';
import { User, ArrowRight, ShieldCheck, Mail, Building, Briefcase } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    name: '',
    office: '',
    designation: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!formData.email) return setError('Email or Phone is required');
    setError('');
    // Mock OTP mechanism
    alert('For testing: Use OTP 123456');
    setStep(2);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (formData.otp !== '123456') return setError('Invalid OTP. Please enter 123456.');
    setError('');
    setStep(3);
  };

  const handleProfileComplete = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.office || !formData.designation) {
      return setError('Please fill in all profile details');
    }
    
    // Automatically make 'admin' based on email (for testing purposes)
    const isAdmin = formData.email.toLowerCase().includes('admin');
    
    onLogin({ ...formData, isAdmin });
  };

  return (
    <div className="login-page">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="flex justify-center mb-4">
            <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
              {step === 1 && <Mail size={32} color="white" />}
              {step === 2 && <ShieldCheck size={32} color="white" />}
              {step === 3 && <User size={32} color="white" />}
            </div>
          </div>
          <h1>{step === 1 ? 'GeoTracker' : step === 2 ? 'Verification' : 'Profile Setup'}</h1>
          <p>
            {step === 1 && 'Enter your email or phone to receive an OTP'}
            {step === 2 && `Enter the OTP sent to ${formData.email}`}
            {step === 3 && 'Complete your professional profile'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>Email or Phone Number</label>
              <input 
                type="text" name="email" className="input-field" 
                placeholder="e.g. admin@company.com" 
                value={formData.email} onChange={handleChange} autoFocus
              />
              <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Hint: Use an email containing 'admin' to get room creation rights.
              </small>
            </div>
            <button type="submit" className="btn-primary">Send OTP <ArrowRight size={20} /></button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>One Time Password (OTP)</label>
              <input 
                type="text" name="otp" className="input-field" 
                placeholder="Enter 6-digit OTP" 
                value={formData.otp} onChange={handleChange} autoFocus
              />
            </div>
            <button type="submit" className="btn-primary">Verify OTP <ShieldCheck size={20} /></button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleProfileComplete}>
            <div className="input-group">
              <label>Full Name</label>
              <input 
                type="text" name="name" className="input-field" 
                placeholder="e.g. Ram Bahadur" 
                value={formData.name} onChange={handleChange} autoFocus
              />
            </div>
            <div className="input-group">
              <label>Office / Department</label>
              <input 
                type="text" name="office" className="input-field" 
                placeholder="e.g. Head Office, IT Dept" 
                value={formData.office} onChange={handleChange}
              />
            </div>
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>Designation</label>
              <input 
                type="text" name="designation" className="input-field" 
                placeholder="e.g. Software Engineer" 
                value={formData.designation} onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn-primary">Complete Setup <ArrowRight size={20} /></button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
