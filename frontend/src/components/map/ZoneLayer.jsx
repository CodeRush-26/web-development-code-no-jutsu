import { Polygon, Tooltip } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function ZoneLayer() {
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));
  return (
    <>
      {zones.map((z) => {
        // GeoJSON [lng,lat] → leaflet [lat,lng]
        const positions = z.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        return (
          <Polygon
            key={z.zoneId}
            positions={positions}
            pathOptions={{
              color: '#dc2626',
              weight: 2,
              fillColor: '#dc2626',
              fillOpacity: 0.18,
              dashArray: '6 6'
            }}
          >
            <Tooltip permanent={false} direction="top" opacity={1}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{z.name}</span>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
