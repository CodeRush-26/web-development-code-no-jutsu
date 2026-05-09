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
        gradient="from-accent-cyan/15 to-accent-blue/10"
        borderColor="border-accent-cyan/15"
        iconColor="text-accent-cyan"
        label="Total Ships"
        value={total}
        sub="Active"
        subColor="text-ink-3"
      />
      <StatCard
        icon={Activity}
        gradient="from-accent-green/15 to-accent-teal/10"
        borderColor="border-accent-green/15"
        iconColor="text-accent-green"
        label="In Transit"
        value={inTransit}
        sub={`${transitPct}%`}
        subColor="text-accent-green"
      />
      <StatCard
        icon={Crosshair}
        gradient="from-accent-red/15 to-accent-rose/10"
        borderColor={distressed > 0 ? 'border-accent-red/40' : 'border-accent-red/15'}
        iconColor="text-accent-red"
        label="Distressed"
        value={distressed}
        sub={`${distressedPct}%`}
        subColor="text-accent-red"
        pulse={distressed > 0}
      />
      <StatCard
        icon={AlertOctagon}
        gradient="from-accent-amber/15 to-accent-gold/10"
        borderColor="border-accent-amber/15"
        iconColor="text-accent-amber"
        label="Zones"
        value={activeZones}
        sub="Restricted"
        subColor="text-accent-amber"
      />
      <StatCard
        icon={AlertTriangle}
        gradient="from-accent-red/15 to-accent-amber/10"
        borderColor={activeAlerts > 0 ? 'border-accent-red/30' : 'border-accent-red/15'}
        iconColor="text-accent-red"
        label="Alerts"
        value={activeAlerts}
        sub="Active"
        subColor="text-accent-red"
        pulse={activeAlerts > 3}
      />
    </div>
  );
}

function StatCard({ icon: Icon, gradient, borderColor, iconColor, label, value, sub, subColor, pulse }) {
  return (
    <div
      className={`relative p-4 rounded-xl bg-gradient-to-br ${gradient} border ${borderColor} backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        pulse ? 'animate-border-breathe' : ''
      }`}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-bg-card/50 border border-bg-line flex items-center justify-center shrink-0">
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="section-label">{label}</p>
          <p className="text-2xl font-bold font-data text-ink-1 leading-tight mt-0.5">{value}</p>
          <p className={`text-[10px] font-semibold font-mono ${subColor}`}>{sub}</p>
        </div>
      </div>
    </div>
  );
}
