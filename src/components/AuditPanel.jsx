import React from 'react';
import { Terminal, Activity } from 'lucide-react';

export default function AuditPanel({ state }) {
  const logs = state.audit_trail;

  return (
    <section className="z-20 w-full border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          <Terminal className="h-4 w-4 text-cyan-300" />
          Audit Trail
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-cyan-200">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          Live Stream
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 py-4 lg:px-6">
        {logs.map((log, idx) => {
          let agentColor = 'text-slate-300';
          let borderHighlight = 'border-slate-800';

          if (log.agent.includes('COMPLIANCE')) {
            agentColor = 'text-violet-200';
            borderHighlight = 'border-violet-300/35 shadow-[0_0_22px_rgba(167,139,250,0.22)]';
          } else if (log.agent.includes('EDITOR') || log.agent.includes('DRAFTING')) {
            agentColor = 'text-cyan-200';
            borderHighlight = 'border-cyan-300/25';
          }

          return (
            <article
              key={idx}
              className={`deck-card min-h-28 w-72 shrink-0 border p-4 lg:w-80 ${borderHighlight}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">{log.timestamp}</span>
                <span className={`text-[10px] uppercase tracking-[0.16em] ${agentColor}`}>
                  {log.agent}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {log.message}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
