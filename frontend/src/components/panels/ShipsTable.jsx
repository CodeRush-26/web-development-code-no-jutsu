import { useShallow } from 'zustand/react/shallow';
import { useFleetStore } from '../../store/fleetStore';
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/config';

export default function ShipsTable() {
  const ships = useFleetStore(useShallow((s) => [...s.ships.values()]));
  const selectShip = useFleetStore((s) => s.selectShip);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest">All Ships ({ships.length})</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-card/40 text-[10px] text-ink-3 uppercase">
            <tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Speed</Th>
              <Th>Heading</Th>
              <Th>Fuel</Th>
              <Th>Cargo</Th>
              <Th>Destination</Th>
              <Th>Weather</Th>
            </tr>
          </thead>
          <tbody>
            {ships.map((s) => {
              const fuelPct = s.fuelCapacity ? Math.round((s.fuel / s.fuelCapacity) * 100) : 0;
              const fuelColor = fuelPct < 20 ? '#ef4444' : fuelPct < 50 ? '#f59e0b' : '#10b981';
              return (
                <tr
                  key={s.shipId}
                  onClick={() => selectShip(s.shipId)}
                  className="border-t border-bg-line hover:bg-bg-line/30 cursor-pointer transition"
                >
                  <Td className="font-mono text-ink-1">{s.shipId}</Td>
                  <Td>{s.name}</Td>
                  <Td>
                    <span
                      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                      style={{
                        background: `${STATUS_COLOR[s.status] || '#10b981'}22`,
                        color: STATUS_COLOR[s.status] || '#10b981'
                      }}
                    >
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                  </Td>
                  <Td>{(s.speed || 0).toFixed(1)} kts</Td>
                  <Td>{Math.round(s.heading || 0)}°</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-12 h-1 rounded bg-bg-line">
                        <span
                          className="block h-full rounded"
                          style={{ width: `${fuelPct}%`, background: fuelColor }}
                        />
                      </span>
                      <span className="text-xs">{fuelPct}%</span>
                    </div>
                  </Td>
                  <Td className="text-ink-2">{s.cargo}</Td>
                  <Td className="text-ink-2">{s.destination?.portName || '—'}</Td>
                  <Td>
                    {s.inAdverseWeather ? (
                      <span className="text-accent-amber text-xs">⚠ Adverse</span>
                    ) : (
                      <span className="text-ink-3 text-xs">Clear</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-4 py-2 font-semibold">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-2 text-ink-1 ${className}`}>{children}</td>;
}
