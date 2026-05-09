import { Trash2, Square } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';
import { emit } from '../../lib/socket';

export default function ZonesPanel() {
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">
          Restricted Zones ({zones.length})
        </p>
        <p className="text-[10px] text-ink-3">Use the map's "Draw Zone" button to add new zones</p>
      </div>

      {!zones.length && (
        <p className="px-4 py-8 text-sm text-ink-3 text-center">
          No restricted zones drawn yet. Switch to the map and click "Draw Zone".
        </p>
      )}

      {zones.length > 0 && (
        <div className="divide-y divide-bg-line">
          {zones.map((z) => {
            const ringCount = z.geometry?.coordinates?.[0]?.length || 0;
            return (
              <div key={z.zoneId} className="px-4 py-3 flex items-center gap-3">
                <Square className="w-4 h-4 text-accent-red shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-1">{z.name}</p>
                  <p className="text-xs text-ink-3">
                    {ringCount} vertices · created by {z.createdBy || 'command'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${z.name}"?`)) {
                      emit('zone:delete', { zoneId: z.zoneId });
                    }
                  }}
                  className="text-ink-3 hover:text-accent-red p-1"
                  title="Delete zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
