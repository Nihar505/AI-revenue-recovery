import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login, signup, getGoogleAuthUrl } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Google sign-in is currently unavailable.');
      setGoogleLoading(false);
    }
  };

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
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-xs text-neutral-400">
              {mode === 'login'
                ? 'Sign in to access your RecoverAI dashboard.'
                : 'Start recovering lost revenue in minutes.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-5 flex rounded-xl border border-neutral-800 bg-neutral-950 p-1">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition duration-150 ${
                  mode === m
                    ? 'bg-neutral-900 text-white shadow-sm border border-neutral-800'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800 hover:border-neutral-700 hover:text-white active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative bg-black px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              or continue with email
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-neutral-300">Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nihar Mehta"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-300">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-neutral-500 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-3.5 py-2.5">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-wait disabled:bg-neutral-800 disabled:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-5 text-center text-xs text-neutral-500">
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
