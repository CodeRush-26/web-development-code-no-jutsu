import { Polygon, Tooltip } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function ZoneLayer({ onZoneClick, pickingDelete }) {
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));

  return (
    <>
      {zones.map((z) => {
        const positions = z.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        return (
          <Polygon
            key={z.zoneId}
            positions={positions}
            pathOptions={{
              color: pickingDelete ? '#fbbf24' : '#dc2626',
              weight: pickingDelete ? 3 : 2,
              fillColor: '#dc2626',
              fillOpacity: pickingDelete ? 0.35 : 0.18,
              dashArray: '6 6'
            }}
            eventHandlers={{
              click: () => onZoneClick?.(z.zoneId, z.name)
            }}
          >
            <Tooltip direction="top" opacity={1} sticky>
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: 600, color: '#dc2626' }}>{z.name}</div>
                {pickingDelete && (
                  <div style={{ color: '#fbbf24' }}>click to delete</div>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
