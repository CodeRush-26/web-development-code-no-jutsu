import { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Radio } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { REST_BASE } from '../../lib/config';

const SPEEDS = [
  { label: '1×', ms: 800 },
  { label: '2×', ms: 400 },
  { label: '4×', ms: 200 },
  { label: '8×', ms: 100 }
];

export default function PlaybackTimeline() {
  const [playing, setPlaying] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [idx, setIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const setPlaybackSnapshot = useFleetStore((s) => s.setPlaybackSnapshot);
  const playbackTime = useFleetStore((s) => s.playbackTime);

  // Fetch history ring buffer
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`${REST_BASE}/api/history/all`);
        const j = await r.json();
        if (mounted) setSnapshots(Array.isArray(j) ? j : []);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // Auto-play loop
  useEffect(() => {
    if (!playing || !snapshots.length) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= snapshots.length) {
          setPlaying(false);
          return i;
        }
        return next;
      });
    }, SPEEDS[speedIdx].ms);
    return () => clearInterval(t);
  }, [playing, snapshots.length, speedIdx]);

  // Push current snapshot to the store whenever idx changes
  useEffect(() => {
    if (!snapshots.length) return;
    if (playbackTime === null && !playing) return;
    const snap = snapshots[Math.min(idx, snapshots.length - 1)];
    if (snap) setPlaybackSnapshot(snap);
  }, [idx, snapshots, playing, playbackTime, setPlaybackSnapshot]);

  const isLive = playbackTime === null;
  const current = snapshots[idx];
  const ts = current ? new Date(current.timestamp) : null;

  function goLive() {
    setPlaying(false);
    setPlaybackSnapshot(null);
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-accent-cyan" />
          <p className="section-label">Timeline Playback</p>
        </div>
        <span
          className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isLive
              ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
              : 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
          }`}
        >
          {isLive ? '● Live' : '◉ Playback'}
        </span>
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-ink-1">
          {ts ? ts.toLocaleTimeString() : '— no history —'}
        </span>
        {snapshots.length > 0 && (
          <span className="font-mono text-ink-3">
            {idx + 1}/{snapshots.length} snapshots
          </span>
        )}
      </div>

      {/* Custom range slider */}
      <input
        type="range"
        min={0}
        max={Math.max(snapshots.length - 1, 0)}
        value={idx}
        onChange={(e) => {
          const v = Number(e.target.value);
          setIdx(v);
          if (snapshots[v]) setPlaybackSnapshot(snapshots[v]);
        }}
        className="w-full"
        disabled={!snapshots.length}
      />

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PlayBtn
            icon={SkipBack}
            disabled={!snapshots.length}
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          />
          <PlayBtn
            icon={playing ? Pause : Play}
            primary
            disabled={!snapshots.length}
            onClick={() => {
              if (!snapshots.length) return;
              setPlaying((p) => !p);
            }}
          />
          <PlayBtn
            icon={SkipForward}
            disabled={!snapshots.length}
            onClick={() => setIdx((i) => Math.min(i + 1, snapshots.length - 1))}
          />
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedIdx(i)}
              className={`text-[10px] font-mono font-bold px-2 py-1 rounded transition-all ${
                speedIdx === i
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-ink-3 hover:text-ink-1 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={goLive}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-heading tracking-wider uppercase transition-all ${
            isLive
              ? 'bg-accent-green/15 text-accent-green border border-accent-green/20 cursor-default'
              : 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/25 hover:shadow-glow-cyan'
          }`}
        >
          Go Live
        </button>
      </div>

      <p className="text-[10px] text-ink-3 font-mono">
        {snapshots.length === 0
          ? 'Snapshots saved every 30s. Waiting for history…'
          : 'Drag to rewind · Map shows positions at selected time'}
      </p>
    </div>
  );
}

function PlayBtn({ icon: Icon, primary, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed ${
        primary
          ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/30 hover:shadow-glow-cyan'
          : 'bg-bg-card/60 border border-bg-line text-ink-2 hover:text-ink-1 hover:bg-bg-elevated/40'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
