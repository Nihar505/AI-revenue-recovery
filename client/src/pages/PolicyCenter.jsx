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
    const res = await authFetch('/api/policies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
    });
    const d = await res.json();
    if (!d.error) { setPolicy(d); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Settings</p>
        <h1 className="mt-1 text-lg font-semibold text-white">Your Rules</h1>
        <p className="mt-1 text-sm text-neutral-400">Tell us how you want to handle failed payments.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Policy form */}
        <form onSubmit={handleSave} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-6">
          <p className="text-sm font-semibold text-white">Limits</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Maximum amount to automatically retry (₹)</span>
              <input type="number" value={policy.max_auto_retry_amount}
                onChange={e => setPolicy({ ...policy, max_auto_retry_amount: Number(e.target.value) })}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition" />
              <p className="text-[11px] text-neutral-600">Retries above this are blocked.</p>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Maximum number of retries</span>
              <input type="number" value={policy.max_retry_count}
                onChange={e => setPolicy({ ...policy, max_retry_count: Number(e.target.value) })}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition" />
              <p className="text-[11px] text-neutral-600">Prevents card spam and decline penalties.</p>
            </label>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-neutral-400">Ask for my approval if the amount is above (₹)</span>
              <input type="number" value={policy.require_approval_above}
                onChange={e => setPolicy({ ...policy, require_approval_above: Number(e.target.value) })}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition" />
              <p className="text-[11px] text-neutral-600">Any amount above this is escalated to your team.</p>
            </label>
          </div>

          {/* Allowed actions */}
          <div className="space-y-3 border-t border-neutral-800 pt-6">
            <p className="text-xs font-medium text-neutral-400">What can the system do automatically?</p>
            {ALL_ACTIONS.map(action => {
              const enabled = (policy.allowed_actions || []).includes(action.id);
              return (
                <label key={action.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    enabled ? 'border-neutral-600 bg-neutral-800' : 'border-neutral-800 bg-black opacity-60'
                  }`}
                >
                  <input type="checkbox" checked={enabled} onChange={() => toggleAction(action.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-600 bg-black text-white accent-white focus:ring-0" />
                  <div>
                    <p className="text-xs font-semibold text-white">{action.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{action.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Save */}
          <div className="flex items-center justify-between border-t border-neutral-800 pt-5">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs text-white font-medium">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            ) : <div />}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Simulator */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 self-start">
          <div>
            <p className="text-sm font-semibold text-white">Test your rules</p>
            <p className="mt-1 text-xs text-neutral-500">Test any combination against your active rules.</p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Transaction amount (₹)</span>
              <input type="number" value={simAmount} onChange={e => setSimAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Previous retries</span>
              <input type="number" value={simRetries} onChange={e => setSimRetries(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Proposed action</span>
              <select value={simAction} onChange={e => setSimAction(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none transition">
                <option value="RETRY_PAYMENT">Retry payment</option>
                <option value="SEND_REMINDER">Send reminder</option>
                <option value="OFFER_ALTERNATIVE_METHOD">Offer alternative</option>
                <option value="DO_NOTHING">Do nothing</option>
              </select>
            </label>
          </div>

          {/* Verdict */}
          <div className={`rounded-lg border p-4 ${verdict.ok ? 'border-neutral-700 bg-black' : 'border-neutral-500 bg-neutral-800 text-white'}`}>
            <div className="flex items-center gap-2">
              {verdict.ok
                ? <ShieldCheck className="h-4 w-4 text-white" />
                : <ShieldAlert className="h-4 w-4 text-white" />}
              <span className={`text-xs font-semibold text-white`}>
                {verdict.ok ? 'APPROVED' : 'BLOCKED'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-400">{verdict.msg}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
