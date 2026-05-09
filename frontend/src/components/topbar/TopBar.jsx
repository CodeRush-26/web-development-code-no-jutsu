import { Bell, Volume2, HelpCircle, Monitor, ChevronDown } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { useAuthStore } from '../../store/authStore';

export default function TopBar({ centerLabel = 'Command Center' }) {
  const isConnected = useFleetStore((s) => s.isConnected);
  const alertCount = useFleetStore((s) => s.alerts.length);
  const { operatorName, operatorTitle } = useAuthStore();

  return (
    <header className="h-16 shrink-0 px-6 border-b border-bg-line bg-bg-panel/40 flex items-center justify-between">
      {/* Center selector */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card border border-bg-line hover:bg-bg-line/40 text-sm">
          <Monitor className="w-4 h-4 text-accent-cyan" />
          <span className="font-semibold">{centerLabel}</span>
          <ChevronDown className="w-4 h-4 text-ink-3" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-bg-line">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'live-dot' : 'bg-accent-red'}`} />
          <span className="text-xs font-semibold text-ink-1">{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <IconBtn icon={Bell} count={alertCount} />
        <IconBtn icon={Volume2} />
        <IconBtn icon={HelpCircle} />

        <div className="ml-2 flex items-center gap-3 pl-3 border-l border-bg-line">
          <div className="w-9 h-9 rounded-full bg-accent-blue/30 border border-accent-blue/50 flex items-center justify-center text-sm font-semibold">
            {operatorName?.split(' ').map((p) => p[0]).slice(0, 2).join('') || 'OP'}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-1 leading-tight">{operatorName}</p>
            <p className="text-[11px] text-ink-3">{operatorTitle}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-ink-3" />
        </div>
      </div>
    </header>
  );
}

function IconBtn({ icon: Icon, count }) {
  return (
    <button className="relative w-9 h-9 rounded-lg bg-bg-card border border-bg-line hover:bg-bg-line/40 flex items-center justify-center text-ink-2 hover:text-ink-1">
      <Icon className="w-4 h-4" />
      {!!count && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
