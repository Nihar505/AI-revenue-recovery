import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  X,
  LayoutDashboard, 
  Target, 
  Bot, 
  ShieldCheck, 
  BarChart3, 
  CheckCircle2,
  FileText,
  Sparkles,
  Zap,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ isAgentRunning, onRunAgent, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/opportunities', label: 'Failed Payments', icon: Target },
    { to: '/activity', label: 'Activity Log', icon: Bot, badge: isAgentRunning ? 'ACTIVE' : null },
    { to: '/policies', label: 'Your Rules', icon: ShieldCheck },
    { to: '/analytics', label: 'Reports', icon: BarChart3 },
    { to: '/audits', label: 'Audit Sheets', icon: FileText },
    { to: '/evaluation', label: 'System Tests', icon: CheckCircle2 },
  ];

  return (
    <>
      {isOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col border-r border-neutral-800/80 bg-black transition-transform duration-200 ease-out print:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-800/80 px-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-white">
              <Zap className="h-4 w-4 fill-current text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">
                recover<span className="text-neutral-400">ai</span>
              </span>
              <p className="text-[10px] text-neutral-500 font-medium leading-none mt-0.5">Payment Recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            onClick={onRunAgent}
            disabled={isAgentRunning}
            className={`w-full rounded-xl border border-neutral-700/80 font-medium transition-all duration-150 active:scale-[0.98] ${
              isAgentRunning
                ? 'cursor-wait bg-neutral-900 text-neutral-400 opacity-80'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            <span className="flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold tracking-tight">
              <Sparkles className={`h-3.5 w-3.5 ${isAgentRunning ? 'animate-spin' : ''}`} />
              <span>{isAgentRunning ? 'Recovery in progress' : 'Start recovery run'}</span>
            </span>
          </button>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-neutral-500">Automatically review and recover up to 15 failed payments.</p>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
          <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold border border-neutral-800/80 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-white text-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile */}
        {user && (
          <div className="mx-3 mb-2 rounded-xl border border-neutral-800/80 bg-neutral-900/70 p-3">
            <div className="flex items-center gap-2.5">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 shrink-0 rounded-full border border-neutral-700 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 ${user.avatar_url ? 'hidden' : ''}`}>
                <User className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                <p className="truncate text-[10px] text-neutral-400">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Environment status */}
        <div className="m-3 mt-0 rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[11px] text-neutral-400">Environment</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
              SANDBOX
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-neutral-400">Protection</span>
            <span className="flex items-center space-x-1.5 text-white font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
              <span>ACTIVE</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
