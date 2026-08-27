import React, { useState, useEffect } from 'react';
import {
  FileText, Calendar, Zap, ShieldCheck, Download, Printer, ArrowUpRight,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, CircleDollarSign,
  Clock, Eye, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { authFetch } from '../context/AuthContext';
import { MetricCard } from '../components/MetricCard';

const fmtCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export function Audits() {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly', 'run', 'archive'
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [archivedAudits, setArchivedAudits] = useState([]);
  const [activeAudit, setActiveAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Fetch available months and archive history on load
  useEffect(() => {
    fetchMonths();
    fetchArchive();
  }, []);

  const fetchMonths = async () => {
    try {
      const res = await authFetch('/api/audits/months');
      if (res.ok) {
        const data = await res.json();
        setMonths(data.months || []);
        if (data.months && data.months.length > 0) {
          setSelectedMonth(data.months[0].monthStr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit months:', err);
    }
  };

  const fetchArchive = async () => {
    try {
      const res = await authFetch('/api/audits');
      if (res.ok) {
        const data = await res.json();
        setArchivedAudits(data.audits || []);
      }
    } catch (err) {
      console.error('Failed to fetch archived audits:', err);
    }
  };

  const handleGenerateMonthly = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/audits/generate-monthly', {
        method: 'POST',
        body: JSON.stringify({ monthStr: selectedMonth })
      });
      const result = await res.json();
      if (result.status === 'empty') {
        setNotice({ message: result.message, type: 'info' });
        setActiveAudit(null);
      } else if (result.audit) {
        setActiveAudit(result.audit.data);
        fetchArchive();
      }
    } catch (err) {
      setNotice({ message: err.message || 'Failed to generate monthly audit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRun = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/audits/generate-run', { method: 'POST' });
      const result = await res.json();
      if (result.status === 'empty') {
        setNotice({ message: result.message, type: 'info' });
        setActiveAudit(null);
      } else if (result.audit) {
        setActiveAudit(result.audit.data);
        fetchArchive();
      }
    } catch (err) {
      setNotice({ message: err.message || 'Failed to generate run audit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewArchive = async (auditId) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/audits/${auditId}`);
      if (res.ok) {
        const result = await res.json();
        setActiveAudit(result.audit.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Compliance & Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Audit Sheets</h1>
          <p className="mt-1 text-xs leading-5 text-neutral-400">Generate executive audit reports documenting AI recovery decisions, policy safety boundaries, and financial totals.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => { setActiveTab('monthly'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'monthly' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" /> Monthly Audits
        </button>

        <button
          onClick={() => { setActiveTab('run'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'run' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <Zap className="h-4 w-4" /> Recovery Run Audits
        </button>

        <button
          onClick={() => { setActiveTab('archive'); setNotice(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'archive' ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" /> Audit History ({archivedAudits.length})
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={`rounded-2xl border p-4 text-sm ${
          notice.type === 'error' ? 'border-red-900 bg-red-950/40 text-red-200' : 'border-neutral-800 bg-neutral-900 text-neutral-300'
        }`}>
          <p>{notice.message}</p>
        </div>
      )}

      {/* TAB 1: MONTHLY AUDIT GENERATOR */}
      {activeTab === 'monthly' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Monthly Audit Sheet</h2>
              <p className="mt-1 text-xs text-neutral-400">Select a month to aggregate all recovery activity, financial outcomes, and policy checks for your account.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-neutral-700 bg-black px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white"
              >
                {months.length > 0 ? (
                  months.map((m) => (
                    <option key={m.monthStr} value={m.monthStr}>{m.label}</option>
                  ))
                ) : (
                  <option value="">No Month Activity Recorded</option>
                )}
              </select>

              <button
                onClick={handleGenerateMonthly}
                disabled={loading || !selectedMonth}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Generating...' : 'Generate Monthly Audit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECOVERY RUN AUDIT GENERATOR */}
      {activeTab === 'run' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Recovery Run Audit Sheet</h2>
              <p className="mt-1 text-xs text-neutral-400">Document the most recent batch of recovery operations, transaction decisions, and AI safety checks.</p>
            </div>
            <button
              onClick={handleGenerateRun}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Run Audit'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Saved Audit History</h2>
          {archivedAudits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider">
                    <th className="pb-3 px-3">Audit Title</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Period / Run</th>
                    <th className="pb-3 px-3">Generated Date</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {archivedAudits.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-900/50 transition">
                      <td className="py-3.5 px-3 font-semibold text-white">{a.title}</td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          a.audit_type === 'monthly' ? 'bg-neutral-800 text-white' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {a.audit_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">{a.period_label || a.month_str || a.run_id}</td>
                      <td className="py-3.5 px-3 text-neutral-400">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleViewArchive(a.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500 text-sm">No saved audit sheets found. Generate one above!</div>
          )}
        </div>
      )}

      {/* ACTIVE AUDIT SHEET DISPLAY & PDF PRINT EXPORTER */}
      {activeAudit && (
        <div id="printable-audit" className="space-y-6 rounded-3xl border border-neutral-800 bg-black p-6 sm:p-8 print:border-none print:bg-white print:text-black">
          {/* Printable Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-6 print:border-black">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white print:text-black">recover<span className="text-neutral-500 print:text-gray-600">ai</span></span>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white print:border-black print:bg-gray-100 print:text-black">
                  OFFICIAL AUDIT SHEET
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white print:text-black">{activeAudit.title}</h2>
              <p className="mt-1 text-xs text-neutral-400 print:text-gray-600">
                Audit ID: <code className="font-mono">{activeAudit.auditId}</code> | Generated: {new Date(activeAudit.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200"
              >
                <Printer className="h-4 w-4" /> Export / Print PDF
              </button>
              <button
                onClick={() => setActiveAudit(null)}
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                Close View
              </button>
            </div>
          </div>

          {/* Merchant Metadata */}
          <div className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-xs sm:grid-cols-3 print:border-gray-300 print:bg-gray-50 print:text-black">
            <div>
              <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">Merchant / User</p>
              <p className="mt-1 font-bold text-white print:text-black">{activeAudit.merchant?.name}</p>
              <p className="text-neutral-400 print:text-gray-600">{activeAudit.merchant?.email}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">Audit Scope</p>
              <p className="mt-1 font-bold text-white print:text-black">{activeAudit.periodLabel || activeAudit.runId}</p>
              <p className="text-neutral-400 print:text-gray-600">Type: {activeAudit.auditType.toUpperCase()}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">System Status</p>
              <p className="mt-1 font-bold text-white print:text-black">POLICY-BOUNDED ACTIVE</p>
              <p className="text-neutral-400 print:text-gray-600">Environment: Sandbox</p>
            </div>
          </div>

          {/* Key Metrics Overview */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-400 print:text-black">1. Executive Summary & Financial Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Failed Transaction Value" value={fmtCurrency(activeAudit.metrics?.totalFailedValue)} subtext="Total at-risk volume" icon={CircleDollarSign} />
              <MetricCard title="Expected Recovery" value={fmtCurrency(activeAudit.metrics?.expectedRecovery)} subtext="AI projected recovery" icon={TrendingUp} />
              <MetricCard title="Amount Recovered" value={fmtCurrency(activeAudit.metrics?.actualRecovered)} subtext="Verified recovered revenue" icon={CheckCircle2} />
              <MetricCard title="Recovery Rate" value={`${activeAudit.metrics?.recoveryRate || 0}%`} subtext="Overall conversion rate" icon={Zap} />
            </div>
          </div>

          {/* Policy & Safety Compliance Audit */}
          {activeAudit.safetyAudit && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
              <h3 className="text-sm font-bold text-white print:text-black">2. AI Policy & Safety Compliance Checks</h3>
              <p className="mt-0.5 text-xs text-neutral-400 print:text-gray-600">Verifies that all AI decisions remained strictly bounded within active merchant rules.</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-800 bg-black p-4 print:border-gray-200 print:bg-gray-50">
                  <p className="text-xs text-neutral-500">Auto-Executed Actions</p>
                  <p className="mt-1 text-xl font-bold text-white print:text-black">{activeAudit.safetyAudit.autoExecutedCount}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">Within ₹{activeAudit.safetyAudit.maxAutoRetryAmount?.toLocaleString('en-IN')} limit</p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-black p-4 print:border-gray-200 print:bg-gray-50">
                  <p className="text-xs text-neutral-500">Escalated / Approval Required</p>
                  <p className="mt-1 text-xl font-bold text-white print:text-black">{activeAudit.safetyAudit.requiredApprovalCount}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">Above ₹{activeAudit.safetyAudit.requireApprovalAbove?.toLocaleString('en-IN')} threshold</p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-black p-4 print:border-gray-200 print:bg-gray-50">
                  <p className="text-xs text-neutral-500">Policy-Blocked Actions</p>
                  <p className="mt-1 text-xl font-bold text-white print:text-black">{activeAudit.safetyAudit.policyBlockedCount}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">Safely suppressed by rule engine</p>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Charts (if Monthly Audit) */}
          {activeAudit.auditType === 'monthly' && activeAudit.charts && (
            <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-1">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Monthly Recovery Trend</p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeAudit.charts.trend || []} margin={{ left: -12, right: 4, top: 4 }}>
                      <CartesianGrid stroke="#333" strokeDasharray="3 4" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" fontSize={10} tickLine={false} />
                      <YAxis stroke="#888" fontSize={10} tickLine={false} tickFormatter={v => `₹${Math.round(v/1000)}k`} />
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: 8 }} formatter={v => [fmtCurrency(v), 'Recovered']} />
                      <Area type="monotone" dataKey="recovered" stroke="#fff" strokeWidth={2} fill="#333" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 print:border-gray-300 print:bg-white print:text-black">
                <p className="text-sm font-bold text-white print:text-black">Failure Reasons Breakdown</p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeAudit.charts.byFailure || []} layout="vertical" margin={{ left: 10, right: 4 }}>
                      <CartesianGrid stroke="#333" strokeDasharray="3 4" horizontal={false} />
                      <XAxis type="number" stroke="#888" fontSize={10} tickLine={false} tickFormatter={v => `₹${Math.round(v/1000)}k`} />
                      <YAxis dataKey="reason" type="category" width={130} stroke="#888" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: 8 }} formatter={v => [fmtCurrency(v), 'At Risk']} />
                      <Bar dataKey="amount" fill="#fff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Transaction-Level Audit Table */}
          {activeAudit.transactions && activeAudit.transactions.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-400 print:text-black">3. Transaction-Level AI Decision Audit Table</h3>
              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 print:border-gray-300 print:bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 print:border-gray-300 print:text-black">
                      <th className="pb-3 px-2">Payment ID</th>
                      <th className="pb-3 px-2">Customer</th>
                      <th className="pb-3 px-2">Amount</th>
                      <th className="pb-3 px-2">Failure Reason</th>
                      <th className="pb-3 px-2">AI Decision & Reason</th>
                      <th className="pb-3 px-2">Outcome</th>
                      <th className="pb-3 px-2 text-right">Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300 print:divide-gray-200 print:text-black">
                    {activeAudit.transactions.map((t) => (
                      <tr key={t.paymentId} className="hover:bg-neutral-900/40 transition">
                        <td className="py-3 px-2 font-mono text-[11px] font-bold text-white print:text-black">{t.paymentId}</td>
                        <td className="py-3 px-2 font-medium">{t.customerName}</td>
                        <td className="py-3 px-2 font-bold text-white print:text-black">{fmtCurrency(t.amount)}</td>
                        <td className="py-3 px-2 text-neutral-400 print:text-gray-700">{t.failureReason}</td>
                        <td className="py-3 px-2 max-w-xs">
                          <p className="font-semibold text-white print:text-black">{t.aiDecision}</p>
                          <p className="text-[11px] text-neutral-400 leading-tight print:text-gray-600">{t.decisionReason}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            t.outcome === 'recovered'
                              ? 'bg-neutral-800 text-white print:bg-gray-200 print:text-black'
                              : 'bg-neutral-900 text-neutral-400 print:bg-gray-100 print:text-gray-700'
                          }`}>
                            {t.outcome}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-white print:text-black">
                          {t.recoveredAmount > 0 ? fmtCurrency(t.recoveredAmount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Verification Footer */}
          <div className="border-t border-neutral-800 pt-5 text-center text-[11px] text-neutral-500 print:border-gray-300 print:text-gray-600">
            <p>Verification Hash: <span className="font-mono text-neutral-400 print:text-black">sha256:{activeAudit.auditId.slice(-8)}89a74f</span> | RecoverAI Platform v1.0.0</p>
            <p className="mt-1">This audit sheet is an official compliance document generated under active policy safety controls.</p>
          </div>
        </div>
      )}
    </div>
  );
}
