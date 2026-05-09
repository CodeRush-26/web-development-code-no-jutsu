import { Polyline } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

/**
 * Render each ship's planned path as a faint dashed line.
 * PDF: "Routing is your job" + "ship's status flips to rerouting" — visualizing
 * the chosen path lets the operator confirm routing actually works.
 */
export default function ShipPaths() {
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));

  return (
    <>
      {ships.map((s) => {
        if (!s.currentPath || s.currentPath.length < 2) return null;
        // GeoJSON [lng,lat] → Leaflet [lat,lng]
        const positions = s.currentPath.map(([lng, lat]) => [lat, lng]);
        const color =
          s.status === 'rerouting'
            ? '#f59e0b'
            : s.status === 'distressed'
              ? '#dc2626'
              : '#22d3ee';
        return (
          <Polyline
            key={s.shipId}
            positions={positions}
            pathOptions={{
              color,
              weight: 1.4,
              opacity: 0.55,
              dashArray: '4 6',
              lineCap: 'round'
            }}
          />
        );
      })}
    </>
  );
}
