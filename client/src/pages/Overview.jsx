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

  const trendData = stats?.charts?.trend?.length
    ? stats.charts.trend
    : [
        { date: 'Mon', recovered: 24000 }, { date: 'Tue', recovered: 42000 },
        { date: 'Wed', recovered: 68000 }, { date: 'Thu', recovered: 95000 },
        { date: 'Fri', recovered: 142000 }, { date: 'Sat', recovered: 189000 },
      ];

  const failureData = (stats?.charts?.byFailure || []).slice(0, 5).map((item) => ({
    name: item.failure_reason?.length > 20 ? `${item.failure_reason.slice(0, 18)}…` : item.failure_reason,
    value: item.amount,
  }));
  const displayFailures = failureData.length ? failureData : [
    { name: 'Network timeout', value: 450000 }, { name: 'Insufficient funds', value: 320000 }, { name: 'Issuer decline', value: 210000 },
  ];

  return (
    <div className="mx-auto max-w-[1540px] space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 px-6 py-7 sm:px-8 sm:py-9">
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
              <Sparkles className="h-3.5 w-3.5 text-white" /> We are ready to help
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Recover your lost sales automatically.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-[15px]">We analyze your failed payments and figure out the best way to get your money back, without annoying your customers.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={onRunAgent} disabled={isAgentRunning} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-500">
                <Zap className={`h-4 w-4 ${isAgentRunning ? 'animate-spin' : 'fill-current'}`} /> {isAgentRunning ? 'Working on it...' : 'Review next 15 payments'}
              </button>
              <Link to="/opportunities" className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-900 hover:text-white">View all failed payments <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-black p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500">Account Protection</span><ShieldCheck className="h-5 w-5 text-white" /></div>
            <p className="mt-4 text-2xl font-semibold text-white">Always safe</p>
            <p className="mt-1 text-xs leading-5 text-neutral-400">We always follow your rules. No emails or retries are sent without your permission.</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-white"><span className="h-2 w-2 rounded-full bg-white" /> Protection is active</div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Quick Summary</p><h2 className="mt-1 text-lg font-semibold text-white">Here is a look at your failed payments</h2></div>
          {lastUpdated && <p className="text-xs text-neutral-500">Last refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Lost Sales" value={formatCurrency(stats?.revenueAtRisk)} subtext="Total of all failed payments" icon={CircleDollarSign} />
          <MetricCard title="Expected Recovery" value={formatCurrency(Math.round(stats?.expectedRecovery || 0))} subtext="What we think we can get back" icon={TrendingUp} />
          <MetricCard title="Money Recovered" value={formatCurrency(stats?.recoveredRevenue)} subtext="Total successful recoveries" icon={CheckCircle2} trend={stats?.recoveredRevenue ? 'Live total' : undefined} />
          <MetricCard title="Success Rate" value={`${stats?.recoveryRate || 0}%`} subtext="Percentage of failed payments recovered" icon={Activity} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Ready to start?</p><h2 className="mt-1 text-lg font-semibold text-white">Run your first batch</h2><p className="mt-1 text-sm text-neutral-400">Click the button above to start reviewing a small batch of payments safely.</p></div><Clock3 className="h-5 w-5 shrink-0 text-white" /></div>
          <div className="mt-6 grid grid-cols-3 divide-x divide-neutral-800"><div className="pr-3"><p className="text-xl font-semibold text-white">{Number(stats?.transactionsAnalyzed || 6000).toLocaleString('en-IN')}</p><p className="mt-1 text-xs leading-4 text-neutral-500">payments watched</p></div><div className="px-3"><p className="text-xl font-semibold text-white">{Number(stats?.recoveryOpportunities || 0).toLocaleString('en-IN')}</p><p className="mt-1 text-xs leading-4 text-neutral-500">opportunities found</p></div><div className="pl-3"><p className="text-xl font-semibold text-white">0</p><p className="mt-1 text-xs leading-4 text-neutral-500">mistakes made</p></div></div>
        </div>
        <Link to="/policies" className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700 hover:bg-neutral-800 sm:p-6"><ShieldCheck className="h-5 w-5 text-white" /><p className="mt-5 text-sm font-semibold text-white">Your rules are active</p><p className="mt-1 text-sm leading-5 text-neutral-400">You are in control. Choose your limits and how you want us to reach out to customers.</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white">Review your rules <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></Link>
      </section>

      <section>
        <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">How it works</p><h2 className="mt-1 text-lg font-semibold text-white">See how we handle different situations</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {playbooks.map((playbook) => {
            const Icon = playbook.icon;
            return <button key={playbook.id} onClick={() => onOpenCaseModal(playbook.id)} className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left transition hover:border-neutral-600 text-neutral-300">
              <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-700 bg-black"><Icon className="h-[18px] w-[18px] text-white" /></div><ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 text-white" /></div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] opacity-75 text-neutral-500">{playbook.eyebrow}</p><h3 className="mt-1.5 text-base font-semibold text-white">{playbook.title}</h3><p className="mt-2 text-xs leading-5 text-neutral-400">{playbook.description}</p><p className="mt-5 border-t border-neutral-800 pt-3 text-xs font-semibold text-white">{playbook.outcome}</p>
            </button>;
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-semibold text-white">Money recovered over time</p><p className="mt-1 text-xs text-neutral-500">Total amount we have gotten back for you</p></div><TrendingUp className="h-4 w-4 text-white" /></div><div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: -12, right: 4, top: 8 }}><defs><linearGradient id="recovery-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} /><stop offset="100%" stopColor="#ffffff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#333333" strokeDasharray="3 4" vertical={false} opacity={0.45} /><XAxis dataKey="date" stroke="#666666" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="#666666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 12, color: '#fff' }} formatter={(value) => [formatCurrency(value), 'Recovered']} /><Area type="monotone" dataKey="recovered" stroke="#ffffff" strokeWidth={2.5} fill="url(#recovery-area)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-semibold text-white">Why are payments failing?</p><p className="mt-1 text-xs text-neutral-500">Total lost sales broken down by the reason</p></div><Activity className="h-4 w-4 text-white" /></div><div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={displayFailures} layout="vertical" margin={{ left: 14, right: 4, top: 4 }}><CartesianGrid stroke="#333333" strokeDasharray="3 4" horizontal={false} opacity={0.4} /><XAxis type="number" stroke="#666666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><YAxis dataKey="name" type="category" width={138} stroke="#999999" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 12, color: '#fff' }} formatter={(value) => [formatCurrency(value), 'At risk']} /><Bar dataKey="value" radius={[0, 7, 7, 0]}>{displayFailures.map((entry, index) => <Cell key={entry.name || index} fill={['#ffffff', '#cccccc', '#999999', '#666666', '#333333'][index % 5]} />)}</Bar></BarChart></ResponsiveContainer></div></div>
      </section>
    </div>
  );
}
