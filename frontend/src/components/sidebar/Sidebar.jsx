import { useState, useEffect } from 'react';
import {
  Compass,
  LayoutDashboard,
  Map,
  Ship,
  AlertTriangle,
  ListChecks,
  CloudSun,
  Square,
  Sparkles,
  PlayCircle,
  LogOut
} from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { useAuthStore } from '../../store/authStore';

const ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', anchor: 'top' },
  { key: 'map', icon: Map, label: 'Live Map', anchor: 'map' },
  { key: 'ships', icon: Ship, label: 'Fleet', anchor: 'ships', badgeKey: 'shipCount' },
  { key: 'alerts', icon: AlertTriangle, label: 'Alerts', anchor: 'alerts', badgeKey: 'alertCount' },
  { key: 'directives', icon: ListChecks, label: 'Directives', anchor: 'directives' },
  { key: 'weather', icon: CloudSun, label: 'Sea Cond.', anchor: 'weather' },
  { key: 'zones', icon: Square, label: 'Zones', anchor: 'zones', badgeKey: 'zoneCount' },
  { key: 'ai', icon: Sparkles, label: 'AI Analysis', anchor: 'ai', accent: true },
  { key: 'playback', icon: PlayCircle, label: 'Playback', anchor: 'playback' }
];

export default function Sidebar({ active, onChange }) {
  const shipCount = useFleetStore((s) => s.ships.size);
  const alertCount = useFleetStore((s) => s.alerts.length);
  const zoneCount = useFleetStore((s) => s.zones.size);
  const isConnected = useFleetStore((s) => s.isConnected);
  const logout = useAuthStore((s) => s.logout);
  const [uptime, setUptime] = useState(0);

  const badges = { shipCount, alertCount, zoneCount };

  // Uptime counter
  useEffect(() => {
    const t = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function handleClick(item) {
    onChange?.(item.key);
    if (item.anchor === 'top') {
      document.getElementById('dashboard-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(`section-${item.anchor}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const uptimeStr = `${Math.floor(uptime / 3600).toString().padStart(2, '0')}:${Math.floor((uptime % 3600) / 60).toString().padStart(2, '0')}:${(uptime % 60).toString().padStart(2, '0')}`;

  return (
    <aside className="w-60 shrink-0 h-full flex flex-col border-r border-bg-line bg-bg-panel/60 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shadow-glow-cyan">
            <Compass className="w-5 h-5 text-accent-cyan" style={{ animation: 'radar-sweep 8s linear infinite' }} />
          </div>
          <div>
            <h1 className="font-brand text-sm font-bold tracking-wider leading-none text-gradient-cyan">MARITIME OPS</h1>
            <p className="text-[9px] font-heading text-ink-3 uppercase tracking-[0.15em] mt-1 font-semibold">Fleet Command</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          const badgeVal = it.badgeKey ? badges[it.badgeKey] : null;
          return (
            <button
              key={it.key}
              onClick={() => handleClick(it)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 relative group ${
                isActive
                  ? 'text-ink-1 bg-accent-cyan/8'
                  : 'text-ink-2 hover:bg-bg-line/30 hover:text-ink-1'
              }`}
            >
              {/* Active indicator glow bar */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-accent-cyan shadow-glow-cyan" />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-accent-cyan' : 'group-hover:text-accent-cyan/70'}`} />
              <span className="flex-1 text-left font-heading font-semibold tracking-wide">{it.label}</span>
              {badgeVal !== null && badgeVal !== undefined && badgeVal > 0 && (
                <span
                  className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    it.key === 'alerts'
                      ? 'bg-accent-red/90 text-white shadow-glow-red'
                      : 'bg-bg-elevated text-ink-1'
                  }`}
                >
                  {badgeVal}
                </span>
              )}
              {it.accent && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-bold font-mono uppercase tracking-wider">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="border-t border-bg-line p-4 space-y-3">
        <div>
          <p className="section-label mb-2">System Status</p>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'live-dot' : 'bg-accent-red'}`} />
            <span className="text-xs text-ink-1 font-heading font-semibold">
              {isConnected ? 'Operational' : 'Disconnected'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mt-2">
            <span className="text-ink-3">Uptime</span>
            <span className="text-ink-1 font-mono text-right">{uptimeStr}</span>
            <span className="text-ink-3">Tick Rate</span>
            <span className="text-ink-1 font-mono text-right">1 Hz</span>
            <span className="text-ink-3">Ships</span>
            <span className="text-ink-1 font-mono text-right">{shipCount}</span>
          </div>
        </div>

        {/* Radar mini */}
        <RadarMini shipCount={shipCount} isConnected={isConnected} />

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink-3 hover:text-ink-1 transition rounded-lg hover:bg-bg-line/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="font-heading font-semibold">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function RadarMini({ shipCount, isConnected }) {
  return (
    <div className="mx-auto w-[140px] h-[70px] rounded-lg bg-bg-card/60 border border-bg-line relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border border-accent-green/20 relative">
          <div className="absolute inset-2 rounded-full border border-accent-green/15" />
          <div className="absolute inset-4 rounded-full border border-accent-green/10" />
          {/* Sweep line */}
          {isConnected && (
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-px origin-left bg-gradient-to-r from-accent-green/60 to-transparent"
              style={{ animation: 'radar-sweep 4s linear infinite' }}
            />
          )}
          {/* Ship blips */}
          {Array.from({ length: Math.min(shipCount, 6) }).map((_, i) => {
            const angle = (i * 360) / Math.min(shipCount, 6);
            const r = 8 + (i % 3) * 5;
            return (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow"
                style={{
                  top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * r}px)`,
                  left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * r}px)`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.3}s`
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
