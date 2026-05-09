import { Polygon } from 'react-leaflet';
import { useFleetStore } from '../../store/fleetStore';

export default function NavigablePolygon() {
  const poly = useFleetStore((s) => s.navigablePolygon);
  if (!poly) return null;
  const positions = poly.coordinates[0].map(([lng, lat]) => [lat, lng]);
  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#22d3ee',
        weight: 1,
        opacity: 0.4,
        fillColor: '#22d3ee',
        fillOpacity: 0.04,
        dashArray: '2 4'
      }}
    />
  );
}
