import { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { REST_BASE } from '../../lib/config';

/**
 * PDF requirement: timeline scrubber for last hour at 30s resolution that
 * actually replays ship positions on the map.
 *
 * Implementation:
 *  - Pulls /api/history/all (in-memory ring buffer) on mount + every 30s.
 *  - When the user scrubs or hits Play, we call store.setPlaybackTime(timestamp).
 *  - The map reads from a separate selector that prefers playback positions
 *    over live positions when playbackTime is set.
 *  - "Go to Live" clears playbackTime, returning to live updates.
 */
export default function PlaybackTimeline() {
  const [playing, setPlaying] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [idx, setIdx] = useState(0);
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
    }, 800);
    return () => clearInterval(t);
  }, [playing, snapshots.length]);

  // Push current snapshot to the store whenever idx changes (in playback mode)
  useEffect(() => {
    if (!snapshots.length) return;
    if (playbackTime === null && !playing) return; // live mode
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
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">
          Playback (Last 1 Hour · 30s steps)
        </p>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isLive
              ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
              : 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40'
          }`}
        >
          {isLive ? 'LIVE' : 'PLAYBACK'}
        </span>
      </div>

      <div className="text-sm text-ink-2 flex items-center gap-2 font-mono">
        <span>
          {ts ? ts.toLocaleTimeString() : '— no history yet —'}
          {snapshots.length > 0 && (
            <span className="ml-2 text-ink-3">
              ({idx + 1}/{snapshots.length})
            </span>
          )}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(snapshots.length - 1, 0)}
        value={idx}
        onChange={(e) => {
          const v = Number(e.target.value);
          setIdx(v);
          // entering playback on scrub
          if (snapshots[v]) setPlaybackSnapshot(snapshots[v]);
        }}
        className="w-full accent-accent-cyan"
        disabled={!snapshots.length}
      />

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <IconBtn
            icon={SkipBack}
            disabled={!snapshots.length}
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          />
          <IconBtn
            icon={playing ? Pause : Play}
            primary
            disabled={!snapshots.length}
            onClick={() => {
              if (!snapshots.length) return;
              setPlaying((p) => !p);
            }}
          />
          <IconBtn
            icon={SkipForward}
            disabled={!snapshots.length}
            onClick={() => setIdx((i) => Math.min(i + 1, snapshots.length - 1))}
          />
        </div>
        <button
          onClick={goLive}
          className={`px-3 py-1.5 rounded text-xs font-bold transition ${
            isLive
              ? 'bg-accent-green/20 text-accent-green cursor-default'
              : 'bg-accent-cyan text-bg-base hover:bg-accent-cyan/90'
          }`}
        >
          Go to Live
        </button>
      </div>

      <p className="text-[10px] text-ink-3">
        {snapshots.length === 0
          ? 'Snapshots are saved every 30s. Wait a bit for history to accumulate.'
          : 'Drag the slider to rewind. Map shows positions at that time.'}
      </p>
    </div>
  );
}

function IconBtn({ icon: Icon, primary, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${
        primary
          ? 'bg-accent-cyan text-bg-base hover:bg-accent-cyan/90'
          : 'bg-bg-card border border-bg-line text-ink-1 hover:bg-bg-line/40'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
