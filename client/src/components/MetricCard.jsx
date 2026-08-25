import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, trend, badge }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-white" />}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-white tracking-tight">{value}</p>
        {trend && (
          <span className="text-xs font-medium text-white">{trend}</span>
        )}
      </div>

      {subtext && (
        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">{subtext}</p>
      )}
    </div>
  );
}
