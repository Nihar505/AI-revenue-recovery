import React from 'react';
import { Menu, RefreshCw, Radio, ShieldCheck } from 'lucide-react';

export function Header({ isConnected, mode, onRefresh, lastUpdated, onOpenNavigation }) {
  const isRazorpay = mode === 'razorpay_test';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-800/80 bg-black/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">RecoverAI</p>
          <h1 className="truncate text-xs font-medium text-white sm:text-sm">Get your lost money back, easily.</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {mode && (
          <div className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs sm:flex ${
            isRazorpay
              ? 'border-sky-500/30 bg-sky-950/40 text-sky-400'
              : 'border-amber-500/30 bg-amber-950/40 text-amber-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isRazorpay ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold text-[10px] uppercase tracking-wider">
              {isRazorpay ? 'Razorpay Test' : 'Simulation'}
            </span>
          </div>
        )}

        <div className="hidden items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-200 md:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-300" />
          <span className="font-medium text-[11px]">Safety active</span>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-neutral-800/80 bg-neutral-950 px-2.5 py-1.5 text-xs sm:flex">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
          <span className="text-[11px] font-medium text-neutral-300">{isConnected ? 'Live' : 'Connecting'}</span>
        </div>
        {lastUpdated && <span className="hidden text-[11px] text-neutral-500 xl:block">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <button
          onClick={onRefresh}
          title="Refresh dashboard data"
          aria-label="Refresh dashboard data"
          className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
