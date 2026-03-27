import React from 'react';
import { Target, ShieldAlert, CheckCircle2, Clock3 } from 'lucide-react';

export default function IntelligencePanel({ state }) {
  const violations = state.intelligence.violations;

  return (
    <aside className="w-full border-t border-slate-800/80 bg-slate-950/60 p-4 lg:h-full lg:w-96 lg:border-l lg:border-t-0 lg:p-6">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          <Target className="h-4 w-4 text-violet-300" />
          Intelligence
        </div>
        <h2 className="text-sm uppercase tracking-[0.28em] text-slate-200">
          Violation Detection
        </h2>
      </div>

        <div className="flex flex-col gap-4">
          {violations.map((v) => {
            const isCritical = v.severity === 'CRITICAL';

            return (
              <article key={v.id} className="deck-card overflow-hidden">
                <header className={`flex items-center justify-between border-b px-4 py-3 ${isCritical ? 'border-rose-400/20' : 'border-amber-300/25'}`}>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-200">
                    <ShieldAlert className={`h-3.5 w-3.5 ${isCritical ? 'text-rose-300' : 'text-amber-200'}`} />
                    {v.type}
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${isCritical ? 'bg-rose-500 text-rose-50' : 'bg-amber-300 text-amber-950'}`}>
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

        <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-slate-500">
            <Target className="h-3.5 w-3.5 text-violet-300" />
            Ruleset
          </div>
          <div className="font-mono text-[11px] text-violet-200/90">{state.intelligence.ruleset}</div>
        </div>
      </div>
    </aside>
  );
}
