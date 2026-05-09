import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { Square, Edit3, Trash2 } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTR } from '../../lib/config';
import ShipMarker from './ShipMarker';
import ZoneLayer from './ZoneLayer';
import ZoneDrawTool from './ZoneDrawTool';
import NavigablePolygon from './NavigablePolygon';
import PortMarkers from './PortMarkers';
import { emit } from '../../lib/socket';

export default function FleetMap({ mode = 'command' }) {
  const [drawing, setDrawing] = useState(false);
  const shipIds = useFleetStore(useShallow((s) => [...s.ships.keys()]));
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="h-full w-full"
        preferCanvas
        zoomControl
        worldCopyJump={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <NavigablePolygon />
        <PortMarkers />
        <ZoneLayer />
        {mode === 'command' && drawing && <ZoneDrawTool active />}
        {shipIds.map((id) => (
          <ShipMarker key={id} shipId={id} />
        ))}
      </MapContainer>

      {/* Top-right zone toolbar */}
      {mode === 'command' && (
        <div className="absolute top-4 right-4 flex gap-2 z-[1000]">
          <ToolBtn
            icon={Square}
            label="Draw Zone"
            active={drawing}
            onClick={() => setDrawing((d) => !d)}
          />
          <ToolBtn
            icon={Edit3}
            label="Edit Zone"
            disabled={!zones.length}
            onClick={() => {
              alert('Edit: select a zone polygon to edit (using Leaflet edit handles).');
            }}
          />
          <ToolBtn
            icon={Trash2}
            label="Delete Zone"
            disabled={!zones.length}
            onClick={() => {
              const last = zones[zones.length - 1];
              if (last && window.confirm(`Delete "${last.name}"?`)) {
                emit('zone:delete', { zoneId: last.zoneId });
              }
            }}
          />
        </div>
      )}

      {/* Bottom-left scale */}
      <div className="absolute bottom-3 left-3 z-[900] text-[10px] text-ink-3 bg-bg-panel/70 px-2 py-1 rounded border border-bg-line">
        Strait of Hormuz · Live
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition shadow-lg ${
        active
          ? 'bg-accent-red/20 border-accent-red/60 text-ink-1'
          : 'bg-bg-panel/90 border-bg-line text-ink-1 hover:bg-bg-line/40'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
