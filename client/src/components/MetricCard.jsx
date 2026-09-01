import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, trend, badge }) {
  return (
    <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/70 p-5.5 backdrop-blur-sm transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/90 group">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{title}</span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 group-hover:text-white transition-colors">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight">{value}</p>
        {trend && (
          <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
            {trend}
          </span>
        )}
        {badge && (
          <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{subtext}</p>
      )}
    </div>
  );
}
