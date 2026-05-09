import { AlertTriangle, AlertCircle, Crosshair, Check } from 'lucide-react';
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

const SEVERITY_GRADIENT = {
  critical: 'from-sev-critical/20 to-transparent',
  high: 'from-sev-high/15 to-transparent',
  medium: 'from-sev-medium/10 to-transparent',
  low: 'from-sev-low/10 to-transparent'
};

export default function RecentAlerts({ limit = 5 }) {
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
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-red" />
          <p className="section-label">Active Alerts</p>
        </div>
        {alerts.length > limit && (
          <span className="text-[10px] font-mono text-ink-3">
            {alerts.length} total
          </span>
        )}
      </div>
      <div className="divide-y divide-bg-line/50">
        {!sorted.length && (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5 text-accent-green" />
            </div>
            <p className="text-sm text-ink-2 font-heading font-semibold">All Clear</p>
            <p className="text-[11px] text-ink-3 mt-1">No active alerts in the system.</p>
          </div>
        )}
        {sorted.map((a, i) => {
          const Icon = ICON[a.type] || AlertCircle;
          const color = SEVERITY_COLOR[a.severity] || '#64748b';
          const ago = formatAgo(a.createdAt);
          const isCritical = a.severity === 'critical';
          const gradient = SEVERITY_GRADIENT[a.severity] || '';
          return (
            <div
              key={a.alertId}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-bg-elevated/30 transition-all duration-200 alert-entry bg-gradient-to-r ${gradient}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Severity bar */}
              <div
                className="severity-bar"
                style={{
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                  boxShadow: isCritical ? `0 0 8px ${color}66` : 'none'
                }}
              />
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-heading font-bold tracking-wide" style={{ color }}>
                    {humanType(a.type)}
                  </p>
                  {isCritical && (
                    <span className="severity-flash-critical text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-sev-critical/20 text-sev-critical uppercase tracking-wider">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-2 mt-0.5 line-clamp-2">{a.message}</p>
                {a.shipIds?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {a.shipIds.map((id) => (
                      <span key={id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card border border-bg-line text-ink-2">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[10px] text-ink-3 font-mono">{ago}</span>
                <button
                  onClick={() => emit('alert:acknowledge', { alertId: a.alertId })}
                  className="flex items-center gap-1 text-[10px] font-heading font-semibold text-ink-3 hover:text-accent-cyan px-2 py-0.5 rounded bg-bg-card/50 border border-bg-line hover:border-accent-cyan/30 transition-all"
                >
                  <Check className="w-3 h-3" />
                  ACK
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
    insufficient_fuel: 'Low Fuel Alert',
    out_of_fuel: 'Out of Fuel',
    predictive: 'Predictive Alert'
  };
  return map[t] || t;
}

function formatAgo(t) {
  const ms = Date.now() - new Date(t).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}
