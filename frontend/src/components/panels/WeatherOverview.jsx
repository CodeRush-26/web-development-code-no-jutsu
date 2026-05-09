import { CloudRain, Wind, Waves, AlertTriangle, Droplets } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function WeatherOverview() {
  const weather = useFleetStore(useShallow((s) => [...s.weather.values()]));
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));
  
  // Compute real averages from live weather data
  const avgWave =
    weather.length ? weather.reduce((a, w) => a + (w.wave_height || 0), 0) / weather.length : 0;
  const avgWindWave =
    weather.length ? weather.reduce((a, w) => a + (w.wind_wave_height || 0), 0) / weather.length : 0;
  const adverseCount = weather.filter((w) => w.adverse).length;
  const maxWave = weather.length ? Math.max(...weather.map((w) => w.wave_height || 0)) : 0;
  
  // Ships currently in adverse weather
  const adverseShips = ships.filter((s) => s.inAdverseWeather);

  // Determine overall condition from real data
  const condition = adverseCount > weather.length * 0.5
    ? { label: 'Severe Conditions', color: 'text-accent-red', icon: AlertTriangle }
    : adverseCount > 0
      ? { label: 'Mixed Conditions', color: 'text-accent-amber', icon: CloudRain }
      : weather.length > 0
        ? { label: 'Favorable Conditions', color: 'text-accent-green', icon: Wind }
        : { label: 'Awaiting Data…', color: 'text-ink-3', icon: Waves };

  const StatusIcon = condition.icon;

  return (
    <div className="card p-4 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${weather.length ? 'bg-accent-green animate-pulse' : 'bg-ink-3'}`} />
          <p className="section-label">Fleet Sea Conditions</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-base/40 border border-bg-line ${condition.color}`}>
          <StatusIcon className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {condition.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 py-1">
          <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shadow-inner">
            <Waves className="w-7 h-7 text-accent-cyan" />
          </div>
          <div>
            <p className="text-3xl font-bold font-data leading-none tracking-tight">
              {avgWave > 0 ? `${avgWave.toFixed(1)}m` : '—'}
            </p>
            <p className="text-[10px] font-heading font-bold text-ink-3 uppercase tracking-widest mt-1.5">Avg Wave Height</p>
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-3 gap-4 border-l border-bg-line/50 pl-6">
          <Stat icon={Wind} label="Wind Waves" value={avgWindWave > 0 ? `${avgWindWave.toFixed(1)}m` : '—'} />
          <Stat icon={Droplets} label="Max Wave" value={maxWave > 0 ? `${maxWave.toFixed(1)}m` : '—'} />
          <Stat
            icon={AlertTriangle}
            label="Adverse"
            value={`${adverseCount}/${weather.length || 0}`}
            valueColor={adverseCount > 0 ? 'text-accent-amber' : 'text-accent-green/70'}
          />
        </div>
      </div>

      {adverseShips.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-accent-amber/5 border border-accent-amber/15 alert-entry">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-accent-amber uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Ships in Adverse Weather (+30% Fuel)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {adverseShips.map((s) => (
              <span key={s.shipId} className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-bg-base/80 text-accent-amber border border-accent-amber/30 hover:border-accent-amber/60 transition-colors cursor-default">
                {s.shipId}
              </span>
            ))}
          </div>
        </div>
      )}

      {!weather.length && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-3 italic bg-bg-base/20 p-2 rounded border border-dashed border-bg-line">
          <div className="w-1.5 h-1.5 rounded-full bg-ink-3 animate-pulse" />
          Synchronizing with Open-Meteo Marine API...
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, valueColor = 'text-ink-1' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ink-3 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className={`font-semibold font-data ${valueColor}`}>{value}</span>
    </div>
  );
}
