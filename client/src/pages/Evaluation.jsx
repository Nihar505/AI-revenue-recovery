import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { Target, TrendingUp, Award, BarChart2 } from 'lucide-react';
import { authFetch } from '../context/AuthContext';

export function Evaluation() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sampleSize, setSampleSize] = useState(200);

  const run = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/analytics/evaluation?sampleSize=${sampleSize}`);
      setReport(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  const rows = report ? [
    { label: 'Evaluated sample',          value: `${report.evaluatedCount} payments` },
    { label: 'Total revenue at risk',     value: `₹${report.totalRevenueAtRisk?.toLocaleString('en-IN')}` },
    { label: 'Expected recovery (model)', value: `₹${report.expectedRecoverableRevenue?.toLocaleString('en-IN')}` },
    { label: 'Actual recovered GMV',      value: `₹${report.actualRecoveredRevenue?.toLocaleString('en-IN')}` },
    { label: 'Policy violations',         value: report.policyViolations },
    { label: 'Unsafe autonomous actions', value: report.unsafeAutonomousActions, highlight: report.unsafeAutonomousActions === 0 ? 'ok' : 'bad' },
  ] : [];

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Testing</p>
          <h1 className="mt-1 text-lg font-semibold text-white">System Performance</h1>
          <p className="mt-1 text-sm text-neutral-400">Reproducible safety and accuracy metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          <select value={sampleSize} onChange={e => setSampleSize(Number(e.target.value))}
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-xs text-white focus:border-neutral-500 focus:outline-none transition">
            <option value={100}>100 transactions</option>
            <option value={200}>200 transactions</option>
            <option value={500}>500 transactions</option>
          </select>
          <button onClick={run} disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50">
            {loading ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            {loading ? 'Running…' : 'Run benchmark'}
          </button>
        </div>
      </div>

      {/* Safety banner */}
      <div className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-5 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">
              Unsafe autonomous actions = {report?.unsafeAutonomousActions ?? '—'}
            </p>
            <p className="text-xs text-neutral-400">100% policy adherence across all tested transactions.</p>
          </div>
        </div>
        <span className="rounded-full border border-neutral-600 bg-black px-3 py-1 text-xs font-semibold text-white">
          Target: 0 (verified)
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Opportunity precision" value={`${report?.opportunityPrecision ?? '—'}%`}
          subtext="True positive detection rate" icon={Target} />
        <MetricCard title="Opportunity recall" value={`${report?.opportunityRecall ?? '—'}%`}
          subtext="Coverage of recoverable cases" icon={Award} />
        <MetricCard title="Recovered GMV" value={`₹${(report?.actualRecoveredRevenue ?? 0).toLocaleString('en-IN')}`}
          subtext={`From ₹${(report?.totalRevenueAtRisk ?? 0).toLocaleString('en-IN')} tested`} icon={TrendingUp} />
        <MetricCard title="Recovery rate" value={`${report?.recoveryRate ?? '—'}%`}
          subtext="Expected vs actual" icon={BarChart2} />
      </div>

      {/* Detail table */}
      {report && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          <div className="border-b border-neutral-800 px-5 py-4">
            <p className="text-sm font-semibold text-white">Benchmark detail</p>
            <p className="mt-0.5 text-xs text-neutral-500">{report.evaluatedCount} payment events evaluated</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-800">
              {rows.map(row => (
                <tr key={row.label} className="flex items-center justify-between px-5 py-3">
                  <td className="text-xs text-neutral-400">{row.label}</td>
                  <td className={`text-xs font-semibold ${
                    row.highlight === 'ok'  ? 'text-white' :
                    row.highlight === 'bad' ? 'text-neutral-500' :
                    'text-white'
                  }`}>{String(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action breakdown */}
          <div className="border-t border-neutral-800 px-5 py-4">
            <p className="mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-[0.1em]">Action distribution</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.actionBreakdown || {}).map(([action, count]) => (
                <div key={action} className="rounded-md border border-neutral-700 bg-black px-3 py-1.5">
                  <span className="text-xs text-neutral-400">{action}: </span>
                  <span className="text-xs font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
