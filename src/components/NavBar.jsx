import React from 'react';
import { Activity, Box, LogOut, Menu, RotateCcw, UserCircle2 } from 'lucide-react';

export default function NavBar({
  state,
  connection,
  user,
  onSignOut,
  activePageLabel,
  onMenuToggle,
}) {
  const transport = connection?.transport || 'simulated';
  const isConnected = connection?.status === 'connected';
  const operatorName = user?.displayName || user?.email || 'Operator';

  return (
    <nav className="relative z-50 w-full px-3 pt-3 sm:px-4 md:px-6">
      <div className="glass-card rounded-[22px] border border-white/80 px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMenuToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/aurixa-mark.svg"
                alt="AURIXA"
                className="h-11 w-auto select-none"
                draggable="false"
              />

              <div>
                <div className="section-kicker mb-1">Enterprise Command Center</div>
                <h1 className="headline-font text-xl leading-none text-slate-900 md:text-2xl">
                  {activePageLabel || 'Overview'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="clay-chip inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Activity className="h-3.5 w-3.5 text-rose-700" />
              {isConnected ? 'Live' : 'Degraded'}
            </div>

            <div className="clay-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
              {transport}
            </div>

            <div className="clay-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
              <RotateCcw className="h-3.5 w-3.5 text-rose-700" />
              Iteration {state.iteration}
            </div>

            <div className="clay-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
              <Box className="h-3.5 w-3.5 text-amber-700" />
              Retry {state.retry_count}
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-700">
              <UserCircle2 className="h-3.5 w-3.5 text-rose-700" />
              {operatorName}
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="liquid-highlight inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">{state.system_status}</p>
      </div>
    </nav>
  );
}
