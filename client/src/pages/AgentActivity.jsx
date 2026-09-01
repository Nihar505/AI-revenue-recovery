import React from 'react';
import { Bot, Play, Trash2, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

const AGENTS = [
  'ALL', 'Revenue Detective', 'Root Cause Analyst', 'Recovery Strategist',
  'Policy / Safety Engine', 'Execution Agent', 'Auditor',
];

export function AgentActivity({ events, onClearEvents, isAgentRunning, onRunAgent }) {
  const [filter, setFilter] = React.useState('ALL');

  const visible = filter === 'ALL' ? events : events.filter(e => e.agent === filter);

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">System Activity</p>
            <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-neutral-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">Activity Log</h1>
          <p className="mt-1 text-xs text-neutral-400">Real-time stream of agent decisions, policy evaluations, and recovery executions.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onClearEvents}
            aria-label="Clear event log"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-xs font-semibold text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
          <button
            onClick={onRunAgent}
            disabled={isAgentRunning}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <Play className={`h-3.5 w-3.5 ${isAgentRunning ? 'animate-spin' : 'fill-current'}`} />
            {isAgentRunning ? 'Running…' : 'Trigger run'}
          </button>
        </div>
      </div>

      {/* Agent filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {AGENTS.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
              filter === a
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Event feed */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-sm">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400 text-center px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/80">
              <Bot className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-white">No activity recorded yet</p>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm">Click 'Trigger run' above to execute the recovery agent pipeline on failed payments.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {visible.map((evt, i) => {
              const isBlocked = evt.status === 'BLOCKED';
              return (
                <div key={evt.id || i} className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-900/40 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                      {isBlocked ? (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                      ) : evt.agent?.includes('Policy') ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Activity className="h-3.5 w-3.5 text-neutral-300" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{evt.agent}</span>
                      {evt.status && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isBlocked
                            ? 'bg-red-950/40 text-red-300 border border-red-900/50'
                            : evt.status === 'APPROVED' || evt.status === 'SUCCESS' || evt.status === 'RECORDED'
                            ? 'bg-white text-black'
                            : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                        }`}>{evt.status}</span>
                      )}
                      {evt.amount && (
                        <span className="text-xs font-semibold text-neutral-300">₹{Number(evt.amount).toLocaleString('en-IN')}</span>
                      )}
                      <span className="ml-auto text-[10px] text-neutral-500">{evt.time}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">{evt.message}</p>
                    {evt.paymentId && (
                      <p className="mt-1 font-mono text-[10px] text-neutral-500">{evt.paymentId}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
