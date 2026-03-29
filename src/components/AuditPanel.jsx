import React from 'react';
import { Activity, Gauge, Languages, Tags, Terminal } from 'lucide-react';

export default function AuditPanel({ state }) {
  const logs = state.audit_trail || [];
  const intelligence = state.intelligence || {};
  const entities = intelligence.entities || [];
  const sentiment = String(intelligence.sentiment || 'NEUTRAL').toUpperCase();

  return (
    <section className="z-20 w-full px-3 pb-3 sm:px-4 md:px-6">
      <div className="glass-card overflow-hidden rounded-[22px] border border-white/80">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:px-6">
          <div className="section-kicker inline-flex items-center gap-2 text-slate-600">
            <Terminal className="h-4 w-4 text-rose-700" />
          Audit Trail
          </div>
          <div className="clay-chip inline-flex items-center gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-800">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
          Live Stream
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 lg:grid-cols-3 lg:px-6">
          <article className="deck-card p-3">
            <div className="section-kicker mb-2 inline-flex items-center gap-2 text-slate-500">
              <Gauge className="h-3.5 w-3.5 text-rose-700" />
            Sentiment Signal
            </div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                sentiment === 'POSITIVE'
                  ? 'bg-emerald-600 text-emerald-50'
                  : sentiment === 'NEGATIVE'
                    ? 'bg-rose-600 text-rose-50'
                    : 'bg-amber-400 text-amber-950'
              }`}
            >
              {sentiment}
            </span>
          </article>

          <article className="deck-card p-3">
            <div className="section-kicker mb-2 inline-flex items-center gap-2 text-slate-500">
              <Tags className="h-3.5 w-3.5 text-amber-700" />
              Entity Payload
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entities.slice(0, 4).map((entity, index) => (
                <span
                  key={`${entity.name}-${index}`}
                  className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  {entity.name}
                </span>
              ))}
              {!entities.length && (
                <span className="text-xs text-slate-500">Entities pending</span>
              )}
            </div>
          </article>

          <article className="deck-card p-3">
            <div className="section-kicker mb-2 inline-flex items-center gap-2 text-slate-500">
              <Languages className="h-3.5 w-3.5 text-emerald-700" />
              Translation Payload
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-emerald-900">
              {intelligence.hindi_summary || 'Hindi summary pending'}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-amber-900">
              {intelligence.telugu_summary || 'Telugu summary pending'}
            </p>
          </article>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 py-4 lg:px-6">
          {logs.map((log, idx) => {
            let agentColor = 'text-slate-600';
            let borderHighlight = 'border-slate-200';

            if (log.agent.includes('COMPLIANCE')) {
              agentColor = 'text-amber-700';
              borderHighlight = 'border-amber-200 bg-amber-50';
            } else if (log.agent.includes('EDITOR') || log.agent.includes('DRAFTING')) {
              agentColor = 'text-rose-700';
              borderHighlight = 'border-rose-200 bg-rose-50';
            }

            return (
              <article
                key={idx}
                className={`deck-card min-h-28 w-72 shrink-0 border p-4 lg:w-80 ${borderHighlight}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{log.timestamp}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${agentColor}`}>
                    {log.agent}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">
                  {log.message}
                </p>
              </article>
            );
          })}
          </div>
      </div>
    </section>
  );
}
