import { Cloud, Wind, Waves, Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';

export default function WeatherOverview() {
  const weather = useFleetStore(useShallow((s) => [...s.weather.values()]));
  // average current conditions across ships
  const wave =
    weather.length ? weather.reduce((a, w) => a + (w.wave_height || 0), 0) / weather.length : 0;
  const wind =
    weather.length ? weather.reduce((a, w) => a + (w.wind_wave_height || 0), 0) / weather.length : 0;
  const adverseCount = weather.filter((w) => w.adverse).length;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">Weather Overview</p>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3">
          <Cloud className="w-9 h-9 text-accent-cyan" />
          <div>
            <p className="text-2xl font-bold leading-none">26°C</p>
            <p className="text-xs text-ink-2 mt-1">Moderate Rain</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
          <Stat icon={Wind} label="Wind" value={`${(wind * 10).toFixed(0)} kts SE`} />
          <Stat icon={Waves} label="Waves" value={`${wave.toFixed(1)} m`} />
          <Stat icon={Eye} label="Visibility" value="6 km" />
        </div>
      </div>
      <button className="mt-3 w-full text-xs py-1.5 rounded bg-accent-blue/15 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/25">
        View Detailed Forecast
      </button>
      {adverseCount > 0 && (
        <p className="mt-2 text-[11px] text-accent-amber">
          ⚠ {adverseCount} ship{adverseCount > 1 ? 's' : ''} in adverse weather (+30% fuel)
        </p>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ink-3 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <span className="text-ink-1 font-semibold">{value}</span>
    </div>
  );
}
