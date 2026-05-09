import { Sparkles } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';
import { SEVERITY_COLOR } from '../../lib/config';

export default function AIDistressAnalysis() {
  const alerts = useFleetStore((s) => s.alerts);
  const distress = alerts.find((a) => a.type === 'distress' && a.aiExtracted);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          <p className="text-[10px] text-ink-3 uppercase tracking-widest">AI Distress Analysis</p>
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
        <p className="text-sm text-ink-3">
          No active distress signals. The AI will analyze captain messages here when escalations occur.
        </p>
      )}

      {distress && (
        <>
          <p className="text-sm text-ink-1 italic">"{distress.message || '—'}"</p>
          <p className="text-[11px] text-ink-3 mt-1">— {distress.shipIds?.[0] || 'Unknown'} Captain</p>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Row label="Detected Issues" value={distress.aiExtracted?.category || '—'} />
            <Row label="Injured Persons" value={distress.aiExtracted?.casualties?.injured ?? 0} />
            <Row
              label="Estimated Damage"
              value={distress.aiExtracted?.damage_estimate_usd ? `$${distress.aiExtracted.damage_estimate_usd}` : 'High'}
              valueClass="text-accent-amber"
            />
            <Row
              label="Recommended Action"
              value={distress.aiExtracted?.suggested_actions?.[0] || 'Immediate Assistance'}
              valueClass="text-accent-red font-semibold"
            />
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, valueClass }) {
  return (
    <>
      <span className="text-ink-3">{label}</span>
      <span className={`text-ink-1 ${valueClass || ''}`}>{value}</span>
    </>
  );
}
