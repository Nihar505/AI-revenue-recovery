import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-neutral-800 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900">
            <Zap className="h-4 w-4 fill-white text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">recover<span className="text-neutral-400">ai</span></span>
        </div>

        <div className="space-y-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Razorpay AI Buildathon 2026</p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-white">
            Autonomous revenue<br />recovery — done right.
          </h1>
          <p className="max-w-sm text-sm leading-6 text-neutral-400">
            RecoverAI analyses every failed payment, picks the safest recovery action, and executes it — all within your rules.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Recovery Rate', value: '78%' },
            { label: 'Payments Watched', value: '6,000+' },
            { label: 'Unsafe Actions', value: '0' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900">
            <Zap className="h-3.5 w-3.5 fill-white text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">recover<span className="text-neutral-400">ai</span></span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-400">
              {mode === 'login'
                ? 'Sign in to your RecoverAI dashboard.'
                : 'Start recovering lost revenue in minutes.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-8 flex rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === m ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-400">Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nihar Mehta"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-neutral-600 focus:ring-0"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-neutral-600"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-400">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 pr-11 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3">
                <p className="text-xs text-white">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-6 text-center text-xs text-neutral-500">
              Default credentials:{' '}
              <button
                type="button"
                onClick={() => { setEmail('admin@recover.ai'); setPassword('password123'); }}
                className="font-mono text-neutral-300 underline decoration-neutral-700 hover:text-white transition"
              >
                admin@recover.ai / password123
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
