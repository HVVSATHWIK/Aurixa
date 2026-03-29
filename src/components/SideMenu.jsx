import React from 'react';
import {
  ActivitySquare,
  Film,
  Send,
  Target,
  Terminal,
  Workflow,
  X,
} from 'lucide-react';

const menuItems = [
  { id: 'overview', label: 'Overview', icon: ActivitySquare },
  { id: 'operations', label: 'Operations', icon: Send },
  { id: 'intelligence', label: 'Intelligence', icon: Target },
  { id: 'pipeline', label: 'Pipeline', icon: Workflow },
  { id: 'studio', label: 'Studio', icon: Film },
  { id: 'audit', label: 'Audit Trail', icon: Terminal },
];

function MenuContent({ activePage, onSelectPage, onClose, state }) {
  const provider = String(state?.intelligence?.provider || 'PENDING').toUpperCase();
  const providerClass =
    provider === 'GEMINI'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
      : provider === 'HEURISTIC'
        ? 'border-amber-300 bg-amber-100 text-amber-900'
        : 'border-slate-300 bg-slate-100 text-slate-700';

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="section-kicker mb-1">Navigation</div>
          <h2 className="headline-font text-xl text-slate-900">Workspace</h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 px-3 py-3">
        {menuItems.map((item) => {
          const isActive = item.id === activePage;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPage(item.id)}
              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                isActive
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-rose-700' : 'text-slate-500'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-auto border-t border-slate-200 p-3">
        <div className="deck-card space-y-2 p-3">
          <div className="section-kicker">Runtime</div>
          <div className="text-xs text-slate-600">{state?.system_status || 'Ready'}</div>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${providerClass}`}>
            {provider}
          </span>
          <div className="text-[11px] text-slate-500">Iteration {state?.iteration ?? 0}</div>
        </div>
      </div>
    </>
  );
}

export default function SideMenu({ activePage, onSelectPage, open, onClose, state }) {
  return (
    <>
      <div className={`fixed inset-0 z-[90] lg:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-slate-900/45 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-[#fffaf3] shadow-2xl transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <MenuContent
              activePage={activePage}
              onSelectPage={onSelectPage}
              onClose={onClose}
              state={state}
            />
          </div>
        </aside>
      </div>

      {open && (
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-[#fffaf3]/95 lg:flex lg:flex-col">
          <MenuContent activePage={activePage} onSelectPage={onSelectPage} state={state} />
        </aside>
      )}
    </>
  );
}
