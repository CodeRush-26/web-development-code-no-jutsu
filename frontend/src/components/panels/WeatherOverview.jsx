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
    ? { label: 'Severe Conditions', color: 'text-accent-red' }
    : adverseCount > 0
      ? { label: 'Mixed Conditions', color: 'text-accent-amber' }
      : weather.length > 0
        ? { label: 'Favorable Conditions', color: 'text-accent-green' }
        : { label: 'Awaiting Data…', color: 'text-ink-3' };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Sea Conditions</p>
        <span className={`text-[10px] font-bold uppercase ${condition.color}`}>
          {condition.label}
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
            <Waves className="w-6 h-6 text-accent-cyan" />
          </div>
          <div>
            <p className="text-2xl font-bold font-data leading-none">
              {avgWave > 0 ? `${avgWave.toFixed(1)}m` : '—'}
            </p>
            <p className="text-xs text-ink-3 mt-1">Avg Wave Height</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
          <Stat icon={Wind} label="Wind Waves" value={avgWindWave > 0 ? `${avgWindWave.toFixed(1)}m` : '—'} />
          <Stat icon={Droplets} label="Max Wave" value={maxWave > 0 ? `${maxWave.toFixed(1)}m` : '—'} />
          <Stat
            icon={AlertTriangle}
            label="Adverse"
            value={`${adverseCount}/${weather.length || 0}`}
            valueColor={adverseCount > 0 ? 'text-accent-amber' : 'text-ink-1'}
          />
        </div>
      </div>

      {adverseShips.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-accent-amber/8 border border-accent-amber/20">
          <p className="text-[10px] font-semibold text-accent-amber uppercase tracking-wider mb-1.5">
            ⚠ Ships in Adverse Weather (+30% Fuel Burn)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {adverseShips.map((s) => (
              <span key={s.shipId} className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/20">
                {s.shipId}
              </span>
            ))}
          </div>
        </div>
      )}

      {!weather.length && (
        <p className="mt-2 text-[11px] text-ink-3 italic">
          Weather data refreshes every 60s per ship via Open-Meteo Marine API.
        </p>
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
