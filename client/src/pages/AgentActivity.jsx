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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">System Activity</p>
            <span className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
            </span>
          </div>
          <h1 className="mt-1 text-lg font-semibold text-white">See what is happening right now</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClearEvents}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
          <button onClick={onRunAgent} disabled={isAgentRunning}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50">
            <Play className={`h-3.5 w-3.5 ${isAgentRunning ? 'animate-spin' : 'fill-current'}`} />
            {isAgentRunning ? 'Running…' : 'Trigger run'}
          </button>
        </div>
      </div>

      {/* Agent filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {AGENTS.map(a => (
          <button key={a} onClick={() => setFilter(a)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === a
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Event feed */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
            <Bot className="mb-3 h-8 w-8 text-neutral-700" />
            <p className="text-sm font-medium text-neutral-400">Nothing happening right now</p>
            <p className="mt-1 text-xs">Click 'Trigger run' above to see the system process failed payments live.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {visible.map((evt, i) => {
              const isBlocked = evt.status === 'BLOCKED';
              const agentColor = 'text-neutral-400';
              return (
                <div key={evt.id || i} className="flex items-start gap-4 px-5 py-4">
                  <div className={`mt-0.5 shrink-0 ${agentColor}`}>
                    {isBlocked ? <ShieldAlert className="h-4 w-4" /> :
                     evt.agent?.includes('Policy') ? <ShieldCheck className="h-4 w-4" /> :
                     <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold text-white`}>{evt.agent}</span>
                      {evt.status && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isBlocked
                            ? 'bg-neutral-800 text-white border border-neutral-600'
                            : evt.status === 'APPROVED' || evt.status === 'SUCCESS' || evt.status === 'RECORDED'
                            ? 'bg-white text-black'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>{evt.status}</span>
                      )}
                      {evt.amount && (
                        <span className="text-xs text-neutral-500">₹{Number(evt.amount).toLocaleString('en-IN')}</span>
                      )}
                      <span className="ml-auto text-[11px] text-neutral-600">{evt.time}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-neutral-400">{evt.message}</p>
                    {evt.paymentId && (
                      <p className="mt-1 font-mono text-[11px] text-neutral-600">{evt.paymentId}</p>
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
