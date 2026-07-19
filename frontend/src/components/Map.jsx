import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getUserColor, getEmployeeColor } from '../utils/colors';
import { BASE_URL } from '../utils/api';
import { Search, X } from 'lucide-react';
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
  const map = useMap();
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
        const token = localStorage.getItem('geo_token');
        const response = await fetch(`${BASE_URL}/api/destinations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
          // Auto-fly to the newly created geofence so admin can confirm it
          map.flyTo([e.latlng.lat, e.latlng.lng], 17, { animate: true, duration: 1.0 });
        } else {
          const err = await response.json();
          alert(`Failed to save geofence: ${err.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Failed to add destination', err);
        alert('Network error — could not save geofence. Check your connection.');
      }
    }
  });
  return null;
};

// ─── Map Search Component ─────────────────────────────
const MapSearch = ({ onLocationSelected }) => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const goToLocation = (lat, lon, name) => {
    map.flyTo([lat, lon], 17, { animate: true, duration: 1.5 });
    if (onLocationSelected) onLocationSelected({ lat, lon, name });
    setResults([]);
    setQuery(name); // Keep the selected name in the input box
  };

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  return (
    <div ref={containerRef} className="map-search-bar">
      <form onSubmit={handleSearch} style={{ display: 'flex', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <input 
          type="text" 
          placeholder="Search location..." 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) {
              setResults([]);
              if (onLocationSelected) onLocationSelected(null);
            }
          }}
          style={{ flex: 1, border: 'none', padding: '10px 10px', outline: 'none', fontSize: '0.9rem', minWidth: 0 }}
        />
        {query && (
          <button 
            type="button" 
            onClick={() => {
              setQuery('');
              setResults([]);
              if (onLocationSelected) onLocationSelected(null);
            }}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 8px' }}
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" disabled={isSearching} style={{ background: '#4f46e5', color: 'white', border: 'none', width: '44px', minWidth: '44px', height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Search size={18} style={{ opacity: isSearching ? 0.5 : 1 }} />
        </button>
      </form>

      {results.length > 0 && (
        <div style={{ marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div 
              key={i} 
              onClick={() => goToLocation(r.lat, r.lon, r.display_name)}
              style={{ padding: '10px 16px', borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', fontSize: '0.8rem', lineHeight: '1.4' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ─── Main Map Component ───────────────────────────────
const Map = ({ users = [], currentUserEmail, myLocation, focusLocation, destinations = [], userRole, orgName, onDestinationAdded, sidebarOpen }) => {
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu
  const center = myLocation ? [myLocation.lat, myLocation.lng] : defaultCenter;
  const [searchLocation, setSearchLocation] = useState(null);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <MapSearch onLocationSelected={setSearchLocation} />
      <ResizeFix sidebarOpen={sidebarOpen} />
      <TileLayer
        attribution='&copy; Google Maps'
        url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        maxZoom={20}
      />

      {myLocation && !focusLocation && <InitialCenter lat={myLocation.lat} lng={myLocation.lng} />}
      {focusLocation && <FocusController focusLocation={focusLocation} />}
      <MapClickHandler userRole={userRole} orgName={orgName} onDestinationAdded={onDestinationAdded} />

      {searchLocation && (
        <Marker 
          position={[searchLocation.lat, searchLocation.lon]}
          icon={L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.8);animation:bounce 1s infinite;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        >
          <Popup onClose={() => setSearchLocation(null)}>
            <div style={{fontSize: '0.75rem', color: '#ef4444', fontWeight: 700}}>SEARCH RESULT</div>
            <strong>{searchLocation.name}</strong><br/>
            <span style={{fontSize: '0.75rem', color: '#6b7280'}}>Click near here to add geofence</span>
          </Popup>
        </Marker>
      )}

      {/* Render Destinations (Geofences) */}
      {destinations.map(d => {
        const geofenceIcon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;background:#ec4899;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(236,72,153,0.8);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        return (
          <React.Fragment key={d._id}>
            <Circle
              center={[d.lat, d.lng]}
              radius={d.radius}
              pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.2, weight: 2 }}
            />
            <Marker position={[d.lat, d.lng]} icon={geofenceIcon}>
              <Popup>
                <div style={{fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px'}}>{d.tag || 'Destination'}</div>
                <strong>{d.name}</strong><br/>
                Geofence Radius: {d.radius}m
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}

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
