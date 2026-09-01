import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2,
  CircleDollarSign, Clock3, Hand, HeartHandshake, MessageSquare,
  RotateCcw, ShieldCheck, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { MetricCard } from '../components/MetricCard';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export function Overview({ stats, isAgentRunning, onRunAgent, onOpenCaseModal, lastUpdated }) {
  const playbooks = [
    {
      id: 'case_demo_case1', icon: RotateCcw, eyebrow: 'Gentle Retry', title: 'Temporary bank issue',
      description: 'If it is just a small hiccup, we can safely try charging the card again.', outcome: 'Retry automatically',
    },
    {
      id: 'case_demo_case2', icon: MessageSquare, eyebrow: 'Friendly Reminder', title: 'Not enough money',
      description: 'Instead of failing the card repeatedly, we send the customer a nice email with a payment link.', outcome: 'Send a payment link',
    },
    {
      id: 'case_demo_case3', icon: HeartHandshake, eyebrow: 'Manual Check', title: 'Very large payment',
      description: 'For big amounts, we wait for you or your team to decide what to do.', outcome: 'Ask for your approval',
    },
    {
      id: 'case_demo_case4', icon: Hand, eyebrow: 'Give them a break', title: 'Risk of annoying customer',
      description: 'Sometimes doing nothing is the best way to keep a customer happy.', outcome: 'Do nothing',
    },
  ];

  const trendData = stats?.charts?.trend || [];

  const displayFailures = (stats?.charts?.byFailure || []).slice(0, 5).map((item) => ({
    fullName: item.failure_reason,
    name: item.failure_reason?.length > 20 ? `${item.failure_reason.slice(0, 18)}…` : item.failure_reason,
    value: item.amount,
  }));

  return (
    <div className="mx-auto max-w-[1540px] space-y-7 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-6 sm:px-8 sm:py-7">
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-white" /> Ready to protect revenue
            </div>
            <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl">Recover your lost sales automatically.</h2>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-neutral-400">We analyze your failed payments and execute the safest recovery action, without annoying your customers.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={onRunAgent}
                disabled={isAgentRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <Zap className={`h-3.5 w-3.5 ${isAgentRunning ? 'animate-spin' : 'fill-current'}`} /> {isAgentRunning ? 'Working on it...' : 'Review next 15 payments'}
              </button>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs font-semibold text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                View all failed payments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400">Account Protection</span>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <p className="mt-3 text-xl font-bold text-white">Always safe</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">Policy-bounded execution prevents aggressive card retries and customer friction.</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Protection active
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards Summary */}
      <section>
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Quick Summary</p>
            <h2 className="mt-1 text-base font-bold text-white sm:text-lg">Failed Payments Overview</h2>
          </div>
          {lastUpdated && <p className="text-xs text-neutral-500">Refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Lost Sales" value={formatCurrency(stats?.revenueAtRisk)} subtext="Total of all failed payments" icon={CircleDollarSign} />
          <MetricCard title="Expected Recovery" value={formatCurrency(Math.round(stats?.expectedRecovery || 0))} subtext="AI projected recoverable amount" icon={TrendingUp} />
          <MetricCard title="Money Recovered" value={formatCurrency(stats?.recoveredRevenue)} subtext="Total verified recoveries" icon={CheckCircle2} trend={stats?.recoveredRevenue ? 'Live total' : undefined} />
          <MetricCard title="Success Rate" value={`${stats?.recoveryRate || 0}%`} subtext="Percentage of opportunities recovered" icon={Activity} />
        </div>
      </section>

      {/* Batch prompt + Rules Callout */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Queue Status</p>
              <h2 className="mt-1 text-base font-bold text-white sm:text-lg">Run your next batch</h2>
              <p className="mt-1 text-xs text-neutral-400">Click the button above to start reviewing a batch of payments safely.</p>
            </div>
            <Clock3 className="h-4 w-4 shrink-0 text-neutral-400" />
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-neutral-800">
            <div className="pr-3">
              <p className="text-lg font-bold text-white">{Number(stats?.transactionsAnalyzed || 0).toLocaleString('en-IN')}</p>
              <p className="mt-0.5 text-[11px] text-neutral-400">payments watched</p>
            </div>
            <div className="px-3">
              <p className="text-lg font-bold text-white">{Number(stats?.recoveryOpportunities || 0).toLocaleString('en-IN')}</p>
              <p className="mt-0.5 text-[11px] text-neutral-400">opportunities found</p>
            </div>
            <div className="pl-3">
              <p className="text-lg font-bold text-emerald-400">0</p>
              <p className="mt-0.5 text-[11px] text-neutral-400">policy breaches</p>
            </div>
          </div>
        </div>

        <Link
          to="/policies"
          className="group rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 transition hover:border-neutral-700 hover:bg-neutral-900 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <ShieldCheck className="h-5 w-5 text-white" />
              <ArrowUpRight className="h-4 w-4 text-neutral-500 transition group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-4 text-sm font-bold text-white">Your rules are active</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">Configure retry limits and choose how you want AI to contact customers.</p>
          </div>
          <span className="mt-4 text-xs font-semibold text-white">Review your rules →</span>
        </Link>
      </section>

      {/* Playbooks */}
      <section>
        <div className="mb-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Autonomous Playbooks</p>
          <h2 className="mt-1 text-base font-bold text-white sm:text-lg">How RecoverAI handles each scenario</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {playbooks.map((playbook) => {
            const Icon = playbook.icon;
            return (
              <button
                key={playbook.id}
                onClick={() => onOpenCaseModal(playbook.id)}
                className="group rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 text-left transition hover:border-neutral-700 hover:bg-neutral-900 active:scale-[0.99] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-800 bg-black">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{playbook.eyebrow}</p>
                  <h3 className="mt-1 text-sm font-semibold text-white">{playbook.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{playbook.description}</p>
                </div>
                <p className="mt-4 border-t border-neutral-800/80 pt-3 text-[11px] font-bold text-neutral-300 group-hover:text-white">{playbook.outcome}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Analytics Charts */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">Money recovered over time</p>
              <p className="mt-0.5 text-xs text-neutral-400">Total verified amount recovered</p>
            </div>
            <TrendingUp className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="h-56">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -12, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="recovery-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#333333" strokeDasharray="3 4" vertical={false} opacity={0.45} />
                  <XAxis dataKey="date" stroke="#666666" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                  <Tooltip contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 8, color: '#fff' }} wrapperStyle={{ zIndex: 50 }} formatter={(value) => [formatCurrency(value), 'Recovered']} />
                  <Area type="monotone" dataKey="recovered" stroke="#ffffff" strokeWidth={2} fill="url(#recovery-area)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-xs text-neutral-400">No recovery data recorded yet</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">Recoveries will appear here as payments are processed</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">Why are payments failing?</p>
              <p className="mt-0.5 text-xs text-neutral-400">Total lost sales broken down by the reason</p>
            </div>
            <Activity className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="h-56">
            {displayFailures.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayFailures} layout="vertical" margin={{ left: 14, right: 4, top: 4 }}>
                  <CartesianGrid stroke="#333333" strokeDasharray="3 4" horizontal={false} opacity={0.4} />
                  <XAxis type="number" stroke="#666666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                  <YAxis dataKey="name" type="category" width={138} stroke="#999999" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 8, color: '#fff' }}
                    wrapperStyle={{ zIndex: 50 }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload && payload[0].payload.fullName) {
                        return payload[0].payload.fullName;
                      }
                      return label || 'Failure Reason';
                    }}
                    formatter={(value) => [formatCurrency(value), 'Amount At Risk']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{displayFailures.map((entry, index) => <Cell key={entry.name || index} fill={['#ffffff', '#cccccc', '#999999', '#666666', '#333333'][index % 5]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-xs text-neutral-400">No failed payments recorded</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">Breakdown of failure reasons will appear here</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
