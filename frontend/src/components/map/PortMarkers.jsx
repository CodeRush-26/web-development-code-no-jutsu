import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useFleetStore } from '../../store/fleetStore';

function buildPortIcon(portName) {
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; pointer-events:auto;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 4px rgba(168, 178, 214, 0.4));">
        <circle cx="12" cy="12" r="4" fill="#a8b2d6" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <circle cx="12" cy="12" r="7" fill="none" stroke="rgba(168, 178, 214, 0.25)" stroke-width="0.8"/>
      </svg>
      <span style="
        font-family: 'IBM Plex Mono', monospace;
        font-size: 8px;
        font-weight: 500;
        color: #a8b2d6;
        background: rgba(6, 13, 31, 0.8);
        padding: 1px 5px;
        border-radius: 2px;
        white-space: nowrap;
        margin-top: 2px;
        letter-spacing: 0.04em;
        border: 1px solid rgba(31, 44, 90, 0.4);
      ">${portName}</span>
    </div>
  `;
  return L.divIcon({
    className: '',
    html,
    iconSize: [60, 30],
    iconAnchor: [30, 8]
  });
}

export default function PortMarkers() {
  const ports = useFleetStore((s) => s.ports);
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const p of ports) {
      const [lng, lat] = p.coordinates;
      const marker = L.marker([lat, lng], {
        icon: buildPortIcon(p.portName),
        interactive: false,
        zIndexOffset: -100
      }).addTo(map);
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [ports, map]);

  return null;
}
