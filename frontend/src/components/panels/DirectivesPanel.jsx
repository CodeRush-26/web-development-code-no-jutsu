import { Navigation, RefreshCw, MapPin, Pause } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';

const ICONS = {
  reroute: RefreshCw,
  divert: MapPin,
  hold: Pause,
  change_destination: Navigation
};

const COLORS = {
  accepted: { bg: 'bg-accent-green/20', text: 'text-accent-green' },
  pending: { bg: 'bg-accent-amber/20', text: 'text-accent-amber' },
  escalated: { bg: 'bg-accent-red/20', text: 'text-accent-red' }
};

export default function DirectivesPanel() {
  const directives = useFleetStore((s) => s.directives);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">Directives</p>
        <button className="text-xs text-accent-cyan hover:underline">View all</button>
      </div>
      <div className="divide-y divide-bg-line max-h-64 overflow-y-auto">
        {!directives.length && (
          <div className="px-4 py-6 text-sm text-ink-3 text-center">No directives sent yet</div>
        )}
        {directives.map((d) => {
          const Icon = ICONS[d.type] || Navigation;
          const c = COLORS[d.status] || COLORS.pending;
          return (
            <div
              key={d.directiveId}
              className="px-4 py-3 flex items-start gap-3 hover:bg-bg-line/30 transition"
            >
              <Icon className="w-4 h-4 mt-0.5 text-accent-cyan shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-1">{humanizeType(d.type)}</p>
                <p className="text-xs text-ink-3">To: {d.shipId}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}
                >
                  {d.status}
                </span>
                <span className="text-[10px] text-ink-3">{ago(d.issuedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function humanizeType(t) {
  return {
    reroute: 'Reroute to Safe Path',
    divert: 'Divert via Waypoint',
    hold: 'Hold Position',
    change_destination: 'Change Course'
  }[t] || t;
}

function ago(t) {
  const ms = Date.now() - new Date(t).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} hr ago`;
}
