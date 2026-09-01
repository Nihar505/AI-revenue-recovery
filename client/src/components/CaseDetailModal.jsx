import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ShieldAlert, Play, RotateCcw } from 'lucide-react';
import { authFetch } from '../context/AuthContext';

export function CaseDetailModal({ caseId, onClose, onRunSingleCase }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/cases/${caseId}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await authFetch(`/api/run-recovery/case/${caseId}`, { method: 'POST' });
      if (!res.ok) {
        let msg = 'Failed to run recovery pipeline.';
        if (res.status === 409) msg = 'This case has already been processed or is no longer available for this action.';
        try { const errObj = await res.json(); if (errObj.error) msg = errObj.error; } catch (e) {}
        throw new Error(msg);
      }
      await load();
      onRunSingleCase?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while running the case.');
    } finally {
      setRunning(false);
    }
  };

  if (!caseId) return null;

  const c       = data?.case;
  const actions = data?.actions || [];
  const outcome = data?.outcome;

  const statusPill = {
    recovered: 'bg-white text-black',
    refrained:  'bg-neutral-800 text-white',
    escalated:  'bg-neutral-300 text-black',
    pending:    'bg-neutral-900 text-neutral-400 border border-neutral-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white font-mono">{caseId}</p>
                {c?.status && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill[c.status] || statusPill.pending}`}>
                    {c.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{c?.payment_id || 'Loading…'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              {running ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {running ? 'Running…' : 'Run pipeline'}
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-neutral-400 text-xs">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-white mr-3" />
            Loading case data…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-6 mt-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-300 flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                {error}
              </div>
            )}
            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-neutral-800 border-b border-neutral-800 bg-neutral-900/40">
              <div className="px-6 py-4">
                <p className="text-[11px] font-medium text-neutral-400">Amount</p>
                <p className="mt-1 text-base sm:text-lg font-bold text-white">₹{Number(c?.amount || 0).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mt-0.5">{c?.payment_method}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] font-medium text-neutral-400">Customer</p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-white truncate">{c?.customer_name}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">LTV ₹{Number(c?.lifetime_value || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] font-medium text-neutral-400">Recovered</p>
                <p className="mt-1 text-base sm:text-lg font-bold text-emerald-400">
                  ₹{Number(outcome?.recovered_amount || c?.recovered_amount || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{c?.recommended_action || 'Pending'}</p>
              </div>
            </div>

            {/* Failure reason */}
            {c?.failure_reason && (
              <div className="border-b border-neutral-800 px-6 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 mb-1">Failure reason</p>
                <p className="text-xs sm:text-sm text-neutral-200">{c.failure_reason}</p>
              </div>
            )}

            {/* Agent timeline */}
            <div className="px-6 py-5">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Decision timeline</p>

              {actions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center text-xs text-neutral-400">
                  No agent runs recorded. Click <strong className="text-white">"Run pipeline"</strong> above to execute all 5 agents.
                </div>
              ) : (
                <div className="space-y-4">
                  {actions.map((act, i) => {
                    const isBlocked = act.policy_result === 'BLOCKED';
                    return (
                      <div key={act.id || i} className="flex gap-3.5">
                        {/* Line indicator */}
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 shrink-0 rounded-full mt-1.5 bg-neutral-300" />
                          {i < actions.length - 1 && <div className="w-px flex-1 bg-neutral-800 mt-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{act.agent}</span>
                            {act.action && (
                              <span className="rounded-md bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">{act.action}</span>
                            )}
                            {act.policy_result && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-white">
                                {isBlocked ? <ShieldAlert className="h-3 w-3 text-red-400" /> : <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                                {act.policy_result}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-neutral-500">{new Date(act.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-neutral-400">{act.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
