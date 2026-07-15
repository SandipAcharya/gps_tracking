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

// ─── Custom Marker Icon ───────────────────────────────
const createCustomIcon = (isMe, email) => {
  const color = isMe ? '#6366f1' : stringToColor(email);
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color};opacity:0.25;animation:radar-pulse 2s infinite ease-out;"></div>
        <div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;z-index:2;"></div>
      </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20]
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
            icon={createCustomIcon(u.email === currentUserEmail, u.email)}
          >
            <Popup>
              <div style={{ minWidth: 120 }}>
                <strong>{u.email === currentUserEmail ? `${u.name} (You)` : u.name}</strong>
                <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 2 }}>{u.designation}</div>
                <div style={{ fontSize: '0.72rem', marginTop: 4, fontFamily: 'monospace' }}>
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
