import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';
import { emit } from '../../lib/socket';

const DIRECTIVE_TYPES = [
  { value: 'reroute', label: 'Reroute (replan path)' },
  { value: 'hold', label: 'Hold position' },
  { value: 'change_destination', label: 'Change destination' }
];

export default function SelectedShipPanel() {
  const selectedShipId = useFleetStore((s) => s.selectedShipId);
  const ship = useFleetStore((s) => (selectedShipId ? s.ships.get(selectedShipId) : null));
  const ports = useFleetStore((s) => s.ports);
  const clearSelection = useFleetStore((s) => s.clearSelection);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('reroute');
  const [destPortId, setDestPortId] = useState('');

  if (!ship) return null;

  const fuelPct = ship.fuelCapacity ? Math.round((ship.fuel / ship.fuelCapacity) * 100) : 0;
  const statusColor = STATUS_COLOR[ship.status] || '#10b981';

  function sendDirective() {
    const payload = {};
    if (type === 'change_destination') {
      const port = ports.find((p) => p.portId === destPortId);
      if (!port) return alert('Pick a destination port');
      payload.destination = port;
    }
    emit('directive:send', {
      shipId: ship.shipId,
      type,
      payload
    });
    setShowForm(false);
    setDestPortId('');
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">Selected Ship</p>
        <button onClick={clearSelection} className="text-ink-3 hover:text-ink-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-start justify-between">
        <h3 className="text-2xl font-bold">{ship.shipId}</h3>
        <span
          className="text-[11px] font-semibold uppercase px-2 py-1 rounded"
          style={{ background: `${statusColor}22`, color: statusColor }}
        >
          {STATUS_LABEL[ship.status] || ship.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="Name" value={ship.name} />
        <Row label="Destination" value={ship.destination?.portName || '—'} />
        <Row label="Speed" value={`${(ship.speed || 0).toFixed(1)} kts`} />
        <Row label="Heading" value={`${Math.round(ship.heading || 0)}°`} />
        <Row
          label="Fuel"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-16 h-1.5 rounded bg-bg-line">
                <span
                  className="block h-full rounded"
                  style={{
                    width: `${fuelPct}%`,
                    background: fuelPct < 20 ? '#ef4444' : fuelPct < 50 ? '#f59e0b' : '#10b981'
                  }}
                />
              </span>
              <span>{fuelPct}%</span>
            </span>
          }
        />
        <Row label="Cargo" value={ship.cargo || '—'} />
        {ship.inAdverseWeather && <Row label="Weather" value="Adverse · +30% fuel" />}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent-blue text-white text-sm font-semibold hover:bg-accent-blue/90"
        >
          <Send className="w-4 h-4" />
          Send Directive
        </button>
      ) : (
        <div className="space-y-2 p-3 rounded-lg bg-bg-card border border-bg-line">
          <p className="text-[10px] uppercase text-ink-3">Issue directive to {ship.shipId}</p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-bg-panel border border-bg-line text-sm"
          >
            {DIRECTIVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {type === 'change_destination' && (
            <select
              value={destPortId}
              onChange={(e) => setDestPortId(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-bg-panel border border-bg-line text-sm"
            >
              <option value="">— pick a port —</option>
              {ports.map((p) => (
                <option key={p.portId} value={p.portId}>
                  {p.portName}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={sendDirective}
              className="flex-1 px-3 py-1.5 rounded bg-accent-blue text-white text-sm font-semibold hover:bg-accent-blue/90"
            >
              Send
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded bg-bg-panel border border-bg-line text-sm hover:bg-bg-line/40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-1 font-medium text-right">{value}</span>
    </div>
  );
}
