import { CircleMarker, Tooltip } from 'react-leaflet';
import { useFleetStore } from '../../store/fleetStore';

export default function PortMarkers() {
  const ports = useFleetStore((s) => s.ports);
  return (
    <>
      {ports.map((p) => (
        <CircleMarker
          key={p.portId}
          center={[p.coordinates[1], p.coordinates[0]]}
          radius={4}
          pathOptions={{ color: '#a8b2d6', fillColor: '#a8b2d6', fillOpacity: 0.7, weight: 1 }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1}>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{p.portName}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
