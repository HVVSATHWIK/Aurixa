import React from 'react';
import {
  ArrowRightToLine,
  CheckCircle2,
  Edit3,
  PenTool,
  ShieldAlert,
} from 'lucide-react';

export default function Pipeline({ state }) {
  const p = state.pipeline || {};

  const nodes = [
    { id: 'INGESTION', label: 'Ingestion', icon: ArrowRightToLine },
    { id: 'DRAFTING', label: 'Drafting', icon: PenTool },
    { id: 'COMPLIANCE', label: 'Compliance', icon: ShieldAlert },
    { id: 'EDITOR', label: 'Editor', icon: Edit3 },
    { id: 'APPROVAL', label: 'Approval', icon: CheckCircle2 },
  ];

  const activeNode = p.active_node || 'INGESTION';
  const completedNodes = Array.isArray(p.completed_nodes) ? p.completed_nodes : [];
  const progressPercent = Math.min(
    100,
    Math.round((completedNodes.length / nodes.length) * 100)
  );

  return (
    <section className="mb-5 deck-card overflow-hidden p-4 md:p-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="section-kicker mb-1">Pipeline Status Rail</div>
          <h2 className="headline-font text-2xl text-slate-900">Live Editorial Progress</h2>
          <p className="mt-1 text-sm text-slate-600">
            The center stage now tracks every production step in real time with no dead space.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="clay-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
            Active: {activeNode}
          </span>
          <span className="clay-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
            Progress: {progressPercent}%
          </span>
        </div>
      </header>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-800 via-rose-600 to-amber-500 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-[720px] items-center gap-2">
          {nodes.map((node, index) => {
            const isCompleted = completedNodes.includes(node.id);
            const isActive = activeNode === node.id;

            return (
              <React.Fragment key={node.id}>
                <article
                  className={`relative w-36 rounded-2xl border p-3 transition-all ${
                    isActive
                      ? 'border-rose-600 bg-rose-50 shadow-[0_8px_18px_rgba(127,29,29,0.18)]'
                      : isCompleted
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
                    <node.icon
                      className={`h-4 w-4 ${
                        isActive
                          ? 'text-rose-700'
                          : isCompleted
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                      }`}
                    />
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {node.label}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {isActive ? 'Live Stage' : isCompleted ? 'Completed' : 'Pending'}
                  </div>
                </article>

                {index < nodes.length - 1 && (
                  <div className="h-1 w-10 rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
