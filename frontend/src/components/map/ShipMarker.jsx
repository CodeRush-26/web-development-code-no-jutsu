import { memo, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useFleetStore } from '../../store/fleetStore';
import { useShipAnimation } from '../../hooks/useShipAnimation';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';

function buildIcon(ship) {
  const color = STATUS_COLOR[ship.status] || '#10b981';
  const isDistressed = ship.status === 'distressed';
  const isAdverse = !!ship.inAdverseWeather;

  const html = `
    <div class="ship-icon">
      ${isDistressed ? '<div class="ship-distress-ring"></div>' : ''}
      <svg class="ship-arrow" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2 L17 18 L11 14 L5 18 Z" fill="${color}" stroke="#fff" stroke-width="1.2" />
      </svg>
      ${isAdverse ? '<div class="ship-weather" title="Adverse weather (+30% fuel)">⚡</div>' : ''}
      <span class="ship-label">${ship.shipId}</span>
    </div>
  `;
  return L.divIcon({
    className: 'ship-marker',
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function buildPopup(s) {
  const fuelPct = s.fuelCapacity ? Math.round((s.fuel / s.fuelCapacity) * 100) : 0;
  const fuelColor = fuelPct < 20 ? '#ef4444' : fuelPct < 50 ? '#f59e0b' : '#10b981';
  const statusColor = STATUS_COLOR[s.status] || '#10b981';
  return `
    <div style="font-family: Inter, system-ui; min-width: 230px;">
      <div style="margin-bottom:8px;">
        <div style="font-size:14px; font-weight:700; color:#e6ecff;">${s.shipId} · ${s.name || ''}</div>
        <div style="font-size:11px; color:${statusColor}; text-transform:uppercase; font-weight:600; margin-top:2px;">
          ${STATUS_LABEL[s.status] || s.status}
          ${s.inAdverseWeather ? ' · ⚡ ADVERSE +30% FUEL' : ''}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:auto 1fr; gap:4px 12px; font-size:12px; color:#a8b2d6;">
        <span>Cargo:</span><span style="color:#e6ecff;">${s.cargo || '—'}</span>
        <span>Speed:</span><span style="color:#e6ecff;">${(s.speed || 0).toFixed(1)} kts</span>
        <span>Heading:</span><span style="color:#e6ecff;">${Math.round(s.heading || 0)}°</span>
        <span>Destination:</span><span style="color:#e6ecff;">${s.destination?.portName || '—'}</span>
        <span>Fuel:</span>
        <span>
          <span style="display:inline-block; width:60px; height:6px; background:#1f2c5a; border-radius:3px; vertical-align:middle; margin-right:6px;">
            <span style="display:block; width:${fuelPct}%; height:100%; background:${fuelColor}; border-radius:3px;"></span>
          </span>
          <span style="color:#e6ecff;">${fuelPct}%</span>
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
  const getMarker = useRef(() => markerRef.current).current;
  useShipAnimation(shipId, getMarker);

  useEffect(() => {
    const ship = useFleetStore.getState().ships.get(shipId);
    if (!ship) return;
    const [lng, lat] = ship.position.coordinates;
    const marker = L.marker([lat, lng], {
      icon: buildIcon(ship),
      riseOnHover: true,
      bubblingMouseEvents: false
    })
      .addTo(map)
      .bindPopup(buildPopup(ship), { offset: [0, -8], minWidth: 230 });

    marker.on('click', () => useFleetStore.getState().selectShip(shipId));
    marker.on('popupopen', () => {
      const fresh = useFleetStore.getState().ships.get(shipId);
      if (fresh) marker.setPopupContent(buildPopup(fresh));
    });

    markerRef.current = marker;
    lastStatusRef.current = ship.status;
    lastWeatherRef.current = ship.inAdverseWeather;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [shipId, map]);

  // Refresh icon when status OR weather changes (live or playback)
  useEffect(() => {
    const unsub = useFleetStore.subscribe((state) => {
      const fresh = state.playbackShips?.get(shipId) || state.ships.get(shipId);
      if (!fresh) return;
      if (
        fresh.status !== lastStatusRef.current ||
        fresh.inAdverseWeather !== lastWeatherRef.current
      ) {
        lastStatusRef.current = fresh.status;
        lastWeatherRef.current = fresh.inAdverseWeather;
        const m = markerRef.current;
        if (m) m.setIcon(buildIcon(fresh));
      }
    });
    return unsub;
  }, [shipId]);

  return null;
}

export default memo(ShipMarkerInner);
