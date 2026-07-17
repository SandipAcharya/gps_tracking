import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { MapContainer as MapCont, TileLayer as TileL, Polyline as PolyL, Marker as MarkL, Popup as PopL } from 'react-leaflet';
import { ArrowLeft, User, Phone, Mail, Briefcase, Building2 } from 'lucide-react';
import { getUserColor } from '../utils/colors';

const Profile = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api(`/api/profile/${id}`);
        setProfileData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading Profile...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red'}}>{error}</div>;
  if (!profileData) return null;

  const { user, history } = profileData;
  const positions = history.map(h => [h.lat, h.lng]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <img 
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&size=128`} 
            alt={user.name}
            style={{ width: '120px', height: '120px', borderRadius: '50%', border: `4px solid ${getUserColor(user.role, user.name)}`, marginBottom: '1rem' }}
          />
          <h2 style={{ margin: '0 0 0.5rem', color: '#1e1b4b' }}>{user.name}</h2>
          <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            {user.role.toUpperCase()}
          </span>

          <div style={{ marginTop: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4b5563' }}>
              <Briefcase size={18} /> <span>{user.designation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4b5563' }}>
              <Building2 size={18} /> <span>{user.department}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4b5563' }}>
              <Phone size={18} /> <span>{user.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4b5563' }}>
              <Mail size={18} /> <span>{user.email}</span>
            </div>
          </div>
        </div>

        {/* 3-Day History Map */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1e1b4b' }}>3-Day Route History</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
            Showing the last 72 hours of tracked coordinates. Points are only saved when movement exceeds 200m.
          </p>
          
          <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {positions.length > 0 ? (
              <MapCont center={positions[positions.length - 1]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileL url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' maxZoom={20} />
                <PolyL positions={positions} color={getUserColor(user.role, user.name)} weight={4} opacity={0.7} />
                {/* Start Point */}
                <MarkL position={positions[0]}>
                  <PopL>Start Point<br/>{new Date(history[0].timestamp).toLocaleString()}</PopL>
                </MarkL>
                {/* End Point */}
                <MarkL position={positions[positions.length - 1]}>
                  <PopL>Latest Point<br/>{new Date(history[history.length - 1].timestamp).toLocaleString()}</PopL>
                </MarkL>
              </MapCont>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#9ca3af' }}>
                No tracking history found in the last 3 days.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
