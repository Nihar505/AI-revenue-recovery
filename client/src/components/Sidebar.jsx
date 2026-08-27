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
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col border-r border-neutral-800 bg-black transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex items-center justify-between border-b border-neutral-800 p-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl border border-neutral-700 bg-neutral-900 p-[1.5px]">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg tracking-tight text-white">recover<span className="text-neutral-400">ai</span></span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">Payment Recovery</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close navigation" className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-white lg:hidden"><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 pt-5">
        <button
          onClick={onRunAgent}
          disabled={isAgentRunning}
          className={`w-full relative group overflow-hidden rounded-xl border border-neutral-700 font-medium transition-all duration-300 ${
            isAgentRunning
              ? 'opacity-80 cursor-wait bg-neutral-900 text-neutral-400'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
        >
          <span className="relative flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300">
            <Sparkles className={`w-4 h-4 ${isAgentRunning ? 'animate-spin' : ''}`} />
            <span>{isAgentRunning ? 'Recovery in progress' : 'Start recovery run'}</span>
          </span>
        </button>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-neutral-500">Automatically review and recover up to 15 failed payments.</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
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
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-white text-black rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      {user && (
        <div className="mx-3 mb-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
          <div className="flex items-center gap-2.5">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 rounded-full border border-neutral-700 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 ${user.avatar_url ? 'hidden' : ''}`}>
              <User className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <p className="truncate text-[10px] text-neutral-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="m-3 mt-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-neutral-500">Environment</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
            SANDBOX
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">Protection</span>
          <span className="flex items-center space-x-1 text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
            <span>ACTIVE</span>
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}
