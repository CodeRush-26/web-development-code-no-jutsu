import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { Square, Trash2, X } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTR } from '../../lib/config';
import ShipMarker from './ShipMarker';
import ShipPaths from './ShipPaths';
import ZoneLayer from './ZoneLayer';
import ZoneDrawTool from './ZoneDrawTool';
import NavigablePolygon from './NavigablePolygon';
import PortMarkers from './PortMarkers';
import { emit } from '../../lib/socket';

export default function FleetMap({ mode = 'command' }) {
  const [drawing, setDrawing] = useState(false);
  const [pickingDelete, setPickingDelete] = useState(false);
  const shipIds = useFleetStore(useShallow((s) => [...s.ships.keys()]));
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));

  function handleZoneClick(zoneId, name) {
    if (!pickingDelete) return;
    if (window.confirm(`Delete "${name}"?`)) {
      emit('zone:delete', { zoneId });
      setPickingDelete(false);
    }
  }

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
        <ZoneLayer onZoneClick={handleZoneClick} pickingDelete={pickingDelete} />
        <ShipPaths />
        {mode === 'command' && drawing && (
          <ZoneDrawTool active onDone={() => setDrawing(false)} />
        )}
        {shipIds.map((id) => (
          <ShipMarker key={id} shipId={id} />
        ))}
      </MapContainer>

      {/* Top-right zone toolbar */}
      {mode === 'command' && (
        <div className="absolute top-4 right-4 flex gap-2 z-[1000]">
          <ToolBtn
            icon={drawing ? X : Square}
            label={drawing ? 'Cancel Draw' : 'Draw Zone'}
            active={drawing}
            onClick={() => {
              setPickingDelete(false);
              setDrawing((d) => !d);
            }}
          />
          <ToolBtn
            icon={pickingDelete ? X : Trash2}
            label={pickingDelete ? 'Cancel' : 'Delete Zone'}
            active={pickingDelete}
            disabled={!zones.length && !pickingDelete}
            onClick={() => {
              setDrawing(false);
              setPickingDelete((d) => !d);
            }}
          />
        </div>
      )}

      {/* Drawing instructions */}
      {drawing && mode === 'command' && (
        <div className="absolute top-20 right-4 z-[1000] max-w-[260px] bg-bg-panel/95 border border-accent-red/40 rounded-lg p-3 shadow-xl">
          <p className="text-xs font-semibold text-accent-red mb-1">Drawing Zone</p>
          <p className="text-[11px] text-ink-2">
            Click to add polygon points. Click the first point again to close the shape.
          </p>
        </div>
      )}
      {pickingDelete && mode === 'command' && (
        <div className="absolute top-20 right-4 z-[1000] max-w-[260px] bg-bg-panel/95 border border-accent-amber/40 rounded-lg p-3 shadow-xl">
          <p className="text-xs font-semibold text-accent-amber mb-1">Delete Mode</p>
          <p className="text-[11px] text-ink-2">Click a zone polygon to remove it.</p>
        </div>
      )}

      {/* Bottom-left scale + ship count */}
      <div className="absolute bottom-3 left-3 z-[900] flex items-center gap-2">
        <div className="text-[10px] text-ink-3 bg-bg-panel/80 px-2 py-1 rounded border border-bg-line backdrop-blur-sm">
          Strait of Hormuz · {shipIds.length} ships · {zones.length} zone
          {zones.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition shadow-lg backdrop-blur-sm ${
        active
          ? 'bg-accent-red/30 border-accent-red/70 text-ink-1'
          : 'bg-bg-panel/95 border-bg-line text-ink-1 hover:bg-bg-line/60'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
