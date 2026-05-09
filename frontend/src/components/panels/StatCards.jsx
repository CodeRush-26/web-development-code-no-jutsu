import { Ship, Activity, Crosshair, AlertOctagon, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function StatCards() {
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));
  const zones = useFleetStore(useShallow((s) => [...s.zones.values()]));
  const alerts = useFleetStore((s) => s.alerts);

  const total = ships.length;
  const inTransit = ships.filter((s) => ['normal', 'rerouting'].includes(s.status)).length;
  const distressed = ships.filter((s) => s.status === 'distressed').length;
  const activeZones = zones.filter((z) => z.active !== false).length;
  const activeAlerts = alerts.length;

  const transitPct = total ? Math.round((inTransit / total) * 1000) / 10 : 0;
  const distressedPct = total ? Math.round((distressed / total) * 1000) / 10 : 0;

  return (
    <div className="grid grid-cols-5 gap-3">
      <StatCard
        icon={Ship}
        iconBg="bg-accent-cyan/20"
        iconColor="text-accent-cyan"
        label="Total Ships"
        value={total}
        sub="Active"
        subColor="text-ink-2"
      />
      <StatCard
        icon={Activity}
        iconBg="bg-accent-green/20"
        iconColor="text-accent-green"
        label="In Transit"
        value={inTransit}
        sub={`${transitPct}%`}
        subColor="text-accent-green"
        spark="up"
      />
      <StatCard
        icon={Crosshair}
        iconBg="bg-accent-red/20"
        iconColor="text-accent-red"
        label="Distressed"
        value={distressed}
        sub={`${distressedPct}%`}
        subColor="text-accent-red"
        spark="down"
      />
      <StatCard
        icon={AlertOctagon}
        iconBg="bg-accent-amber/20"
        iconColor="text-accent-amber"
        label="Restricted Zones"
        value={activeZones}
        sub="Active"
        subColor="text-accent-amber"
      />
      <StatCard
        icon={AlertTriangle}
        iconBg="bg-accent-red/20"
        iconColor="text-accent-red"
        label="Alerts"
        value={activeAlerts}
        sub="Active"
        subColor="text-accent-red"
      />
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor, spark }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-ink-1 leading-tight">{value}</p>
        <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
      </div>
      {spark && <Sparkline direction={spark} />}
    </div>
  );
}

function Sparkline({ direction }) {
  const isUp = direction === 'up';
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="shrink-0">
      <path
        d={isUp ? 'M2 18 L10 14 L18 16 L26 10 L34 8 L46 4' : 'M2 6 L10 10 L18 8 L26 14 L34 16 L46 20'}
        stroke={isUp ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
