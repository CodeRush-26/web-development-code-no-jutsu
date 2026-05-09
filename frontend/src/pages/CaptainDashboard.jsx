import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Inbox, AlertTriangle, Check } from 'lucide-react';
import Sidebar from '../components/sidebar/Sidebar';
import TopBar from '../components/topbar/TopBar';
import FleetMap from '../components/map/FleetMap';
import RecentAlerts from '../components/alerts/RecentAlerts';
import AlertSound from '../components/alerts/AlertSound';
import ConnectionBanner from '../components/ui/ConnectionBanner';
import { useFleetStore } from '../store/fleetStore';
import { STATUS_COLOR, STATUS_LABEL } from '../lib/config';
import { emit } from '../lib/socket';

export default function CaptainDashboard() {
  const { shipId } = useParams();
  const [active, setActive] = useState('map');
  const ship = useFleetStore((s) => s.ships.get(shipId));
  const allDirectives = useFleetStore((s) => s.directives);
  const directives = useMemo(
    () => allDirectives.filter((d) => d.shipId === shipId),
    [allDirectives, shipId]
  );

  return (
    <div className="h-screen flex bg-bg-base text-ink-1">
      <AlertSound />
      <Sidebar active={active} onChange={setActive} />

      <div className="flex-1 flex flex-col min-w-0">
        <ConnectionBanner />
        <TopBar centerLabel={`Bridge — ${shipId}`} />

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-[1fr_360px] gap-4">
            <div className="space-y-4">
              <ShipHero ship={ship} />
              <div className="card overflow-hidden h-[480px]">
                <FleetMap mode="captain" />
              </div>
            </div>

            <div className="space-y-4">
              <CaptainInbox shipId={shipId} directives={directives} />
              <DistressForm shipId={shipId} />
              <RecentAlerts limit={5} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ShipHero({ ship }) {
  if (!ship) return null;
  const fuelPct = ship.fuelCapacity ? Math.round((ship.fuel / ship.fuelCapacity) * 100) : 0;
  return (
    <div className="card p-4 grid grid-cols-5 gap-4 items-center">
      <div className="col-span-2">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">Vessel</p>
        <h2 className="text-2xl font-bold">{ship.shipId} — {ship.name}</h2>
        <p className="text-sm text-ink-2 mt-1">Cargo: {ship.cargo}</p>
      </div>
      <Metric label="Speed" value={`${ship.speed?.toFixed(1)} kts`} />
      <Metric
        label="Fuel"
        value={`${fuelPct}%`}
        valueColor={fuelPct < 20 ? '#ef4444' : fuelPct < 50 ? '#f59e0b' : '#10b981'}
      />
      <Metric
        label="Status"
        value={STATUS_LABEL[ship.status] || ship.status}
        valueColor={STATUS_COLOR[ship.status]}
      />
    </div>
  );
}

function Metric({ label, value, valueColor }) {
  return (
    <div>
      <p className="text-[10px] text-ink-3 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold" style={{ color: valueColor || '#e6ecff' }}>
        {value}
      </p>
    </div>
  );
}

function CaptainInbox({ shipId, directives }) {
  const pending = directives.filter((d) => d.status === 'pending');
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-accent-cyan" />
          <p className="text-[10px] text-ink-3 uppercase tracking-widest">
            Inbox{pending.length ? ` · ${pending.length} pending` : ''}
          </p>
        </div>
      </div>
      <div className="divide-y divide-bg-line max-h-72 overflow-y-auto">
        {!directives.length && (
          <p className="px-4 py-6 text-sm text-ink-3 text-center">No directives yet</p>
        )}
        {directives.map((d) => (
          <div key={d.directiveId} className="px-4 py-3">
            <p className="text-sm font-semibold">
              Command requests:{' '}
              <span className="text-accent-cyan">{d.type.replace(/_/g, ' ')}</span>
            </p>
            {d.payload?.destination && (
              <p className="text-xs text-ink-2">→ {d.payload.destination.portName}</p>
            )}
            <p className="text-[10px] text-ink-3 mt-1">Status: {d.status}</p>
            {d.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => emit('directive:accept', { directiveId: d.directiveId })}
                  className="flex-1 px-3 py-1.5 rounded bg-accent-green/20 border border-accent-green/40 text-accent-green text-xs font-semibold hover:bg-accent-green/30 flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={() => {
                    const msg = window.prompt('Distress reason:', '');
                    if (msg) emit('directive:escalate', { directiveId: d.directiveId, distressMessage: msg });
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-accent-red/20 border border-accent-red/40 text-accent-red text-xs font-semibold hover:bg-accent-red/30 flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Escalate
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DistressForm({ shipId }) {
  const [text, setText] = useState('');
  const onSend = () => {
    if (!text.trim()) return;
    emit('distress:send', { distressMessage: text.trim() });
    setText('');
  };
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-accent-red" />
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">
          Send Distress (AI Analyzed)
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="Describe the situation in plain English…"
        className="w-full px-3 py-2 rounded-lg bg-bg-card border border-bg-line text-sm text-ink-1 outline-none focus:border-accent-cyan resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-3">{text.length}/500</span>
        <button
          onClick={onSend}
          disabled={!text.trim()}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent-red text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-red/90"
        >
          <Send className="w-3.5 h-3.5" />
          Send Distress
        </button>
      </div>
    </div>
  );
}
