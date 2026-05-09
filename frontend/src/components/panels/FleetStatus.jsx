import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';

const GROUPS = [
  { key: 'normal', color: STATUS_COLOR.normal },
  { key: 'rerouting', color: STATUS_COLOR.rerouting },
  { key: 'distressed', color: STATUS_COLOR.distressed },
  { key: 'stopped', color: STATUS_COLOR.stopped },
  { key: 'stranded', color: STATUS_COLOR.stranded },
  { key: 'arrived', color: STATUS_COLOR.arrived }
];

export default function FleetStatus() {
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));
  const total = ships.length || 1;
  const counts = {};
  for (const s of ships) counts[s.status] = (counts[s.status] || 0) + 1;

  // donut
  let acc = 0;
  const segments = GROUPS.map((g) => {
    const v = counts[g.key] || 0;
    const len = (v / total) * 100;
    const seg = { ...g, value: v, offset: acc, length: len };
    acc += len;
    return seg;
  });

  return (
    <div className="card p-4">
      <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-3">Fleet Status</p>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.91549" fill="none" stroke="#1f2c5a" strokeWidth="3" />
            {segments.map((seg) =>
              seg.length > 0 ? (
                <circle
                  key={seg.key}
                  cx="18"
                  cy="18"
                  r="15.91549"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="3"
                  strokeDasharray={`${seg.length} ${100 - seg.length}`}
                  strokeDashoffset={-seg.offset}
                />
              ) : null
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{ships.length}</span>
            <span className="text-[10px] text-ink-3 uppercase">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {GROUPS.map((g) => {
            const v = counts[g.key] || 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <div key={g.key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm" style={{ background: g.color }} />
                <span className="text-ink-2 capitalize">{STATUS_LABEL[g.key]}</span>
                <span className="ml-auto text-ink-1 font-mono">
                  {v} <span className="text-ink-3">({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
