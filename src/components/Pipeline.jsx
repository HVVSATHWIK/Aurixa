import React from 'react';
import { ArrowRightToLine, PenTool, ShieldAlert, Edit3, CheckCircle2 } from 'lucide-react';

export default function Pipeline({ state }) {
  const p = state.pipeline;

  const nodes = [
    { id: 'INGESTION', label: 'INGESTION', icon: ArrowRightToLine, x: '8%', y: '54%', family: 'cyan' },
    { id: 'DRAFTING', label: 'DRAFTING', icon: PenTool, x: '28%', y: '34%', family: 'cyan' },
    { id: 'COMPLIANCE', label: 'COMPLIANCE', icon: ShieldAlert, x: '50%', y: '54%', family: 'violet' },
    { id: 'EDITOR', label: 'EDITOR', icon: Edit3, x: '72%', y: '72%', family: 'slate' },
    { id: 'APPROVAL', label: 'APPROVAL', icon: CheckCircle2, x: '92%', y: '50%', family: 'green' }
  ];

  const nodeTheme = {
    cyan: {
      shell: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
      icon: 'text-cyan-300',
      glow: 'shadow-[0_0_26px_rgba(34,211,238,0.22)]'
    },
    violet: {
      shell: 'border-violet-400/60 bg-violet-500/15 text-violet-100',
      icon: 'text-violet-200',
      glow: 'shadow-[0_0_34px_rgba(167,139,250,0.45)]'
    },
    slate: {
      shell: 'border-slate-700 bg-slate-900 text-slate-300',
      icon: 'text-slate-400',
      glow: ''
    },
    green: {
      shell: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200',
      icon: 'text-emerald-300',
      glow: 'shadow-[0_0_22px_rgba(34,197,94,0.25)]'
    }
  };

  return (
    <section className="relative flex h-[360px] w-full items-center justify-center overflow-hidden border-b border-slate-800/80 bg-slate-950 px-3 py-5 lg:h-full lg:flex-1 lg:border-b-0 lg:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_46%,rgba(59,130,246,0.15),transparent_45%),radial-gradient(circle_at_73%_70%,rgba(167,139,250,0.15),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-[2rem] border border-slate-800/60" />

      <div className="relative h-full w-full max-w-6xl">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 8 54 Q 19 42 28 34" fill="none" stroke="rgba(125,211,252,0.55)" strokeWidth="0.35" strokeDasharray="1.4 1.2" />
          <path d="M 28 34 Q 39 44 50 54" fill="none" stroke="rgba(148,163,184,0.55)" strokeWidth="0.35" strokeDasharray="1.4 1.2" />
          <path d="M 50 54 Q 61 66 72 72" fill="none" stroke="rgba(196,181,253,0.72)" strokeWidth="0.35" strokeDasharray="1.4 1.2" />
          <path d="M 72 72 Q 82 61 92 50" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="0.35" strokeDasharray="1.4 1.2" />

          <path d="M 50 54 Q 64 87 72 72" fill="none" stroke="rgba(192,132,252,0.9)" strokeWidth="0.32" strokeDasharray="1.2 1" />
          <path d="M 72 72 Q 63 45 50 54" fill="none" stroke="rgba(216,180,254,0.8)" strokeWidth="0.32" strokeDasharray="1.2 1" />
        </svg>

        {nodes.map((node) => {
          const isActive = p.active_node === node.id;
          const isCompleted = p.completed_nodes.includes(node.id);
          const theme = nodeTheme[node.family];

          let shell = 'border-slate-700 bg-slate-900 text-slate-300';
          let icon = 'text-slate-500';
          let glow = '';

          if (isCompleted || node.family === 'green') {
            shell = theme.shell;
            icon = theme.icon;
            glow = theme.glow;
          }

          if (isActive) {
            shell = nodeTheme.violet.shell;
            icon = nodeTheme.violet.icon;
            glow = nodeTheme.violet.glow;
          }

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{ left: node.x, top: node.y }}
            >
              {isActive && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-violet-300/50 bg-violet-500/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-violet-100 animate-pulse">
                  Active
                </div>
              )}

              <div className="flex flex-col items-center gap-2.5">
                <div
                  className={`flex items-center justify-center rounded-2xl border transition-all ${shell} ${glow} ${isActive ? 'h-20 w-20 animate-pulse' : 'h-14 w-14'}`}
                >
                  <node.icon className={`${isActive ? 'h-8 w-8' : 'h-6 w-6'} ${icon}`} />
                </div>
                <span className={`text-[10px] uppercase tracking-[0.22em] ${isActive ? 'text-violet-100' : 'text-slate-400'}`}>
                  {node.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
