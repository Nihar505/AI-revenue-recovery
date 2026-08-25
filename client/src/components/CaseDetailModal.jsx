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
      <div className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-none sm:rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{caseId}</p>
                {c?.status && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill[c.status] || statusPill.pending}`}>
                    {c.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{c?.payment_id || 'Loading…'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRun} disabled={running}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50">
              {running ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
              {running ? 'Running…' : 'Run pipeline'}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-neutral-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-white mr-3" />
            Loading case data…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-5 mt-4 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-neutral-800 border-b border-neutral-800">
              <div className="px-5 py-4">
                <p className="text-xs text-neutral-500">Amount</p>
                <p className="mt-1 text-lg font-semibold text-white">₹{Number(c?.amount || 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-neutral-500 uppercase">{c?.payment_method}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-neutral-500">Customer</p>
                <p className="mt-1 text-sm font-semibold text-white">{c?.customer_name}</p>
                <p className="text-xs text-neutral-500">LTV ₹{Number(c?.lifetime_value || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-neutral-500">Recovered</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  ₹{Number(outcome?.recovered_amount || c?.recovered_amount || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-neutral-500">{c?.recommended_action || 'Pending'}</p>
              </div>
            </div>

            {/* Failure reason */}
            {c?.failure_reason && (
              <div className="border-b border-neutral-800 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500 mb-1">Failure reason</p>
                <p className="text-sm text-neutral-300">{c.failure_reason}</p>
              </div>
            )}

            {/* Agent timeline */}
            <div className="px-5 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Decision timeline</p>

              {actions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
                  No agent runs recorded. Click <strong className="text-neutral-300">"Run pipeline"</strong> above to execute all 5 agents.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((act, i) => {
                    const isBlocked = act.policy_result === 'BLOCKED';
                    return (
                      <div key={act.id || i} className="flex gap-3">
                        {/* Line indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 shrink-0 rounded-full mt-1.5 bg-neutral-400`} />
                          {i < actions.length - 1 && <div className="w-px flex-1 bg-neutral-800 mt-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold text-white`}>{act.agent}</span>
                            {act.action && (
                              <span className="rounded bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">{act.action}</span>
                            )}
                            {act.policy_result && (
                              <span className={`flex items-center gap-1 text-[10px] font-semibold text-white`}>
                                {isBlocked ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                                {act.policy_result}
                              </span>
                            )}
                            <span className="ml-auto text-[11px] text-neutral-600">{new Date(act.created_at).toLocaleTimeString()}</span>
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
