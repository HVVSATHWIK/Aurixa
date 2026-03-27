import React from 'react';
import { Cpu, ScanSearch, ActivitySquare, AlertTriangle } from 'lucide-react';

export default function TelemetryPanel({ state }) {
  const t = state.telemetry;
  const isProcessing = t.status.toLowerCase() === 'processing';

  return (
    <aside className="w-full border-b border-slate-800/80 bg-slate-950/60 p-4 lg:h-full lg:w-80 lg:border-b-0 lg:border-r lg:p-6">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          <Cpu className="h-4 w-4 text-cyan-300" />
          Live State
        </div>
        <h2 className="text-sm uppercase tracking-[0.28em] text-slate-200">
          Real-Time Engine Telemetry
        </h2>
      </div>

        <div className="deck-card p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ScanSearch className="h-3.5 w-3.5 text-cyan-300" />
            Raw Input
          </div>
          <p className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs leading-relaxed text-cyan-100/90">
            {t.raw_input}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="deck-card p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Draft Version</div>
            <div className="font-mono text-xl text-slate-100">{t.draft_version}</div>
          </div>

          <div className="deck-card flex flex-col p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Status</div>
            <div className={`mt-auto font-mono text-sm uppercase tracking-[0.12em] text-violet-300 ${isProcessing ? 'animate-pulse' : ''}`}>
              {t.status}
            </div>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-5">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <ActivitySquare className="h-4 w-4 text-cyan-300" />
              Confidence Score
            </div>
            <div className="font-mono text-sm text-cyan-300">{t.confidence_score}%</div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700" style={{ width: `${t.confidence_score}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <AlertTriangle className="h-4 w-4 text-fuchsia-300" />
              Risk Score
            </div>
            <div className="font-mono text-sm text-fuchsia-300">{t.risk_score}%</div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400 transition-all duration-700" style={{ width: `${t.risk_score}%` }} />
          </div>
        </div>
      </div>
      </div>
    </aside>
  );
}
