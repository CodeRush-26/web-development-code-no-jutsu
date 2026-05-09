import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Crosshair, Check, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
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
  predictive: AlertCircle,
  predictive_fuel: AlertCircle,
  predictive_zone: Map
};

const SEVERITY_GRADIENT = {
  critical: 'from-sev-critical/20 to-transparent',
  high: 'from-sev-high/15 to-transparent',
  medium: 'from-sev-medium/10 to-transparent',
  low: 'from-sev-low/10 to-transparent'
};

export default function RecentAlerts({ initialLimit = 5 }) {
  const alerts = useFleetStore((s) => s.alerts);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return alerts
      .filter(a => 
        a.message.toLowerCase().includes(search.toLowerCase()) || 
        a.type.toLowerCase().includes(search.toLowerCase()) ||
        a.shipIds?.some(id => id.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const r = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
        if (r !== 0) return r;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [alerts, search]);

  const displayed = showAll ? filtered : filtered.slice(0, initialLimit);

  return (
    <div className="card p-0 overflow-hidden flex flex-col max-h-[600px]">
      <div className="px-4 py-3 flex flex-col gap-3 border-b border-bg-line bg-bg-panel/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-red" />
            </div>
            <p className="section-label">Active Alerts</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-ink-3 bg-bg-base/50 px-2 py-0.5 rounded-full border border-bg-line">
              {filtered.length} / {alerts.length}
            </span>
            {alerts.length > 0 && (
              <button 
                onClick={() => alerts.forEach(a => emit('alert:acknowledge', { alertId: a.alertId }))}
                className="p-1.5 rounded-md hover:bg-accent-red/10 text-ink-3 hover:text-accent-red transition-colors"
                title="Acknowledge All"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 group-focus-within:text-accent-cyan transition-colors" />
          <input 
            type="text"
            placeholder="Filter alerts by ship, type, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-base/40 border border-bg-line focus:border-accent-cyan/40 rounded-md py-1.5 pl-8 pr-3 text-[11px] outline-none transition-all placeholder:text-ink-3/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-bg-line/30 custom-scrollbar">
        {!displayed.length && (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-3 shadow-glow-green/10">
              <Check className="w-6 h-6 text-accent-green" />
            </div>
            <p className="text-sm text-ink-1 font-heading font-bold tracking-wide">SYSTEM CLEAR</p>
            <p className="text-[11px] text-ink-3 mt-1 px-8">No active alerts matching your current filter.</p>
          </div>
        )}
        {displayed.map((a, i) => {
          const Icon = ICON[a.type] || AlertCircle;
          const color = SEVERITY_COLOR[a.severity] || '#64748b';
          const ago = formatAgo(a.createdAt);
          const isCritical = a.severity === 'critical';
          const gradient = SEVERITY_GRADIENT[a.severity] || '';
          
          return (
            <div
              key={a.alertId}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-bg-elevated/40 transition-all duration-200 alert-entry bg-gradient-to-r ${gradient} border-l-2`}
              style={{ 
                animationDelay: `${i * 40}ms`,
                borderLeftColor: color
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-inner"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}
              >
                <Icon className={`w-4 h-4 ${isCritical ? 'animate-pulse' : ''}`} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-heading font-bold tracking-wider uppercase" style={{ color }}>
                    {humanType(a.type)}
                  </p>
                  {isCritical && (
                    <span className="severity-flash-critical text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-sev-critical/20 text-sev-critical uppercase tracking-widest">
                      CRITICAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">{a.message}</p>
                {a.shipIds?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.shipIds.map((id) => (
                      <span key={id} className="text-[9px] font-mono px-2 py-0.5 rounded bg-bg-base/60 border border-bg-line text-accent-cyan/80 font-bold">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[9px] text-ink-3 font-mono font-semibold bg-bg-base/30 px-1.5 py-0.5 rounded">{ago}</span>
                <button
                  onClick={() => emit('alert:acknowledge', { alertId: a.alertId })}
                  className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-ink-3 hover:text-white px-2.5 py-1 rounded bg-bg-card/80 border border-bg-line hover:border-accent-cyan/50 hover:bg-accent-cyan/10 transition-all group/ack"
                >
                  <Check className="w-3 h-3 group-hover/ack:scale-125 transition-transform" />
                  ACK
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > initialLimit && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-heading font-bold tracking-widest text-ink-3 hover:text-accent-cyan bg-bg-panel/40 border-t border-bg-line transition-all hover:bg-bg-line/20"
        >
          {showAll ? (
            <>COLLAPSE LIST <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>VIEW ALL {filtered.length} ALERTS <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
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
    predictive: 'Predictive Alert',
    predictive_fuel: 'Fuel Shortage Risk',
    predictive_zone: 'Zone Entry Imminent'
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

