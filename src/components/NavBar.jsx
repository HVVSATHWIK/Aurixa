import React from 'react';
import { Activity, RotateCcw, Box, Workflow, LogOut, UserCircle2 } from 'lucide-react';

export default function NavBar({ state, connection, user, onSignOut }) {
  const transport = connection?.transport || 'simulated';
  const isConnected = connection?.status === 'connected';
  const operatorName = user?.displayName || user?.email || 'Operator';

  return (
    <nav className="relative z-50 w-full border-b border-aurixa-border bg-slate-950/80 px-4 py-4 backdrop-blur-lg lg:px-6">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <Workflow className="h-5 w-5 text-cyan-300" />
            </div>
            <span className="text-xl font-semibold tracking-[0.35em] text-cyan-300">AURIXA</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 p-1 text-xs uppercase tracking-[0.22em] text-slate-400">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-cyan-300">Dashboard</span>
            <span className="px-3 py-1">Pipeline</span>
            <span className="px-3 py-1">Logs</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 lg:w-auto">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-4 lg:pr-6">
            <span
              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_14px_rgba(34,211,238,0.8)] ${isConnected ? 'bg-cyan-300 animate-pulse' : 'bg-amber-300'}`}
            />
            <Activity className="h-4 w-4 text-cyan-300" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">{state.system_status}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            <div className={`rounded-full border px-2 py-1 text-[10px] ${isConnected ? 'border-cyan-400/40 text-cyan-200' : 'border-amber-300/40 text-amber-200'}`}>
              {transport}
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <RotateCcw className="h-3.5 w-3.5 text-cyan-300" />
              Iteration {state.iteration}
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Box className="h-3.5 w-3.5 text-violet-300" />
              Retry {state.retry_count}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[10px] normal-case tracking-normal text-slate-200">
              <UserCircle2 className="h-3.5 w-3.5 text-cyan-200" />
              {operatorName}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
