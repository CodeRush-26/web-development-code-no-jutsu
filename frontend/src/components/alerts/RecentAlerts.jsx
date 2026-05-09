import { AlertTriangle, AlertCircle, Crosshair } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { SEVERITY_COLOR, SEVERITY_RANK } from '../../lib/config';
import { emit } from '../../lib/socket';

const ICON = {
  geofence: AlertCircle,
  proximity: Crosshair,
  distress: AlertTriangle,
  stranded: AlertTriangle,
  insufficient_fuel: AlertCircle,
  out_of_fuel: AlertCircle,
  predictive: AlertCircle
};

export default function RecentAlerts({ limit = 4 }) {
  const alerts = useFleetStore((s) => s.alerts);
  const sorted = [...alerts]
    .sort((a, b) => {
      const r = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
      if (r !== 0) return r;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, limit);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">Recent Alerts</p>
        <button className="text-xs text-accent-cyan hover:underline">View all</button>
      </div>
      <div className="divide-y divide-bg-line">
        {!sorted.length && (
          <div className="px-4 py-6 text-sm text-ink-3 text-center">No active alerts</div>
        )}
        {sorted.map((a) => {
          const Icon = ICON[a.type] || AlertCircle;
          const color = SEVERITY_COLOR[a.severity] || '#64748b';
          const ago = formatAgo(a.createdAt);
          return (
            <div
              key={a.alertId}
              className="px-4 py-3 flex items-start gap-3 hover:bg-bg-line/30 transition"
            >
              <div className="severity-bar" style={{ background: color }} />
              <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color }}>
                  {humanType(a.type)}
                </p>
                <p className="text-xs text-ink-2 truncate">{a.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-ink-3">{ago}</span>
                <button
                  onClick={() => emit('alert:acknowledge', { alertId: a.alertId })}
                  className="text-[10px] text-ink-3 hover:text-ink-1"
                >
                  ack
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function humanType(t) {
  const map = {
    geofence: 'Geofence Breach',
    proximity: 'Proximity Warning',
    distress: 'Distress Signal',
    stranded: 'Vessel Stranded',
    insufficient_fuel: 'Low Fuel',
    out_of_fuel: 'Out of Fuel',
    predictive: 'Predictive Alert'
  };
  return map[t] || t;
}

function formatAgo(t) {
  const ms = Date.now() - new Date(t).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} hr ago`;
}
