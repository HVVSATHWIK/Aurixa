import React from 'react';
import {
  CheckCircle2,
  Clock3,
  Gauge,
  Languages,
  Link2,
  ListChecks,
  ShieldAlert,
  Tags,
  Target,
} from 'lucide-react';

export default function IntelligencePanel({ state }) {
  const intelligence = state.intelligence || {};
  const violations = intelligence.violations || [];
  const briefing = intelligence.briefing || [];
  const entities = intelligence.entities || [];
  const sentiment = String(intelligence.sentiment || 'NEUTRAL').toUpperCase();
  const hasGeneratedAt = Boolean(intelligence.generated_at);
  const hasSourceUrl = Boolean(intelligence.source_url);

  const sentimentChipClass =
    sentiment === 'POSITIVE'
      ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
      : sentiment === 'NEGATIVE'
        ? 'border-rose-300/30 bg-rose-500/10 text-rose-100'
        : 'border-amber-300/30 bg-amber-400/10 text-amber-100';

  return (
    <aside className="w-full border-t border-slate-800/80 bg-slate-950/60 p-4 lg:h-full lg:w-96 lg:border-l lg:border-t-0 lg:p-6">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            <Target className="h-4 w-4 text-violet-300" />
            Intelligence
          </div>
          <h2 className="text-sm uppercase tracking-[0.28em] text-slate-200">
            Live News Intelligence
          </h2>
        </div>

        <article className="deck-card p-4">
          <header className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <ListChecks className="h-3.5 w-3.5 text-cyan-300" />
            News Navigator Briefing
          </header>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-200">
            {(briefing.length ? briefing : ['Run analysis to generate live briefing bullets.']).map((line, index) => (
              <li key={`${line}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </article>

        <article className="deck-card p-4">
          <header className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <Tags className="h-3.5 w-3.5 text-violet-300" />
            Story Arc Tracker Entities
          </header>
          <div className="flex flex-wrap gap-2">
            {entities.length ? (
              entities.map((entity, index) => (
                <span
                  key={`${entity.name}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {entity.type}
                  <span className="text-violet-200/80">{entity.name}</span>
                </span>
              ))
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                Entities appear here after extraction.
              </div>
            )}
          </div>
        </article>

        <article className="deck-card p-4">
          <header className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <Languages className="h-3.5 w-3.5 text-emerald-300" />
            Vernacular Engine
          </header>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-100">
            <Gauge className="h-3.5 w-3.5 text-cyan-300" />
            <span className={`rounded-full border px-2 py-0.5 ${sentimentChipClass}`}>
              Sentiment {sentiment}
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm leading-relaxed text-emerald-100/90">
              <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-emerald-300">Hindi</div>
              {intelligence.hindi_summary || 'Hindi summary will appear after live analysis.'}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm leading-relaxed text-cyan-100/90">
              <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-cyan-300">Telugu</div>
              {intelligence.telugu_summary || 'Telugu summary will appear after live analysis.'}
            </div>
          </div>
        </article>

        <div className="flex flex-col gap-4">
          {(violations.length ? violations : [{
            id: 'v-none',
            type: 'NO ACTIVE VIOLATIONS',
            severity: 'LOW',
            description: 'No active risk flags at current confidence threshold.',
            resolution_status: 'CLEAR',
          }]).map((v) => {
            const isCritical = v.severity === 'CRITICAL';
            const isSyntheticClear = v.id === 'v-none';

            return (
              <article key={v.id} className="deck-card overflow-hidden">
                <header className={`flex items-center justify-between border-b px-4 py-3 ${
                  isSyntheticClear
                    ? 'border-emerald-400/30'
                    : isCritical
                      ? 'border-rose-400/20'
                      : 'border-amber-300/25'
                }`}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-200">
                    <ShieldAlert
                      className={`h-3.5 w-3.5 ${
                        isSyntheticClear
                          ? 'text-emerald-300'
                          : isCritical
                            ? 'text-rose-300'
                            : 'text-amber-200'
                      }`}
                    />
                    {v.type}
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                    isSyntheticClear
                      ? 'bg-emerald-400 text-emerald-950'
                      : isCritical
                        ? 'bg-rose-500 text-rose-50'
                        : 'bg-amber-300 text-amber-950'
                  }`}>
                    {v.severity}
                  </span>
                </header>

                <div className="flex flex-col gap-3 px-4 py-4 text-sm text-slate-300">
                  {isCritical ? (
                    <>
                      <div className="overflow-hidden rounded-lg border border-rose-400/20 bg-slate-950/70 font-mono text-xs">
                        <div className="border-b border-rose-400/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-200">Diff View</div>
                        <div className="space-y-2 px-3 py-3">
                          <div className="rounded border border-rose-400/20 bg-rose-400/10 px-2 py-1.5 text-rose-100">
                            <span className="mr-2 text-rose-300">-</span>
                            {v.original_text}
                          </div>
                          <div className="rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1.5 text-cyan-100">
                            <span className="mr-2 text-cyan-300">+</span>
                            {v.fixed_output}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 self-start rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-cyan-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {v.resolution_status}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="leading-relaxed text-slate-300">{v.description}</p>
                      <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-amber-200">
                        <Clock3 className="h-3.5 w-3.5" />
                        {v.resolution_status}
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-auto space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate-500">
            <Target className="h-3.5 w-3.5 text-violet-300" />
            Ruleset
          </div>
          <div className="font-mono text-[11px] text-violet-200/90">{intelligence.ruleset}</div>

          {hasSourceUrl && (
            <a
              href={intelligence.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
            >
              <Link2 className="h-3.5 w-3.5" />
              Open Source
            </a>
          )}

          {hasGeneratedAt && (
            <div className="text-[11px] text-slate-500">
              Generated at {new Date(intelligence.generated_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
