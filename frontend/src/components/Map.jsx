import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Color Helper ─────────────────────────────────────
export const stringToColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '000000'.substring(0, 6 - c.length) + c;
};

// ─── Role-based Marker Colors ────────────────────────
const ROLE_COLORS = {
  admin: '#7c3aed',     // Brand purple for admin
  me:    '#2563eb',     // Blue for yourself
  employee: null,       // Generated from name hash for employees
};

// Employee palette — vibrant, distinct colors
const EMPLOYEE_PALETTE = [
  '#e11d48', '#0891b2', '#16a34a', '#ea580c',
  '#7c3aed', '#be185d', '#0284c7', '#dc2626',
  '#059669', '#d97706'
];

const getEmployeeColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EMPLOYEE_PALETTE[Math.abs(hash) % EMPLOYEE_PALETTE.length];
};

// ─── Custom Marker Icon ───────────────────────────────
const createCustomIcon = (role, isMe, name) => {
  let color;
  if (isMe) color = ROLE_COLORS.me;
  else if (role === 'admin') color = ROLE_COLORS.admin;
  else color = getEmployeeColor(name);

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
const ResizeFix = () => {
  const map = useMap();
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

// ─── Main Map Component ───────────────────────────────
const Map = ({ users, currentUserEmail, myLocation, focusLocation }) => {
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu
  const center = myLocation ? [myLocation.lat, myLocation.lng] : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <ResizeFix />
      <TileLayer
        attribution='&copy; Google Maps'
        url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        maxZoom={20}
      />

      {myLocation && !focusLocation && <InitialCenter lat={myLocation.lat} lng={myLocation.lng} />}
      {focusLocation && <FocusController focusLocation={focusLocation} />}

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
                  <div style={{width:10,height:10,borderRadius:'50%',background: u.role==='admin' ? '#7c3aed' : getEmployeeColor(u.name),flexShrink:0}}></div>
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
