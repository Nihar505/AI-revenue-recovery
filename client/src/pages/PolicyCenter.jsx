import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../context/AuthContext';

const ALL_ACTIONS = [
  { id: 'RETRY_PAYMENT',            label: 'Automatic payment retry',       desc: 'Re-attempt the charge via Razorpay test gateway.' },
  { id: 'SEND_REMINDER',            label: 'Send payment reminder',         desc: 'Email or SMS with a 1-click payment link.' },
  { id: 'OFFER_ALTERNATIVE_METHOD', label: 'Offer alternative method',      desc: 'Prompt to switch to UPI, netbanking, or wallet.' },
  { id: 'DO_NOTHING',               label: 'Intelligent non-action',        desc: 'Deliberately refrain to protect the customer relationship.' },
];

export function PolicyCenter() {
  const [policy, setPolicy] = useState({
    max_auto_retry_amount: 5000,
    max_retry_count: 2,
    require_approval_above: 10000,
    allowed_actions: ['RETRY_PAYMENT', 'SEND_REMINDER', 'OFFER_ALTERNATIVE_METHOD', 'DO_NOTHING'],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Simulator
  const [simAmount,  setSimAmount]  = useState(12500);
  const [simRetries, setSimRetries] = useState(1);
  const [simAction,  setSimAction]  = useState('RETRY_PAYMENT');

  useEffect(() => {
    authFetch('/api/policies').then(r => r.json()).then(d => { if (!d.error) setPolicy(d); });
  }, []);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch('/api/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      if (!res.ok) {
        let msg = 'Failed to save settings.';
        try { const errObj = await res.json(); if (errObj.error) msg = errObj.error; } catch (e) {}
        throw new Error(msg);
      }
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setPolicy(d); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save settings.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const toggleAction = id => {
    const cur = policy.allowed_actions || [];
    setPolicy({ ...policy, allowed_actions: cur.includes(id) ? cur.filter(a => a !== id) : [...cur, id] });
  };

  // Simulator verdict
  const verdict = (() => {
    const a = Number(simAmount), r = Number(simRetries);
    if (simAction === 'DO_NOTHING') return { ok: true, msg: 'DO_NOTHING is always safe.' };
    if (a > policy.require_approval_above) return { ok: false, msg: `Amount (₹${a.toLocaleString('en-IN')}) exceeds human-approval threshold (₹${policy.require_approval_above.toLocaleString('en-IN')}). Action forced to ESCALATE.` };
    if (!(policy.allowed_actions || []).includes(simAction)) return { ok: false, msg: `'${simAction}' is not in the allowed actions whitelist.` };
    if (simAction === 'RETRY_PAYMENT') {
      if (a > policy.max_auto_retry_amount) return { ok: false, msg: `Amount (₹${a.toLocaleString('en-IN')}) exceeds max auto-retry limit (₹${policy.max_auto_retry_amount.toLocaleString('en-IN')}).` };
      if (r >= policy.max_retry_count) return { ok: false, msg: `Retry count (${r}) already at maximum (${policy.max_retry_count}). Converted to reminder.` };
    }
    return { ok: true, msg: 'Action approved. All safety constraints met.' };
  })();

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 pb-10">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Merchant Policies</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">Your Rules</h1>
        <p className="mt-1 text-xs text-neutral-400">Configure safety thresholds, auto-retry limits, and approval boundaries for autonomous AI operations.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Policy form */}
        <form onSubmit={handleSave} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-7 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-white">Safety Limits & Thresholds</h2>
            <p className="mt-0.5 text-xs text-neutral-400">Strict boundaries enforced before any recovery action executes.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">Maximum amount to auto-retry (₹)</span>
              <input
                type="number"
                value={policy.max_auto_retry_amount}
                onChange={e => setPolicy({ ...policy, max_auto_retry_amount: Number(e.target.value) })}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              />
              <p className="text-[11px] text-neutral-500">Retries above this amount require alternative methods.</p>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">Maximum retry attempts</span>
              <input
                type="number"
                value={policy.max_retry_count}
                onChange={e => setPolicy({ ...policy, max_retry_count: Number(e.target.value) })}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              />
              <p className="text-[11px] text-neutral-500">Prevents repeated card decline penalties.</p>
            </label>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-neutral-300">Require human approval if amount exceeds (₹)</span>
              <input
                type="number"
                value={policy.require_approval_above}
                onChange={e => setPolicy({ ...policy, require_approval_above: Number(e.target.value) })}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              />
              <p className="text-[11px] text-neutral-500">High-value payments are escalated for merchant team review.</p>
            </label>
          </div>

          {/* Allowed actions */}
          <div className="space-y-3.5 border-t border-neutral-800/80 pt-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Permitted Recovery Strategies</h3>
              <p className="mt-0.5 text-xs text-neutral-400">Select which automated playbooks the AI agent pipeline is authorized to deploy.</p>
            </div>
            <div className="space-y-2.5">
              {ALL_ACTIONS.map(action => {
                const enabled = (policy.allowed_actions || []).includes(action.id);
                return (
                  <label
                    key={action.id}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-150 ${
                      enabled
                        ? 'border-neutral-700 bg-neutral-900/90 shadow-sm'
                        : 'border-neutral-850 bg-black/50 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleAction(action.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-700 bg-black text-white accent-white focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{action.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">{action.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between border-t border-neutral-800/80 pt-5">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
              </span>
            ) : error ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                <ShieldAlert className="h-4 w-4" /> {error}
              </span>
            ) : <div />}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Simulator */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-5 self-start shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-white">Rule Evaluation Simulator</h2>
            <p className="mt-0.5 text-xs text-neutral-400">Test any scenario against your configured policies in real-time.</p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">Transaction amount (₹)</span>
              <input
                type="number"
                value={simAmount}
                onChange={e => setSimAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">Previous retry count</span>
              <input
                type="number"
                value={simRetries}
                onChange={e => setSimRetries(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-neutral-300">Proposed recovery action</span>
              <select
                value={simAction}
                onChange={e => setSimAction(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-xs text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
              >
                <option value="RETRY_PAYMENT">Retry payment</option>
                <option value="SEND_REMINDER">Send reminder</option>
                <option value="OFFER_ALTERNATIVE_METHOD">Offer alternative</option>
                <option value="DO_NOTHING">Do nothing</option>
              </select>
            </label>
          </div>

          {/* Verdict */}
          <div className={`rounded-xl border p-4 transition ${verdict.ok ? 'border-neutral-800 bg-neutral-900/60' : 'border-red-900/50 bg-red-950/20'}`}>
            <div className="flex items-center gap-2">
              {verdict.ok ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-red-400" />
              )}
              <span className={`text-xs font-bold ${verdict.ok ? 'text-emerald-400' : 'text-red-300'}`}>
                {verdict.ok ? 'ALLOWED BY POLICY' : 'BLOCKED / ESCALATED'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-300">{verdict.msg}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
