import React from 'react';
import { Menu, RefreshCw, Radio, ShieldCheck } from 'lucide-react';

export function Header({ isConnected, onRefresh, lastUpdated, onOpenNavigation }) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-neutral-800 bg-black/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">RecoverAI</p>
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">Get your lost money back, easily.</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white md:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-medium">Safety active</span>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-neutral-800 bg-black px-3 py-2 text-xs sm:flex">
          <Radio className={`h-3.5 w-3.5 ${isConnected ? 'text-white' : 'text-neutral-500'}`} />
          <span className="text-neutral-300">{isConnected ? 'Live' : 'Reconnecting'}</span>
        </div>
        {lastUpdated && <span className="hidden text-[11px] text-neutral-500 xl:block">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <button
          onClick={onRefresh}
          title="Refresh dashboard data"
          aria-label="Refresh dashboard data"
          className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
