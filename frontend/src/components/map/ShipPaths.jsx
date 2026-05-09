import { Polyline } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

/**
 * Render each ship's planned path as a glowing dashed line.
 * Two overlapping polylines: a wider blurred "glow" line + a crisp top line.
 */
export default function ShipPaths() {
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));
  const selectedShipId = useFleetStore((s) => s.selectedShipId);

  return (
    <>
      {ships.map((s) => {
        if (!s.currentPath || s.currentPath.length < 2) return null;
        // GeoJSON [lng,lat] → Leaflet [lat,lng]
        const positions = s.currentPath.map(([lng, lat]) => [lat, lng]);
        const isSelected = s.shipId === selectedShipId;
        const color =
          s.status === 'distressed'
            ? '#dc2626'
            : s.status === 'rerouting'
              ? '#f59e0b'
              : s.status === 'insufficient_fuel'
                ? '#f97316'
                : '#22d3ee';
        return (
          <span key={s.shipId}>
            {/* Glow layer (wider, semi-transparent) */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: isSelected ? 6 : 4,
                opacity: 0.15,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Crisp path on top */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: isSelected ? 2.5 : 1.8,
                opacity: isSelected ? 0.85 : 0.6,
                dashArray: isSelected ? '8 6' : '5 8',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </span>
        );
      })}
    </>
  );
}
