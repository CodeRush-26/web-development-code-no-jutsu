import { useState, useEffect } from 'react';
import { Bell, HelpCircle, LogOut, Radio } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { useAuthStore } from '../../store/authStore';
import TickPulse from '../ui/TickPulse';

export default function TopBar({ centerLabel = 'Command Center' }) {
  const isConnected = useFleetStore((s) => s.isConnected);
  const alertCount = useFleetStore((s) => s.alerts.length);
  const { operatorName, operatorTitle, logout } = useAuthStore();
  const [utc, setUtc] = useState('');

  // Live UTC clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtc(
        now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-14 shrink-0 px-5 border-b border-bg-line bg-bg-panel/50 backdrop-blur-sm flex items-center justify-between">
      {/* Left: Label + Live indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card/60 border border-bg-line">
          <Radio className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="font-heading text-sm font-bold tracking-wide">{centerLabel}</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-bg-card/50 border border-bg-line">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'live-dot' : 'bg-accent-red'}`} />
          <span className="text-[10px] font-semibold font-heading tracking-wider text-ink-1 uppercase">
            {isConnected ? 'Live' : 'Offline'}
          </span>
          {isConnected && <TickPulse />}
        </div>
      </div>

      {/* Center: UTC clock */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2">
        <span className="font-mono text-xs text-ink-2 tracking-wider">{utc}</span>
      </div>

      {/* Right: Alerts + Operator */}
      <div className="flex items-center gap-2">
        <AlertBtn count={alertCount} />

        <div className="ml-2 flex items-center gap-3 pl-3 border-l border-bg-line">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-xs font-bold font-brand text-accent-blue">
            {operatorName
              ?.split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('') || 'OP'}
          </div>
          <div className="text-right hidden lg:block">
            <p className="text-xs font-semibold text-ink-1 leading-tight font-heading">{operatorName}</p>
            <p className="text-[10px] text-ink-3 font-mono">{operatorTitle}</p>
          </div>
          <button
            onClick={() => { logout(); window.location.assign('/login'); }}
            title="Sign out"
            className="text-ink-3 hover:text-ink-1 p-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function AlertBtn({ count }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <button
      className={`relative w-8 h-8 rounded-lg bg-bg-card/60 border border-bg-line flex items-center justify-center text-ink-2 hover:text-ink-1 transition ${
        flash ? 'animate-shake' : ''
      }`}
    >
      <Bell className="w-4 h-4" />
      {!!count && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-accent-red text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-glow-red">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
