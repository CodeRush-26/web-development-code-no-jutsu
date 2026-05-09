import { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { SEVERITY_COLOR } from '../../lib/config';

export default function AIDistressAnalysis() {
  const alerts = useFleetStore((s) => s.alerts);
  const distressAlerts = alerts.filter(
    (a) => a.type === 'distress' && a.aiExtracted
  );
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, Math.max(distressAlerts.length - 1, 0));
  const distress = distressAlerts[safeIdx];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          <p className="text-[10px] text-ink-3 uppercase tracking-widest">
            AI Distress Analysis
          </p>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/30 text-accent-purple font-semibold">
            GROQ
          </span>
        </div>
        {distress && (
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
            style={{
              background: `${SEVERITY_COLOR[distress.severity] || '#64748b'}22`,
              color: SEVERITY_COLOR[distress.severity] || '#64748b'
            }}
          >
            {distress.severity || 'High'} Severity
          </span>
        )}
      </div>

      {!distress && (
        <div className="py-6 text-center">
          <Sparkles className="w-8 h-8 text-ink-3 mx-auto mb-2 opacity-40" />
          <p className="text-sm text-ink-3">No active distress signals.</p>
          <p className="text-[11px] text-ink-3 mt-1">
            AI analyzes captain messages here when escalations occur.
          </p>
        </div>
      )}

      {distress && (
        <>
          <p className="text-sm text-ink-1 italic">"{distress.message || '—'}"</p>
          <p className="text-[11px] text-ink-3 mt-1">
            — Captain of {distress.shipIds?.[0] || 'Unknown'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Row label="Detected Issue" value={distress.aiExtracted?.category || '—'} cap />
            <Row
              label="Casualties"
              value={`${distress.aiExtracted?.casualties?.injured ?? 0} injured · ${
                distress.aiExtracted?.casualties?.deceased ?? 0
              } deceased`}
            />
            <Row
              label="Time Sensitive"
              value={distress.aiExtracted?.time_sensitive ? 'YES' : 'no'}
              valueClass={
                distress.aiExtracted?.time_sensitive ? 'text-accent-red font-bold' : ''
              }
            />
            <Row
              label="Damage"
              value={
                distress.aiExtracted?.damage_estimate_usd
                  ? `$${distress.aiExtracted.damage_estimate_usd.toLocaleString()}`
                  : '—'
              }
            />
          </div>

          {distress.aiExtracted?.suggested_actions?.length > 0 && (
            <div className="mt-3 p-2 rounded bg-bg-card border border-bg-line">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">
                Recommended Actions
              </p>
              <ul className="text-xs space-y-1">
                {distress.aiExtracted.suggested_actions.map((a, i) => (
                  <li key={i} className="text-ink-1 flex items-start gap-1.5">
                    <span className="text-accent-cyan mt-0.5">›</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {distressAlerts.length > 1 && (
            <div className="mt-3 flex items-center justify-between border-t border-bg-line pt-2">
              <button
                onClick={() => setIdx(Math.max(0, safeIdx - 1))}
                disabled={safeIdx === 0}
                className="text-ink-3 hover:text-ink-1 disabled:opacity-30 p-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-ink-3">
                {safeIdx + 1} of {distressAlerts.length} distress alerts
              </span>
              <button
                onClick={() => setIdx(Math.min(distressAlerts.length - 1, safeIdx + 1))}
                disabled={safeIdx === distressAlerts.length - 1}
                className="text-ink-3 hover:text-ink-1 disabled:opacity-30 p-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, valueClass, cap }) {
  return (
    <>
      <span className="text-ink-3">{label}</span>
      <span className={`text-ink-1 ${cap ? 'capitalize' : ''} ${valueClass || ''}`}>
        {value}
      </span>
    </>
  );
}
