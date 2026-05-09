import { useState } from 'react';
import { X, Send, MapPin, Navigation, AlertTriangle, Activity } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';
import { emit } from '../../lib/socket';

const DIRECTIVE_TYPES = [
  { value: 'reroute', label: 'Reroute (replan path)' },
  { value: 'hold', label: 'Hold position' },
  { value: 'change_destination', label: 'Change destination' }
];

// Haversine distance in km
function distanceKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SelectedShipPanel() {
  const selectedShipId = useFleetStore((s) => s.selectedShipId);
  const ship = useFleetStore((s) =>
    selectedShipId ? s.ships.get(selectedShipId) : null
  );
  const ports = useFleetStore((s) => s.ports);
  const clearSelection = useFleetStore((s) => s.clearSelection);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('reroute');
  const [destPortId, setDestPortId] = useState('');

  if (!ship) return null;

  const fuelPct = ship.fuelCapacity ? Math.round((ship.fuel / ship.fuelCapacity) * 100) : 0;
  const statusColor = STATUS_COLOR[ship.status] || '#10b981';

  // Compute distance + ETA
  let distKm = null,
    etaMin = null;
  if (ship.destination?.coordinates) {
    distKm = distanceKm(ship.position.coordinates, ship.destination.coordinates);
    if (ship.speed > 0) {
      const speedKmh = ship.speed * 1.852;
      etaMin = Math.round((distKm / speedKmh) * 60);
    }
  }

  function sendDirective() {
    const payload = {};
    if (type === 'change_destination') {
      const port = ports.find((p) => p.portId === destPortId);
      if (!port) return alert('Pick a destination port');
      payload.destination = port;
    }
    emit('directive:send', { shipId: ship.shipId, type, payload });
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
        <div>
          <h3 className="text-2xl font-bold leading-none">{ship.shipId}</h3>
          <p className="text-sm text-ink-2 mt-1">{ship.name}</p>
        </div>
        <span
          className="text-[11px] font-semibold uppercase px-2 py-1 rounded"
          style={{ background: `${statusColor}22`, color: statusColor }}
        >
          {STATUS_LABEL[ship.status] || ship.status}
        </span>
      </div>

      {ship.inAdverseWeather && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-amber/15 border border-accent-amber/40">
          <AlertTriangle className="w-4 h-4 text-accent-amber" />
          <span className="text-xs font-semibold text-accent-amber">
            Adverse weather — +30% fuel burn
          </span>
        </div>
      )}

      {/* Fuel sufficiency indicator */}
      {ship.fuelShortfall > 0 ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-red-400">
            ⚠ Insufficient fuel — {ship.fuelShortfall.toFixed(0)}t short of destination
          </span>
        </div>
      ) : ship.fuelEstimate !== null && ship.fuelEstimate !== undefined ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">
            ✓ Can reach destination ({ship.fuelEstimate?.toFixed(0)}t needed)
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Mini icon={Navigation} label="Speed" value={`${(ship.speed || 0).toFixed(1)} kts`} />
        <Mini icon={Activity} label="Heading" value={`${Math.round(ship.heading || 0)}°`} />
        {distKm !== null && (
          <Mini
            icon={MapPin}
            label="Distance"
            value={`${distKm.toFixed(1)} km`}
          />
        )}
        {etaMin !== null && (
          <Mini
            icon={Navigation}
            label="ETA"
            value={
              etaMin >= 60
                ? `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`
                : `${etaMin} min`
            }
          />
        )}
      </div>

      <div className="space-y-2 text-sm">
        <Row label="Destination" value={ship.destination?.portName || '—'} />
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
              <span>
                {fuelPct}% <span className="text-ink-3">({ship.fuel?.toFixed(0)}t)</span>
              </span>
            </span>
          }
        />
        <Row label="Cargo" value={ship.cargo || '—'} />
        {ship.cargoMultiplier && ship.cargoMultiplier !== 1 && (
          <Row label="Cargo weight" value={`×${ship.cargoMultiplier.toFixed(2)} fuel penalty`} />
        )}
        {ship.fuelBurnRate > 0 && (
          <Row
            label="Burn rate"
            value={
              <span className="text-accent-amber font-mono">
                {ship.fuelBurnRate.toFixed(2)} t/s
              </span>
            }
          />
        )}
        <Row
          label="Path waypoints"
          value={ship.currentPath?.length ? `${ship.currentPath.length}` : '—'}
        />
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
          <p className="text-[10px] uppercase text-ink-3">
            Issue directive to {ship.shipId}
          </p>
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

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-bg-card border border-bg-line">
      <div className="flex items-center gap-1.5 text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-base font-bold text-ink-1">{value}</div>
    </div>
  );
}
