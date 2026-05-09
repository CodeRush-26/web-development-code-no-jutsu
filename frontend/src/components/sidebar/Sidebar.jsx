import {
  Anchor,
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

/**
 * Only tabs that map to real backend features.
 * Each item scrolls to its section in the dashboard.
 */
const ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', anchor: 'top' },
  { key: 'map', icon: Map, label: 'Live Map', anchor: 'map' },
  { key: 'ships', icon: Ship, label: 'Ships', anchor: 'ships', badgeKey: 'shipCount' },
  { key: 'alerts', icon: AlertTriangle, label: 'Alerts', anchor: 'alerts', badgeKey: 'alertCount' },
  { key: 'directives', icon: ListChecks, label: 'Directives', anchor: 'directives' },
  { key: 'weather', icon: CloudSun, label: 'Weather', anchor: 'weather' },
  { key: 'zones', icon: Square, label: 'Zones', anchor: 'zones', badgeKey: 'zoneCount' },
  { key: 'ai', icon: Sparkles, label: 'AI Distress', anchor: 'ai', accent: true },
  { key: 'playback', icon: PlayCircle, label: 'Playback', anchor: 'playback' }
];

export default function Sidebar({ active, onChange }) {
  const shipCount = useFleetStore((s) => s.ships.size);
  const alertCount = useFleetStore((s) => s.alerts.length);
  const zoneCount = useFleetStore((s) => s.zones.size);
  const isConnected = useFleetStore((s) => s.isConnected);
  const logout = useAuthStore((s) => s.logout);

  const badges = { shipCount, alertCount, zoneCount };

  function handleClick(item) {
    onChange?.(item.key);
    if (item.anchor === 'top') {
      document.getElementById('dashboard-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(`section-${item.anchor}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <aside className="w-60 shrink-0 h-full flex flex-col border-r border-bg-line bg-bg-panel/60">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-line flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center">
          <Anchor className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide leading-none">MARITIME OPS</h1>
          <p className="text-[10px] text-ink-3 uppercase tracking-widest mt-1">Fleet Command</p>
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
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition ${
                isActive
                  ? 'bg-accent-blue/15 text-ink-1 border-l-2 border-accent-cyan'
                  : 'text-ink-2 hover:bg-bg-line/40 hover:text-ink-1 border-l-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{it.label}</span>
              {badgeVal !== null && badgeVal !== undefined && badgeVal > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    it.key === 'alerts' ? 'bg-accent-red text-white' : 'bg-bg-line text-ink-1'
                  }`}
                >
                  {badgeVal}
                </span>
              )}
              {it.accent && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/30 text-accent-purple font-semibold">
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
          <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-accent-red'}`} />
            <span className="text-xs text-ink-1">
              {isConnected ? 'All Systems Operational' : 'Disconnected'}
            </span>
          </div>
          <RadarPing />
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink-3 hover:text-ink-1 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function RadarPing() {
  return (
    <div className="mt-3 mx-auto w-[140px] h-[60px] rounded bg-bg-card border border-bg-line relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-accent-green/30 relative">
          <div className="absolute inset-0 rounded-full border border-accent-green/50 animate-ping-slow" />
          <div className="absolute inset-1 rounded-full border border-accent-green/20" />
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-px origin-left bg-gradient-to-r from-accent-green to-transparent"
            style={{ animation: 'spin 4s linear infinite' }}
          />
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
