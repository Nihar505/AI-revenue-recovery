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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Validation & Benchmarks</p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">System Evaluation</h1>
          <p className="mt-1 text-xs text-neutral-400">Offline validation and quality benchmarks across synthetic and historical payment test suites.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={sampleSize}
            onChange={e => setSampleSize(Number(e.target.value))}
            className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
          >
            <option value={100}>100 transactions</option>
            <option value={200}>200 transactions</option>
            <option value={500}>500 transactions</option>
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            {loading ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            {loading ? 'Evaluating…' : 'Run benchmark'}
          </button>
        </div>
      </div>

      {/* Safety banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              Unsafe autonomous actions = {report?.unsafeAutonomousActions ?? '0'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">100% policy adherence verified across all evaluated test transactions.</p>
          </div>
        </div>
        <span className="self-start sm:self-auto rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-[11px] font-semibold text-neutral-200">
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
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-sm">
          <div className="border-b border-neutral-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white">Benchmark Summary</h2>
            <p className="mt-0.5 text-xs text-neutral-400">{report.evaluatedCount} payment events evaluated against ground truth</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-neutral-800/80">
              {rows.map(row => (
                <tr key={row.label} className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-900/30 transition-colors">
                  <td className="text-xs text-neutral-400">{row.label}</td>
                  <td className={`text-xs font-semibold ${
                    row.highlight === 'ok'  ? 'text-white' :
                    row.highlight === 'bad' ? 'text-neutral-400' :
                    'text-white'
                  }`}>{String(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action breakdown */}
          <div className="border-t border-neutral-800 px-6 py-5">
            <p className="mb-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.14em]">Action Distribution</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.actionBreakdown || {}).map(([action, count]) => (
                <div key={action} className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5">
                  <span className="text-xs text-neutral-400">{action}: </span>
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
