import { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Zap, Brain, Target } from 'lucide-react';
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
    <div className="card p-0 overflow-hidden">
      {/* AI Header with gradient */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-line bg-gradient-to-r from-accent-purple/8 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-purple/15 border border-accent-purple/25 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-accent-purple" />
          </div>
          <p className="section-label">AI Distress Analysis</p>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple font-bold font-mono uppercase tracking-wider border border-accent-purple/25">
            GROQ LLM
          </span>
        </div>
        {distress && (
          <span
            className="text-[10px] font-bold font-heading uppercase px-2 py-0.5 rounded tracking-wider"
            style={{
              background: `${SEVERITY_COLOR[distress.severity] || '#64748b'}20`,
              color: SEVERITY_COLOR[distress.severity] || '#64748b',
              border: `1px solid ${SEVERITY_COLOR[distress.severity] || '#64748b'}40`
            }}
          >
            {distress.severity || 'High'} Severity
          </span>
        )}
      </div>

      <div className="p-4">
        {!distress && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/8 border border-accent-purple/15 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-accent-purple/40" />
            </div>
            <p className="text-sm text-ink-2 font-heading font-semibold">No Active Distress</p>
            <p className="text-[11px] text-ink-3 mt-1 max-w-[220px] mx-auto">
              When captains send distress signals, AI will extract structured intelligence here.
            </p>
          </div>
        )}

        {distress && (
          <div className="space-y-3">
            {/* Original message */}
            <div className="p-3 rounded-lg bg-bg-card/60 border border-bg-line">
              <p className="text-[10px] text-ink-3 uppercase font-heading font-semibold tracking-wider mb-1">
                Intercepted Signal
              </p>
              <p className="text-sm text-ink-1 italic leading-relaxed">"{distress.message || '—'}"</p>
              <p className="text-[10px] text-ink-3 mt-1.5 font-mono">
                — {distress.shipIds?.[0] || 'Unknown Vessel'}
              </p>
            </div>

            {/* AI Extracted data grid */}
            <div className="grid grid-cols-2 gap-2">
              <ExtractedField
                icon={Target}
                label="Category"
                value={distress.aiExtracted?.category || '—'}
                capitalize
              />
              <ExtractedField
                icon={Zap}
                label="Time Sensitive"
                value={distress.aiExtracted?.time_sensitive ? 'YES' : 'No'}
                highlight={distress.aiExtracted?.time_sensitive}
              />
              <ExtractedField
                label="Casualties"
                value={`${distress.aiExtracted?.casualties?.injured ?? 0} inj · ${distress.aiExtracted?.casualties?.deceased ?? 0} dec`}
              />
              <ExtractedField
                label="Est. Damage"
                value={
                  distress.aiExtracted?.damage_estimate_usd
                    ? `$${distress.aiExtracted.damage_estimate_usd.toLocaleString()}`
                    : '—'
                }
              />
            </div>

            {/* Suggested actions */}
            {distress.aiExtracted?.suggested_actions?.length > 0 && (
              <div className="p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/15">
                <p className="section-label mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent-cyan" />
                  AI Recommended Actions
                </p>
                <ul className="space-y-1.5">
                  {distress.aiExtracted.suggested_actions.map((a, i) => (
                    <li key={i} className="text-xs text-ink-1 flex items-start gap-2">
                      <span className="text-accent-cyan font-bold mt-0.5 shrink-0">›</span>
                      <span className="leading-relaxed">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pagination */}
            {distressAlerts.length > 1 && (
              <div className="flex items-center justify-between border-t border-bg-line pt-2">
                <button
                  onClick={() => setIdx(Math.max(0, safeIdx - 1))}
                  disabled={safeIdx === 0}
                  className="text-ink-3 hover:text-ink-1 disabled:opacity-20 p-1 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-ink-3 font-mono">
                  {safeIdx + 1} / {distressAlerts.length}
                </span>
                <button
                  onClick={() => setIdx(Math.min(distressAlerts.length - 1, safeIdx + 1))}
                  disabled={safeIdx === distressAlerts.length - 1}
                  className="text-ink-3 hover:text-ink-1 disabled:opacity-20 p-1 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractedField({ icon: Icon, label, value, capitalize, highlight }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-bg-card/50 border border-bg-line">
      <div className="flex items-center gap-1 mb-0.5">
        {Icon && <Icon className="w-3 h-3 text-ink-3" />}
        <span className="section-label text-[9px]">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${capitalize ? 'capitalize' : ''} ${highlight ? 'text-accent-red font-bold' : 'text-ink-1'}`}>
        {value}
      </span>
    </div>
  );
}
