import { Polygon, Tooltip } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function ZoneLayer({ onZoneClick, pickingDelete }) {
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));

  return (
    <>
      {zones.map((z) => {
        const positions = z.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const isStorm = (z.name || '').toLowerCase().includes('storm');
        
        // Storm color: Cyan/Blue
        // Restricted color: Red
        const color = isStorm ? '#22d3ee' : '#dc2626';
        
        return (
          <Polygon
            key={z.zoneId}
            positions={positions}
            pathOptions={{
              color: pickingDelete ? '#fbbf24' : color,
              weight: pickingDelete ? 3 : 2,
              fillColor: color,
              fillOpacity: pickingDelete ? 0.4 : isStorm ? 0.25 : 0.15,
              dashArray: isStorm ? '0' : '6 6',
              className: isStorm ? 'storm-polygon' : ''
            }}
            eventHandlers={{
              click: () => onZoneClick?.(z.zoneId, z.name)
            }}
          >
            <Tooltip direction="top" opacity={1} sticky>
              <div className="p-1 min-w-[120px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${isStorm ? 'bg-accent-cyan animate-pulse' : 'bg-accent-red'}`} />
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
                    {isStorm ? 'Storm Zone' : 'Restricted Area'}
                  </div>
                </div>
                <div className="text-xs font-heading font-semibold text-ink-1">{z.name}</div>
                {isStorm && (
                  <div className="text-[10px] text-accent-cyan/80 mt-1 font-mono italic">
                    +30% Fuel Burn · Detour Pref.
                  </div>
                )}
                {pickingDelete && (
                  <div className="text-[10px] text-accent-amber mt-1 font-bold">CLICK TO DELETE</div>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
