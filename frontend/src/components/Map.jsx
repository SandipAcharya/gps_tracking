import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getUserColor, getEmployeeColor } from '../utils/colors';

// ─── Custom Marker Icon ───────────────────────────────
const createCustomIcon = (role, isMe, name) => {
  const color = getUserColor(role, name, isMe);
  const ring = isMe ? '3px solid white' : role === 'admin' ? '3px solid #c4b5fd' : '2px solid white';
  const size = role === 'admin' ? 22 : 18;

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color};opacity:0.2;animation:radar-pulse 2s infinite ease-out;"></div>
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${ring};box-shadow:0 2px 10px rgba(0,0,0,0.35);position:relative;z-index:2;"></div>
      </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -24]
  });
};

// ─── Fly to focused user ──────────────────────────────
const FocusController = ({ focusLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (focusLocation?.lat && focusLocation?.lng) {
      map.flyTo([focusLocation.lat, focusLocation.lng], 17, { animate: true, duration: 1.2 });
    }
  }, [focusLocation, map]);
  return null;
};

// ─── Auto-center on first location fix ───────────────
const InitialCenter = ({ lat, lng }) => {
  const map = useMap();
  const centered = useRef(false);
  useEffect(() => {
    if (lat && lng && !centered.current) {
      map.setView([lat, lng], 16);
      centered.current = true;
    }
  }, [lat, lng, map]);
  return null;
};

// ─── Fix map size when container resizes ─────────────
const ResizeFix = ({ sidebarOpen }) => {
  const map = useMap();
  useEffect(() => {
    // Invalidate on sidebar toggle (wait for CSS transition: 300ms)
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => clearTimeout(timer);
  }, [sidebarOpen, map]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setTimeout(() => map.invalidateSize(), 50);
    });
    const container = map.getContainer();
    observer.observe(container);
    // Also fix immediately on mount
    setTimeout(() => map.invalidateSize(), 100);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

// ─── Destination Click Handler ───────────────────────
const MapClickHandler = ({ userRole, orgName, onDestinationAdded }) => {
  useMapEvents({
    async click(e) {
      if (userRole !== 'admin') return;
      const name = window.prompt("Enter destination name for Geofence:");
      if (!name) return;
      
      let tag = window.prompt("Enter destination type (Client Site, Office, Warehouse, Restricted Zone, Other):", "Client Site");
      if (!['Client Site', 'Office', 'Warehouse', 'Restricted Zone', 'Other'].includes(tag)) {
        tag = 'Other';
      }
      
      try {
        const response = await fetch('/api/destinations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('geo_token')}`
          },
          body: JSON.stringify({
            orgName,
            name,
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            radius: 50,
            tag
          })
        });
        if (response.ok) {
          const newDest = await response.json();
          if (onDestinationAdded) onDestinationAdded(newDest);
        }
      } catch (err) {
        console.error('Failed to add destination', err);
      }
    }
  });
  return null;
};

// ─── Main Map Component ───────────────────────────────
const Map = ({ users = [], currentUserEmail, myLocation, focusLocation, destinations = [], userRole, orgName, onDestinationAdded, sidebarOpen }) => {
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu
  const center = myLocation ? [myLocation.lat, myLocation.lng] : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <ResizeFix sidebarOpen={sidebarOpen} />
      <TileLayer
        attribution='&copy; Google Maps'
        url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        maxZoom={20}
      />

      {myLocation && !focusLocation && <InitialCenter lat={myLocation.lat} lng={myLocation.lng} />}
      {focusLocation && <FocusController focusLocation={focusLocation} />}
      <MapClickHandler userRole={userRole} orgName={orgName} onDestinationAdded={onDestinationAdded} />

      {/* Render Destinations (Geofences) */}
      {destinations.map(d => (
        <Circle 
          key={d._id} 
          center={[d.lat, d.lng]} 
          radius={d.radius} 
          pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.2 }}
        >
          <Popup>
            <div style={{fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px'}}>{d.tag || 'Destination'}</div>
            <strong>{d.name}</strong><br/>
            Geofence Radius: {d.radius}m
          </Popup>
        </Circle>
      ))}

      {users.map(u =>
        u.lat && u.lng ? (
          <Marker
            key={u.socketId}
            position={[u.lat, u.lng]}
            icon={createCustomIcon(u.role, u.email === currentUserEmail, u.name)}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <img 
                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`} 
                    alt={u.name}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${getUserColor(u.role, u.name)}` }}
                  />
                  <strong>{u.name}</strong>
                  {u.role === 'admin' && <span style={{fontSize:'0.65rem',background:'#ede9fe',color:'#7c3aed',padding:'1px 6px',borderRadius:'99px',fontWeight:700}}>ADMIN</span>}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 2 }}>{u.designation}</div>
                <div style={{ fontSize: '0.72rem', marginTop: 4, fontFamily: 'monospace', color:'#6b7280' }}>
                  {u.lat.toFixed(5)}, {u.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
};

export default Map;
