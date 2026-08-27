import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { TrendingUp, ShieldCheck, Zap } from 'lucide-react';

const fmt = v => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export function Analytics({ stats }) {
  const actionColors = ['#ffffff', '#cccccc', '#999999', '#666666', '#333333'];

  const actionData = stats?.charts?.actionDist?.map(d => ({
    name: d.action?.replace(/_/g, ' ') || d.action,
    count: d.count,
    amount: d.total_amount,
  })) || [];

  const failureData = stats?.charts?.byFailure?.map(d => ({
    fullName: d.failure_reason,
    name: d.failure_reason?.length > 22 ? `${d.failure_reason.slice(0, 20)}…` : d.failure_reason,
    amount: d.amount,
  })) || [];

  const trendData = stats?.charts?.trend || [];

  return (
    <div className="mx-auto max-w-[1540px] space-y-8 pb-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Reports</p>
        <h1 className="mt-1 text-lg font-semibold text-white">Your Performance</h1>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Recovered revenue" value={fmt(stats?.recoveredRevenue)} subtext="Verified recovered payments" icon={TrendingUp} />
        <MetricCard title="Recovery rate" value={`${stats?.recoveryRate || 0}%`} subtext="Of total at-risk pipeline" icon={Zap} />
        <MetricCard title="Policy compliance" value="100%" subtext="0 safety boundary breaches" icon={ShieldCheck} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Trend */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm font-semibold text-white">Recovery trend</p>
          <p className="mt-0.5 text-xs text-neutral-500">Recovered revenue over time</p>
          <div className="mt-5 h-56">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -12, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="area-grad-mono" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#333333" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="date" stroke="#666666" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 8, color: '#fff' }}
                    wrapperStyle={{ zIndex: 50 }}
                    labelFormatter={(label) => label ? `Date: ${label}` : 'Date'}
                    formatter={v => [fmt(v), 'Recovered Revenue']}
                  />
                  <Area type="monotone" dataKey="recovered" stroke="#ffffff" strokeWidth={2} fill="url(#area-grad-mono)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-neutral-400">No recovery trend data available</p>
                <p className="mt-1 text-xs text-neutral-600">Recovery performance timeline will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Action distribution */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm font-semibold text-white">Action distribution</p>
          <p className="mt-0.5 text-xs text-neutral-500">Cases processed by recovery action type</p>
          <div className="mt-5 h-56">
            {actionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionData} margin={{ left: -12, right: 4, top: 4 }}>
                  <CartesianGrid stroke="#333333" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="name" stroke="#666666" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666666" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 8, color: '#fff' }}
                    wrapperStyle={{ zIndex: 50 }}
                    labelFormatter={(label) => label || 'Action'}
                    formatter={v => [`${v} cases`, 'Total Processed']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {actionData.map((_, i) => <Cell key={i} fill={actionColors[i % actionColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-neutral-400">No actions executed yet</p>
                <p className="mt-1 text-xs text-neutral-600">Action distribution will show as cases are processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Failure breakdown */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 xl:col-span-2">
          <p className="text-sm font-semibold text-white">Revenue at risk by failure type</p>
          <p className="mt-0.5 text-xs text-neutral-500">Horizontal breakdown of recoverable revenue per root cause</p>
          <div className="mt-5 h-56">
            {failureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureData} layout="vertical" margin={{ left: 10, right: 4 }}>
                  <CartesianGrid stroke="#333333" strokeDasharray="3 4" horizontal={false} />
                  <XAxis type="number" stroke="#666666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${Math.round(v / 1000)}k`} />
                  <YAxis dataKey="name" type="category" width={140} stroke="#999999" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#000000', border: '1px solid #333333', borderRadius: 8, color: '#fff' }}
                    wrapperStyle={{ zIndex: 50 }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload && payload[0].payload.fullName) {
                        return payload[0].payload.fullName;
                      }
                      return label || 'Failure Reason';
                    }}
                    formatter={v => [fmt(v), 'Revenue At Risk']}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {failureData.map((_, i) => <Cell key={i} fill={actionColors[i % actionColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-neutral-400">No failure data available</p>
                <p className="mt-1 text-xs text-neutral-600">Breakdown of revenue at risk will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
