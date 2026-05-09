import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Shield, Ship } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { REST_BASE } from '../lib/config';

export default function Login() {
  const setRole = useAuthStore((s) => s.setRole);
  const nav = useNavigate();
  const [ships, setShips] = useState([]);
  const [pickedShip, setPickedShip] = useState('');

  useEffect(() => {
    const url = REST_BASE
      ? `${REST_BASE}/api/ships`
      : `http://${window.location.hostname || 'localhost'}:3001/api/ships`;
    fetch(url)
      .then((r) => r.json())
      .then(setShips)
      .catch(() => setShips([]));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-bg-base via-bg-panel to-[#0c1834]">
      <div className="w-full max-w-md card p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-accent-cyan/20 flex items-center justify-center">
            <Anchor className="w-6 h-6 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">MARITIME OPS</h1>
            <p className="text-xs text-ink-3 uppercase tracking-widest">Fleet Command System</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setRole('command');
              nav('/command');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-blue/15 border border-accent-blue/40 hover:bg-accent-blue/25 transition"
          >
            <Shield className="w-5 h-5 text-accent-blue" />
            <span className="font-semibold">Enter as Fleet Command</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-bg-line" />
            <span className="text-xs text-ink-3 uppercase">or</span>
            <div className="flex-1 h-px bg-bg-line" />
          </div>

          <label className="block text-sm text-ink-2 mb-1">Sign in as Ship Captain</label>
          <select
            value={pickedShip}
            onChange={(e) => setPickedShip(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-bg-card border border-bg-line text-ink-1 outline-none focus:border-accent-cyan"
          >
            <option value="">Select your vessel…</option>
            {ships.map((s) => (
              <option key={s.shipId} value={s.shipId}>
                {s.shipId} — {s.name}
              </option>
            ))}
          </select>

          <button
            disabled={!pickedShip}
            onClick={() => {
              setRole('captain', pickedShip);
              nav(`/captain/${pickedShip}`);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent-cyan/15 border border-accent-cyan/40 hover:bg-accent-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
          >
            <Ship className="w-5 h-5 text-accent-cyan" />
            Enter Bridge
          </button>
        </div>

        <p className="text-xs text-ink-3 text-center pt-3 border-t border-bg-line">
          Strait of Hormuz · Code Rush 2026
        </p>
      </div>
    </div>
  );
}
