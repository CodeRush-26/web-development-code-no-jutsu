import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Ship, Radio, Compass } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { REST_BASE } from '../lib/config';

export default function Login() {
  const setRole = useAuthStore((s) => s.setRole);
  const nav = useNavigate();
  const [ships, setShips] = useState([]);
  const [pickedShip, setPickedShip] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = REST_BASE
      ? `${REST_BASE}/api/ships`
      : `http://${window.location.hostname || 'localhost'}:3001/api/ships`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setShips(data); setLoading(false); })
      .catch(() => { setShips([]); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-bg-abyss">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Radar sweep effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03]">
        <div className="absolute inset-0 rounded-full border border-accent-cyan/30" />
        <div className="absolute inset-[60px] rounded-full border border-accent-cyan/20" />
        <div className="absolute inset-[120px] rounded-full border border-accent-cyan/15" />
        <div className="absolute inset-[180px] rounded-full border border-accent-cyan/10" />
        <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left bg-gradient-to-r from-accent-cyan/40 to-transparent animate-radar-sweep" />
      </div>

      {/* Noise grain overlay */}
      <div className="noise-grain" />

      {/* Main card */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 mb-4 shadow-glow-cyan">
            <Compass className="w-8 h-8 text-accent-cyan" style={{ animation: 'radar-sweep 8s linear infinite' }} />
          </div>
          <h1 className="font-brand text-2xl font-black tracking-wider text-gradient-cyan">
            MARITIME OPS
          </h1>
          <p className="font-heading text-sm text-ink-3 uppercase tracking-[0.2em] mt-1 font-semibold">
            Fleet Command System
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-bg-line" />
            <span className="text-[9px] font-mono text-ink-3 uppercase tracking-widest">
              Strait of Hormuz
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-bg-line" />
          </div>
        </div>

        <div className="card p-6 space-y-5 card-glow">
          {/* Connection status */}
          <div className="flex items-center justify-center gap-2 text-xs">
            <Radio className="w-3 h-3 text-accent-green" />
            <span className="font-mono text-ink-3">
              {loading ? 'CONNECTING TO FLEET…' : `${ships.length} VESSELS ONLINE`}
            </span>
          </div>

          {/* Command entry */}
          <button
            onClick={() => {
              setRole('command');
              nav('/command');
            }}
            className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl bg-accent-blue/8 border border-accent-blue/25 hover:bg-accent-blue/15 hover:border-accent-blue/40 hover:shadow-glow-cyan transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-lg bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-accent-blue" />
            </div>
            <div className="text-left">
              <span className="font-heading text-base font-bold tracking-wide block">
                Fleet Command
              </span>
              <span className="text-[11px] text-ink-3 font-mono">ROLE: COMMANDER</span>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-bg-line" />
            <span className="text-[10px] text-ink-3 uppercase font-heading font-semibold tracking-wider">or</span>
            <div className="flex-1 h-px bg-bg-line" />
          </div>

          {/* Captain entry */}
          <div className="space-y-3">
            <label className="section-label block">Sign in as Ship Captain</label>
            <select
              value={pickedShip}
              onChange={(e) => setPickedShip(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-bg-card/80 border border-bg-line text-ink-1 outline-none focus:border-accent-cyan/50 focus:shadow-glow-cyan transition-all font-sans text-sm"
            >
              <option value="">Select your vessel…</option>
              {ships.map((s) => (
                <option key={s.shipId} value={s.shipId}>
                  {s.shipId} — {s.name} ({s.cargo})
                </option>
              ))}
            </select>

            <button
              disabled={!pickedShip}
              onClick={() => {
                setRole('captain', pickedShip);
                nav(`/captain/${pickedShip}`);
              }}
              className="w-full group flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-accent-cyan/8 border border-accent-cyan/25 hover:bg-accent-cyan/15 hover:border-accent-cyan/40 hover:shadow-glow-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-accent-cyan/25 disabled:hover:shadow-none transition-all duration-300 font-heading font-bold tracking-wide"
            >
              <Ship className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform" />
              Enter Bridge
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[9px] font-mono text-ink-3 uppercase tracking-[0.15em]">
            Code Rush 2026 · Real-Time Crisis Operations
          </p>
        </div>
      </div>
    </div>
  );
}
