import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper to generate consistent colors based on email/name
export const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Create a custom icon for markers
const createCustomIcon = (isMe, email) => {
  const markerColor = isMe ? 'var(--accent)' : stringToColor(email);
  return L.divIcon({
    className: 'custom-marker ' + (isMe ? 'me-marker' : ''),
    html: `
      <div class="fancy-marker-container">
        <div class="fancy-marker-pulse" style="background-color: ${markerColor}"></div>
        <div class="fancy-marker-core" style="background-color: ${markerColor}; border-color: white"></div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -20]
  });
};

// Component to handle flying to focused user
const FocusController = ({ focusLocation }) => {
  const map = useMap();
  useEffect(() => {
    if (focusLocation && focusLocation.lat && focusLocation.lng) {
      map.flyTo([focusLocation.lat, focusLocation.lng], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [focusLocation, map]);
  return null;
};

// Component to recenter map when my location updates initially
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      // Only setView if it hasn't been heavily zoomed in yet
      if (map.getZoom() < 13) {
        map.setView([lat, lng], 15);
      }
    }
  }, [lat, lng, map]);
  return null;
};

const Map = ({ users, currentUserEmail, myLocation, focusLocation }) => {
  // Default center to Kathmandu Valley
  const defaultCenter = [27.7172, 85.3240]; 
  const center = myLocation ? [myLocation.lat, myLocation.lng] : defaultCenter;

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; Google Maps'
        url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
      />
      
      {myLocation && !focusLocation && <RecenterAutomatically lat={myLocation.lat} lng={myLocation.lng} />}
      {focusLocation && <FocusController focusLocation={focusLocation} />}

      {users.map((user) => (
        user.lat && user.lng ? (
          <Marker 
            key={user.socketId} 
            position={[user.lat, user.lng]}
            icon={createCustomIcon(user.email === currentUserEmail, user.email)}
          >
            <Popup className="custom-popup">
              <strong>{user.email === currentUserEmail ? 'You' : user.name}</strong>
              <br />
              <span style={{ fontSize: '0.8rem', color: 'gray' }}>{user.designation}</span>
              <br />
              <span style={{ fontSize: '0.75rem' }}>Lat: {user.lat.toFixed(4)} | Lng: {user.lng.toFixed(4)}</span>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
};

export default Map;
