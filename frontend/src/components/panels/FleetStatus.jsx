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
  const selectShip = useFleetStore((s) => s.selectShip);
  const total = ships.length || 1;
  const counts = {};
  for (const s of ships) counts[s.status] = (counts[s.status] || 0) + 1;

  // Donut segments
  let acc = 0;
  const segments = GROUPS.map((g) => {
    const v = counts[g.key] || 0;
    const len = (v / total) * 100;
    const seg = { ...g, value: v, offset: acc, length: len };
    acc += len;
    return seg;
  });

  // What's the most critical status?
  const centerStatus = counts.distressed
    ? { label: 'Distressed', value: counts.distressed, color: STATUS_COLOR.distressed }
    : counts.stranded
      ? { label: 'Stranded', value: counts.stranded, color: STATUS_COLOR.stranded }
      : { label: 'Total', value: ships.length, color: '#22d3ee' };

  return (
    <div className="card p-4">
      <p className="section-label mb-3">Fleet Status</p>
      <div className="flex items-center gap-5">
        {/* Donut with glow */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle cx="18" cy="18" r="15.91549" fill="none" stroke="#1f2c5a" strokeWidth="2.5" />
            {/* Segments with transitions */}
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
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease',
                    filter: `drop-shadow(0 0 3px ${seg.color}44)`
                  }}
                />
              ) : null
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-data" style={{ color: centerStatus.color }}>
              {centerStatus.value}
            </span>
            <span className="text-[9px] text-ink-3 uppercase font-heading font-semibold tracking-wider">
              {centerStatus.label}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {GROUPS.map((g) => {
            const v = counts[g.key] || 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <div key={g.key} className="flex items-center gap-2 group cursor-pointer"
                onClick={() => {
                  const ship = ships.find((s) => s.status === g.key);
                  if (ship) selectShip(ship.shipId);
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 transition-all group-hover:scale-125"
                  style={{ background: g.color, boxShadow: v > 0 ? `0 0 6px ${g.color}44` : 'none' }}
                />
                <span className="text-ink-2 capitalize font-heading font-semibold group-hover:text-ink-1 transition">
                  {STATUS_LABEL[g.key]}
                </span>
                <span className="ml-auto text-ink-1 font-mono text-[11px]">
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
