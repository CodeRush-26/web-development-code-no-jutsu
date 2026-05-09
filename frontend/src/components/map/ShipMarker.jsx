import { memo, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useFleetStore } from '../../store/fleetStore';
import { useShipAnimation } from '../../hooks/useShipAnimation';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';

/** Status → CSS glow color */
const GLOW_MAP = {
  normal: 'rgba(16, 185, 129, 0.5)',
  rerouting: 'rgba(245, 158, 11, 0.55)',
  distressed: 'rgba(220, 38, 38, 0.65)',
  stopped: 'rgba(107, 114, 128, 0.4)',
  stranded: 'rgba(168, 85, 247, 0.5)',
  arrived: 'rgba(59, 130, 246, 0.4)',
  insufficient_fuel: 'rgba(249, 115, 22, 0.5)',
  out_of_fuel: 'rgba(127, 29, 29, 0.5)'
};

function buildIcon(ship, isSelected) {
  const color = STATUS_COLOR[ship.status] || '#10b981';
  const glow = GLOW_MAP[ship.status] || 'rgba(34, 211, 238, 0.5)';
  const isDistressed = ship.status === 'distressed';
  const isAdverse = !!ship.inAdverseWeather;

  const html = `
    <div class="ship-icon" style="--ship-glow: ${glow}">
      ${isDistressed ? '<div class="ship-distress-ring"></div><div class="ship-distress-ring-2"></div>' : ''}
      ${isSelected ? '<div class="ship-selected-ring"></div>' : ''}
      <svg class="ship-hull" width="28" height="28" viewBox="0 0 32 32" fill="none">
        <!-- Ship hull silhouette -->
        <path d="M16 3 L22 11 L21 24 L16 28 L11 24 L10 11 Z" 
              fill="${color}" stroke="rgba(255,255,255,0.25)" stroke-width="0.7"
              filter="url(#shipGlow)"/>
        <!-- Bridge superstructure -->
        <rect x="13" y="9" width="6" height="3.5" rx="1" fill="rgba(255,255,255,0.15)"/>
        <!-- Bow highlight -->
        <circle cx="16" cy="5.5" r="1.2" fill="rgba(255,255,255,0.35)"/>
        <!-- Keel line -->
        <line x1="16" y1="6" x2="16" y2="26" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
        <!-- Glow filter -->
        <defs>
          <filter id="shipGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
      ${isAdverse ? '<div class="ship-weather" title="Adverse weather (+30% fuel)">⚡</div>' : ''}
      <span class="ship-label">${ship.name || ship.shipId}</span>
    </div>
  `;
  return L.divIcon({
    className: 'ship-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function buildPopup(s) {
  const fuelPct = s.fuelCapacity ? Math.round((s.fuel / s.fuelCapacity) * 100) : 0;
  const fuelColor = fuelPct < 20 ? '#ef4444' : fuelPct < 50 ? '#f59e0b' : '#10b981';
  const statusColor = STATUS_COLOR[s.status] || '#10b981';
  return `
    <div style="font-family: 'IBM Plex Sans', system-ui; min-width: 240px;">
      <div style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:'Orbitron'; font-size:11px; font-weight:700; color:#22d3ee; letter-spacing:0.04em;">${s.shipId}</span>
          <span style="font-size:14px; font-weight:700; color:#e6ecff;">${s.name || ''}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${statusColor};"></span>
          <span style="font-size:11px; color:${statusColor}; text-transform:uppercase; font-weight:600; font-family:'Rajdhani',sans-serif; letter-spacing:0.06em;">
            ${STATUS_LABEL[s.status] || s.status}
          </span>
          ${s.inAdverseWeather ? '<span style="font-size:10px; color:#f59e0b; font-weight:600;">⚡ ADVERSE</span>' : ''}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:4px 14px; font-size:12px; color:#a8b2d6;">
        <span style="font-family:'Rajdhani'; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Cargo</span>
        <span style="color:#e6ecff; font-weight:500;">${s.cargo || '—'}</span>
        <span style="font-family:'Rajdhani'; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Speed</span>
        <span style="color:#e6ecff; font-family:'IBM Plex Mono'; font-weight:500;">${(s.speed || 0).toFixed(1)} kts</span>
        <span style="font-family:'Rajdhani'; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Heading</span>
        <span style="color:#e6ecff; font-family:'IBM Plex Mono'; font-weight:500;">${Math.round(s.heading || 0)}°</span>
        <span style="font-family:'Rajdhani'; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Dest</span>
        <span style="color:#e6ecff; font-weight:500;">${s.destination?.portName || '—'}</span>
        <span style="font-family:'Rajdhani'; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Fuel</span>
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:60px; height:5px; background:#1f2c5a; border-radius:3px; overflow:hidden;">
            <span style="display:block; width:${fuelPct}%; height:100%; background:${fuelColor}; border-radius:3px; transition:width 0.5s ease;"></span>
          </span>
          <span style="color:#e6ecff; font-family:'IBM Plex Mono'; font-weight:500;">${fuelPct}%</span>
        </span>
      </div>
    </div>
  `;
}

function ShipMarkerInner({ shipId }) {
  const map = useMap();
  const markerRef = useRef(null);
  const lastStatusRef = useRef(null);
  const lastWeatherRef = useRef(null);
  const lastSelectedRef = useRef(null);
  const getMarker = useRef(() => markerRef.current).current;
  useShipAnimation(shipId, getMarker);

  useEffect(() => {
    const ship = useFleetStore.getState().ships.get(shipId);
    if (!ship) return;
    const selectedId = useFleetStore.getState().selectedShipId;
    const [lng, lat] = ship.position.coordinates;
    const marker = L.marker([lat, lng], {
      icon: buildIcon(ship, selectedId === shipId),
      riseOnHover: true,
      bubblingMouseEvents: false
    })
      .addTo(map)
      .bindPopup(buildPopup(ship), { offset: [0, -12], minWidth: 240 });

    marker.on('click', () => useFleetStore.getState().selectShip(shipId));
    marker.on('popupopen', () => {
      const fresh = useFleetStore.getState().ships.get(shipId);
      if (fresh) marker.setPopupContent(buildPopup(fresh));
    });

    markerRef.current = marker;
    lastStatusRef.current = ship.status;
    lastWeatherRef.current = ship.inAdverseWeather;
    lastSelectedRef.current = selectedId === shipId;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [shipId, map]);

  // Refresh icon when status, weather, or selection changes
  useEffect(() => {
    const unsub = useFleetStore.subscribe((state) => {
      const fresh = state.playbackShips?.get(shipId) || state.ships.get(shipId);
      if (!fresh) return;
      const isSelected = state.selectedShipId === shipId;
      if (
        fresh.status !== lastStatusRef.current ||
        fresh.inAdverseWeather !== lastWeatherRef.current ||
        isSelected !== lastSelectedRef.current
      ) {
        lastStatusRef.current = fresh.status;
        lastWeatherRef.current = fresh.inAdverseWeather;
        lastSelectedRef.current = isSelected;
        const m = markerRef.current;
        if (m) m.setIcon(buildIcon(fresh, isSelected));
      }
    });
    return unsub;
  }, [shipId]);

  return null;
}

export default memo(ShipMarkerInner);
